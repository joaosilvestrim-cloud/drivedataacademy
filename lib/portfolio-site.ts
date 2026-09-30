import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LACUNA } from "@/lib/portfolio";
import { nomesDasCompetencias } from "@/lib/portfolio-competencias";
import { auditarSite } from "@/lib/portfolio-auditoria";
import { carreiraDoAluno } from "@/lib/portfolio-carreira";

/* Site de portfólio do aluno.

   A ideia: a Academy faz o trabalho pesado de organizar o que o aluno tem de
   verdade (projetos revisados, certificados verificáveis, perfil) e entrega
   isso como um prompt pronto. O aluno leva o prompt para a IA que preferir,
   recebe um site inteiro em HTML e cola de volta aqui. O site fica publicado
   em /portfolio/<slug>, com link público.

   A Academy não gera o site ela mesma de propósito. O aluno aprende a usar a
   IA como ferramenta de trabalho, escolhe a que quiser, e o custo de gerar
   um site inteiro não cai na nossa conta.

   O risco que manda no desenho: HTML escrito por outra pessoa, servido no
   nosso domínio. Sem isolamento, um script no site do aluno leria a sessão
   de quem visita e sequestraria a conta. Por isso o HTML nunca é servido
   direto: ele roda num iframe com sandbox e sem allow-same-origin, o que dá
   a ele uma origem opaca, sem acesso a cookie, localStorage nem a nada da
   Academy. A política de conteúdo abaixo é a segunda camada. */

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");

import { CORES_DE_DESTAQUE, ESTILOS, PERSONALIZACAO_PADRAO, type Estilo, type Personalizacao } from "@/lib/portfolio-site-html";
export { CSP_DO_SITE, ESTILOS, LIMITE_HTML, envelopar, limparHtmlColado, type Estilo } from "@/lib/portfolio-site-html";

export function slugDoNome(nome: string): string {
  const base = (nome || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .filter(Boolean)
    .slice(0, 3)
    .join("-");
  return base.length >= 3 ? base : `aluno-${Math.random().toString(36).slice(2, 8)}`;
}

export async function slugLivre(admin: SupabaseClient, desejado: string, userId: string): Promise<string> {
  for (let i = 1; i < 50; i++) {
    const tentativa = i === 1 ? desejado : `${desejado}-${i}`;
    const { data } = await admin.from("portfolio_sites").select("user_id").eq("slug", tentativa).maybeSingle();
    if (!data || data.user_id === userId) return tentativa;
  }
  return `${desejado}-${Date.now().toString(36)}`;
}



type Resultado = {
  prompt: string;
  /** Só os dados do aluno, sem as instruções do prompt. É a régua da conferência de números. */
  fatos: string;
  incluidos: number;
  foraPorLacuna: string[];
  foraPorPrivado: string[];
  certificados: number;
  /** Para a auditoria do site: o que tem que aparecer e o que pode aparecer. */
  titulos: string[];
  imagens: string[];
  linkUniverso: string;
};

const linha = (rotulo: string, valor?: string | null) => (valor && String(valor).trim() ? `${rotulo}: ${String(valor).trim()}\n` : "");

/* Monta o prompt a partir do que o aluno tem aqui, e só disso.

   O prompt carrega a mesma regra do organizador: nenhum fato novo. Projeto
   com lacuna ainda aberta fica de fora, porque mandar "[quanto tempo
   levava?]" para outra IA é pedir que ela invente a resposta. Projeto que o
   aluno marcou como só para a turma também fica de fora: o site é público. */
export async function montarPrompt(
  admin: SupabaseClient,
  userId: string,
  estilo: Estilo,
  personalizacao: Partial<Personalizacao> = {},
): Promise<Resultado> {
  const pers: Personalizacao = { ...PERSONALIZACAO_PADRAO, ...personalizacao };
  const [{ data: perfil }, { data: projetos }, { data: certs }, carreira] = await Promise.all([
    admin.from("profiles").select("full_name, headline, bio, skills, linkedin_url, avatar_url").eq("id", userId).maybeSingle(),
    admin
      .from("portfolio_projects")
      .select("id, titulo, resumo, problema, resultado, descricao, ferramentas, cover_url, link_url, repo_url, status, publico, destaque, updated_at, feito_em, competencias")
      .eq("user_id", userId)
      .order("destaque", { ascending: false })
      .order("updated_at", { ascending: false }),
    admin
      .from("certificates")
      .select("code, course_title, workload, kind, revoked, expires_at, created_at")
      .eq("user_id", userId)
      .eq("revoked", false)
      .order("created_at", { ascending: false }),
    // Trajetória, conquistas, recomendações aprovadas, objetivo e detalhes
    // dos projetos. Vazio enquanto a migration do universo não rodar.
    carreiraDoAluno(admin, userId, { soPublico: true }),
  ]);

  const foraPorLacuna: string[] = [];
  const foraPorPrivado: string[] = [];
  const validos = (projetos ?? []).filter((p: any) => {
    if (!p.titulo) return false;
    if (!p.publico) { foraPorPrivado.push(p.titulo); return false; }
    const texto = [p.titulo, p.resumo, p.problema, p.resultado, p.descricao].join(" ");
    if (LACUNA.test(texto)) { foraPorLacuna.push(p.titulo); return false; }
    return true;
  });

  const agora = Date.now();
  const certificados = (certs ?? []).filter((c: any) => !c.expires_at || new Date(c.expires_at).getTime() > agora);

  const nome = (perfil?.full_name || "").trim() || "o aluno";
  const skills = Array.isArray(perfil?.skills) ? perfil!.skills.join(", ") : (perfil?.skills as any) || "";
  const foto = /^https?:\/\//.test(perfil?.avatar_url || "") ? perfil!.avatar_url : "";

  const nomesComp = await nomesDasCompetencias();
  const mesAno = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

  /* Competências que cada projeto prova, com o trecho. Vêm da leitura feita
     ao salvar o projeto (lib/portfolio-competencias). São a matéria-prima da
     seção de competências do site: cada uma chega com a prova, e a IA
     externa não precisa adivinhar nada. */
  const provadasDe = (p: any): { nome: string; trecho: string }[] =>
    (Array.isArray(p.competencias?.itens) ? p.competencias.itens : [])
      .filter((c: any) => nomesComp[c.id])
      .map((c: any) => ({ nome: nomesComp[c.id], trecho: c.trecho }));

  let blocoProjetos = "";
  validos.forEach((p: any, i: number) => {
    const provadas = provadasDe(p);
    const d = carreira.detalhes[p.id];
    const recs = carreira.recomendacoes.filter((r) => r.project_id === p.id && r.texto && r.autor_nome);
    blocoProjetos +=
      `\n${i + 1}. ${p.titulo}\n` +
      linha("   Quando", p.feito_em ? mesAno(p.feito_em) : null) +
      linha("   Setor", d?.setor) +
      linha("   Papel", d?.papel) +
      linha("   Time", d?.time_tamanho ? `${d.time_tamanho} ${d.time_tamanho === 1 ? "pessoa" : "pessoas"}` : null) +
      linha("   Duração", d?.duracao_meses ? `${d.duracao_meses} ${d.duracao_meses === 1 ? "mês" : "meses"}` : null) +
      linha("   Resumo", p.resumo) +
      linha("   Problema", p.problema) +
      linha("   O que mudou", p.resultado) +
      linha("   Como foi feito", p.descricao) +
      linha("   Ferramentas", (p.ferramentas ?? []).join(", ")) +
      linha("   O que aprendeu", d?.aprendizado) +
      recs.map((r) => `   Recomendação de ${r.autor_nome}${r.autor_cargo ? `, ${r.autor_cargo}` : ""}: "${r.texto}"\n`).join("") +
      (provadas.length
        ? `   Competências que este projeto prova:\n${provadas.map((c) => `   - ${c.nome}: "${c.trecho}"`).join("\n")}\n`
        : "") +
      linha("   Imagem", p.cover_url) +
      linha("   Link do projeto", p.link_url) +
      linha("   Código", p.repo_url);
  });

  let blocoCerts = "";
  for (const c of certificados) {
    const horas = c.workload ? `, ${String(c.workload).replace(/h$/i, "")}h` : "";
    blocoCerts += `- ${c.course_title}${horas}. Verificação: ${SITE}/certificado/${c.code}\n`;
  }

  /* A carreira além dos projetos. Só o que o aluno escreveu (trajetória e
     conquistas) ou o que outra pessoa escreveu e confirmou por e-mail
     (recomendações aprovadas). */
  const mesAnoIso = (d: string) => mesAno(d.length === 7 ? `${d}-01` : d.slice(0, 10));
  const blocoTrajetoria = carreira.experiencias
    .filter((e) => e.inicio)
    .map((e) =>
      `- ${mesAnoIso(e.inicio!)} a ${e.fim ? mesAnoIso(e.fim) : "hoje"}: ${e.cargo}${e.organizacao ? `, ${e.organizacao}` : ""}${e.setor ? ` (${e.setor})` : ""}` +
      (e.descricao ? `\n  ${e.descricao}` : ""),
    )
    .join("\n");
  const blocoConquistas = carreira.conquistas
    .map((c) => `- ${c.titulo}${c.data ? `, ${mesAnoIso(c.data)}` : ""}${c.descricao ? `. ${c.descricao.replace(/[.\s]+$/, "")}` : ""}${c.link_prova ? `. Prova: ${c.link_prova}` : ""}`)
    .join("\n");
  const recsGerais = carreira.recomendacoes.filter((r) => !r.project_id && r.texto && r.autor_nome);
  const blocoRecomendacoes = recsGerais
    .map((r) => `- "${r.texto}" (${r.autor_nome}${r.autor_cargo ? `, ${r.autor_cargo}` : ""}${r.relacao ? `; ${r.relacao}` : ""})`)
    .join("\n");
  const temRecomendacao = carreira.recomendacoes.some((r) => r.texto && r.autor_nome);
  const objetivo = carreira.objetivo?.titulo || "";

  /* Números da carreira, contados pela plataforma.

     É a resposta ao "4h" e ao "100%" inventados: o layout de portfólio pede
     número, e quando não recebe nenhum a IA cria. Estes são contagens do que
     o aluno cadastrou, então são verdadeiros por construção, e dão ao layout
     o destaque numérico que ele quer. */
  const datas = validos.map((p: any) => p.feito_em).filter(Boolean).sort() as string[];
  const primeiroAno = datas.length ? Number(datas[0].slice(0, 4)) : null;
  const ultimoAno = datas.length ? Number(datas[datas.length - 1].slice(0, 4)) : null;
  const todasComp = new Set(validos.flatMap((p: any) => provadasDe(p).map((c) => c.nome)));
  const todasFerr = new Set(validos.flatMap((p: any) => p.ferramentas ?? []));
  const numeros = [
    validos.length ? `${validos.length} ${validos.length === 1 ? "projeto publicado" : "projetos publicados"}` : "",
    todasComp.size ? `${todasComp.size} ${todasComp.size === 1 ? "competência comprovada" : "competências comprovadas"} por projeto` : "",
    todasFerr.size ? `${todasFerr.size} ${todasFerr.size === 1 ? "ferramenta usada" : "ferramentas usadas"} nos projetos` : "",
    primeiroAno && ultimoAno && ultimoAno > primeiroAno ? `projetos de ${primeiroAno} a ${ultimoAno}` : "",
    certificados.length ? `${certificados.length} ${certificados.length === 1 ? "certificado verificável" : "certificados verificáveis"}` : "",
    (() => {
      const inicios = carreira.experiencias.map((e) => e.inicio).filter(Boolean).sort() as string[];
      return inicios.length ? `carreira desde ${inicios[0].slice(0, 4)}` : "";
    })(),
    carreira.experiencias.length > 1 ? `${carreira.experiencias.length} experiências profissionais` : "",
    carreira.conquistas.length ? `${carreira.conquistas.length} ${carreira.conquistas.length === 1 ? "conquista" : "conquistas"}` : "",
  ].filter(Boolean);

  /* Competências comprovadas, agrupadas: cada uma com os projetos que a
     provam. É a seção que transforma o site num mapa, e não numa lista. */
  const porCompetencia = new Map<string, { projeto: string; trecho: string }[]>();
  for (const p of validos as any[]) {
    for (const c of provadasDe(p)) {
      const lista = porCompetencia.get(c.nome) ?? [];
      lista.push({ projeto: p.titulo, trecho: c.trecho });
      porCompetencia.set(c.nome, lista);
    }
  }
  const blocoCompetencias = [...porCompetencia.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([nome, provas]) => `- ${nome}: ${provas.map((x) => `${x.projeto} ("${x.trecho}")`).join("; ")}`)
    .join("\n");

  /* Linha do tempo: os projetos com data, do mais antigo ao mais novo. É a
     mesma carreira que o Universo 4D anima; o site conta em texto. */
  const blocoLinhaDoTempo = (validos as any[])
    .filter((p) => p.feito_em)
    .sort((a, b) => String(a.feito_em).localeCompare(String(b.feito_em)))
    .map((p) => `- ${mesAno(p.feito_em)}: ${p.titulo}`)
    .join("\n");

  /* Brief criativo: a leitura que um diretor de criação faria da carreira,
     montada só com os fatos, sem IA. É o que tira o site do "currículo
     bonito": a IA externa recebe o fio condutor pronto (de onde a pessoa veio,
     por onde passou, o que se repete, qual é a prova mais forte) e conta uma
     história em vez de listar cargos. Cada linha só entra se o dado existe. */
  const trajetoriaOrdenada = carreira.experiencias.filter((e) => e.inicio).sort((a, b) => String(a.inicio).localeCompare(String(b.inicio)));
  const atuais = trajetoriaOrdenada.filter((e) => !e.fim);
  const primeira = trajetoriaOrdenada[0];
  const setores = [...new Set([
    ...(validos as any[]).map((p) => carreira.detalhes[p.id]?.setor).filter(Boolean),
    ...trajetoriaOrdenada.map((e) => e.setor).filter(Boolean),
  ] as string[])];
  const temas = [...porCompetencia.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 3);
  const ancora = [...(validos as any[])].sort(
    (a, b) => Number(!!(b.resultado || "").trim()) - Number(!!(a.resultado || "").trim()) || provadasDe(b).length - provadasDe(a).length,
  )[0];
  const comResultado = (validos as any[]).filter((p) => (p.resultado || "").trim()).map((p) => p.titulo);
  const contaFerr = new Map<string, number>();
  for (const p of validos as any[]) for (const f of p.ferramentas ?? []) contaFerr.set(f, (contaFerr.get(f) ?? 0) + 1);
  const recorrentes = [...contaFerr.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).map(([f, n]) => `${f} (${n} projetos)`);
  const linhasBrief = [
    primeira
      ? `- Arco da carreira: começou como ${primeira.cargo}${primeira.organizacao ? ` (${primeira.organizacao})` : ""} em ${String(primeira.inicio).slice(0, 4)}${
          atuais.length ? `; hoje atua como ${atuais.map((e) => `${e.cargo}${e.organizacao ? ` (${e.organizacao})` : ""}`).join("; ")}` : ""
        }.`
      : "",
    setores.length > 1 ? `- Setores atravessados: ${setores.join(", ")}.` : "",
    temas.length ? `- Temas que se repetem nos projetos: ${temas.map(([n, l]) => `${n} (${l.length} ${l.length === 1 ? "projeto" : "projetos"})`).join(", ")}.` : "",
    ancora ? `- Estudo de caso principal: ${ancora.titulo}${provadasDe(ancora).length ? `, que prova ${provadasDe(ancora).length} competências` : ""}.` : "",
    comResultado.length ? `- Projetos com resultado escrito, os mais fortes para destacar: ${comResultado.join("; ")}.` : "",
    recorrentes.length ? `- Como trabalha (ferramentas e métodos que voltam): ${recorrentes.join(", ")}.` : "",
  ].filter(Boolean);

  /* O link do Universo 4D. O site do aluno roda dentro da página pública, e o
     #universo no endereço abre a constelação por cima dele. O link precisa de
     target="_top" para sair do iframe; com "_blank" abriria outra aba. */
  const { data: siteAtual } = await admin.from("portfolio_sites").select("slug").eq("user_id", userId).maybeSingle();
  const slug = siteAtual?.slug || (await slugLivre(admin, slugDoNome(perfil?.full_name || ""), userId));
  const linkUniverso = `${SITE}/portfolio/${slug}#universo`;

  const estiloEscolhido = ESTILOS[estilo] ?? ESTILOS.surpresa;

  /* A personalização do aluno por cima do estilo. Só entra no prompt o que
     ele mudou; "auto" deixa a decisão com a direção de arte. */
  const corValida = /^#[0-9a-f]{6}$/i.test(pers.cor) && CORES_DE_DESTAQUE.some((c) => c.hex.toLowerCase() === pers.cor.toLowerCase());
  const nomeCor = CORES_DE_DESTAQUE.find((c) => c.hex.toLowerCase() === pers.cor.toLowerCase())?.nome;
  const linhasPersonalizacao = [
    corValida ? `- Cor de destaque escolhida: ${pers.cor} (${nomeCor}). Use no lugar do destaque do estilo, mantendo o resto da paleta.` : "",
    pers.tema === "escuro" ? "- Tema: escuro. Construa a paleta do estilo sobre fundo escuro, com contraste AA." : "",
    pers.tema === "claro" ? "- Tema: claro. Construa a paleta do estilo sobre fundo claro, com contraste AA." : "",
    pers.tema === "auto" ? "- Tema: siga o prefers-color-scheme do visitante, com uma versão clara e uma escura da mesma identidade." : "",
    pers.idioma === "en" ? "- Idioma: o site inteiro em inglês. Traduza os fatos fielmente, sem acrescentar nada; nomes de projetos podem ser traduzidos." : "",
    pers.idioma === "bilingue"
      ? "- Idioma: bilíngue. Português por padrão, com um botão PT/EN no menu que troca todos os textos e guarda a escolha em localStorage (com try/catch). A tradução é fiel, sem acrescentar nada."
      : "",
    pers.tom === "tecnico" ? "- Tom dos textos de interface (menus, títulos de seção, chamadas): técnico e preciso, vocabulário de dados." : "",
    pers.tom === "caloroso" ? "- Tom dos textos de interface (menus, títulos de seção, chamadas): próximo e acolhedor, em primeira pessoa." : "",
    pers.tom === "direto" ? "- Tom dos textos de interface (menus, títulos de seção, chamadas): direto, frases curtas." : "",
  ].filter(Boolean);

  /* O que o aluno não preencheu, dito com todas as letras.

     No primeiro teste de ponta a ponta a conta não tinha título nem texto de
     apresentação, e o site saiu com "Especialistas em Dados" e um parágrafo
     inteiro de apresentação. A regra geral "omita o que não existir" não
     bastou: a estrutura pedia uma abertura com título, e a IA preencheu. Dizer
     o campo pelo nome, e o que fazer no lugar dele, é o que segura. */
  const ausentes = [
    !perfil?.headline && "título profissional",
    !perfil?.bio && "texto de apresentação (sobre)",
    !skills && "lista de habilidades",
    !perfil?.linkedin_url && "LinkedIn",
    !foto && "foto",
  ].filter(Boolean) as string[];
  const blocoAusentes = ausentes.length
    ? `\nO aluno NÃO preencheu: ${ausentes.join(", ")}. Não escreva nada no lugar deles: nenhum cargo, slogan, frase de apresentação, link ou foto de exemplo. A falta desses campos é informação, não lacuna para você completar.\n`
    : "";
  const abertura = perfil?.headline
    ? "Abertura com o nome, o título profissional e o resumo do projeto principal."
    : "Abertura com o nome e o resumo do projeto principal, copiado como está. Sem cargo, sem slogan, sem frase de apresentação.";

  const secoes = [
    abertura + ` Na abertura, um botão de destaque "Explorar meu Universo 4D" apontando para ${linkUniverso} com target="_top".`,
    numeros.length ? "Números da carreira: os números reais listados acima, grandes, como indicadores." : "",
    perfil?.bio ? "Sobre, com o texto de apresentação." : "",
    "Projetos, a parte principal, como estudos de caso. O estudo de caso principal do brief vem primeiro e maior. Cada projeto em blocos: Contexto (data, setor, papel e duração quando houver), Desafio (o problema), O que fiz (como foi feito), Resultado (o que mudou) e Prova (as competências com o trecho entre aspas). Bloco sem fato não aparece.",
    recorrentes.length ? "Como eu trabalho: as ferramentas e métodos que voltam em vários projetos, cada um ligado aos projetos onde aparece." : "",
    blocoTrajetoria
      ? "Trajetória: os cargos e organizações em ordem de data, intercalados com os projetos, como uma linha do tempo única."
      : blocoLinhaDoTempo ? "Linha do tempo da carreira, com os projetos em ordem de data." : "",
    blocoConquistas ? "Conquistas, cada uma com a data e o link de prova quando houver." : "",
    temRecomendacao ? "Recomendações: o texto entre aspas exatamente como está, com o nome e o cargo de quem escreveu. Nunca resuma nem reescreva uma recomendação." : "",
    blocoCompetencias ? `Competências comprovadas: cada competência com os projetos que a provam e o trecho de evidência. Termine a seção com um link "Ver no Universo 4D" para ${linkUniverso} com target="_top".` : "",
    "Ferramentas que aparecem nos projetos.",
    blocoCerts ? "Certificados, cada um com o botão Verificar." : "",
    objetivo ? `Próximo passo: uma frase curta dizendo que ${nome} busca atuar como ${objetivo}.` : "",
    perfil?.linkedin_url ? "Contato pelo LinkedIn." : "",
  ].filter(Boolean);

  const prompt = `Você é um designer e desenvolvedor front-end premiado. Crie o site de portfólio profissional de ${nome}, que trabalha com dados.

# Entrega
Um único arquivo HTML completo, do <!doctype html> ao </html>, pronto para publicar. Responda só com o código, sem explicação antes ou depois.

# Regras técnicas obrigatórias
O site vai rodar num ambiente isolado e restrito. Se estas regras forem quebradas, ele não funciona:
- Todo o CSS e o JavaScript dentro do próprio arquivo, em <style> e <script>.
- Fontes só do Google Fonts. Bibliotecas, se precisar, só de cdnjs.cloudflare.com ou cdn.jsdelivr.net.
- Nada de formulário, fetch, chamada de API ou iframe. O site não consegue acessar a rede.
- Todo link externo com target="_blank" e rel="noopener". A única exceção são os links do Universo 4D, que usam target="_top".
- Imagens: use só as URLs listadas abaixo. Não invente imagem, não use banco de imagens, não embuta imagem em base64.
- Funcionar bem no celular, a partir de 360px de largura.
- Respeitar prefers-reduced-motion. O tema segue a seção de personalização abaixo.
- Navegação por âncoras entre as seções, com um menu que acompanha a rolagem.

# Conteúdo
Use exatamente estes fatos. Não invente número, empresa, cargo, cliente, depoimento nem resultado. Se um campo não existir, omita a parte correspondente em vez de preencher com texto de exemplo.

${linha("Nome", nome)}${linha("Título profissional", perfil?.headline)}${linha("Sobre", perfil?.bio)}${linha("Habilidades", skills)}${linha("LinkedIn", perfil?.linkedin_url)}${linha("Foto", foto)}${blocoAusentes}
${numeros.length ? `## Números reais da carreira\nContados pela plataforma a partir dos projetos. São os únicos números que podem aparecer como indicadores.\n${numeros.map((n) => `- ${n}`).join("\n")}\n` : ""}
## Projetos
${blocoProjetos || "\n(nenhum projeto pronto ainda: faça uma seção de projetos com a frase \"Projetos em breve\")\n"}
${blocoLinhaDoTempo ? `## Linha do tempo\n${blocoLinhaDoTempo}\n` : ""}
${blocoTrajetoria ? `## Trajetória profissional\nEscrita pelo próprio aluno. Use os cargos e organizações exatamente como estão.\n${blocoTrajetoria}\n` : ""}
${blocoConquistas ? `## Conquistas\n${blocoConquistas}\n` : ""}
${blocoRecomendacoes ? `## Recomendações\nEscritas por quem assina, com e-mail confirmado. Copie o texto exatamente.\n${blocoRecomendacoes}\n` : ""}
${objetivo ? `## Objetivo profissional\n${objetivo}\n` : ""}
${blocoCompetencias ? `## Competências comprovadas\nCada competência foi identificada no texto dos projetos e vem com o trecho que a prova.\n${blocoCompetencias}\n` : ""}
${blocoCerts ? `## Certificados verificáveis\nEmitidos pela DriveData Academy. Mostre cada um com um botão "Verificar" apontando para o link.\n${blocoCerts}` : ""}
## Universo 4D
A página onde o site será publicado tem uma constelação interativa das competências de ${nome}, que cresce ao longo da carreira. Link: ${linkUniverso}

${linhasBrief.length ? `# Brief criativo\nLeitura da carreira de ${nome}, feita pela Academy só com os fatos acima. Use como fio condutor do site.\n${linhasBrief.join("\n")}\n` : ""}
# Como contar a história
Este site não é uma cópia do LinkedIn. Quem visita quer entender em 5 segundos quem é ${nome}, que tipo de problema resolve e qual é a prova.
- Abra com uma tese de uma frase, montada só com os fatos do brief e do título profissional. Nenhum adjetivo ou conquista que não esteja nos fatos.
- Nada de lista de cargos com responsabilidades em tópicos. A trajetória é uma linha do tempo curta que mostra o arco; o protagonista são os projetos.
- Mostre evolução: use o arco da carreira e as datas para que a visita perceba de onde a pessoa veio e aonde chegou.
- Cada seção precisa ter um motivo para existir. Se um dado é fraco ou falta, a seção some, e o site fica mais curto e mais forte.

# Direção de arte: ${estiloEscolhido.nome}
${estiloEscolhido.direcao}

Isto não é um currículo, é a vitrine de alguém que resolve problemas com dados. Os números reais dos projetos são os protagonistas: dê a eles tamanho e destaque.
Nunca crie número, percentual, prazo ou métrica que não esteja escrito nos fatos acima, nem para completar um layout. Se o layout pede um número e o fato não tem, use os números reais da carreira ou troque o número por uma frase curta tirada do projeto.
Evite a cara de template gerado por IA: nada de gradiente roxo e azul, nada de emoji como ícone, nada de tudo centralizado, nada de adjetivo vazio como "apaixonado por dados".

# Personalização escolhida por ${nome}
${linhasPersonalizacao.join("\n")}
Os textos dos fatos (projetos, trajetória, recomendações) nunca mudam de sentido por causa do tom: o tom vale só para a interface.

# SEO e compartilhamento
- <title> com o nome e o título profissional${perfil?.headline ? "" : " (sem título profissional, só o nome e \"Portfólio\")"}.
- <meta name="description"> com uma frase tirada do texto de apresentação ou do resumo do projeto principal, sem inventar.
- Tags Open Graph (og:title, og:description, og:type=profile${foto ? ", og:image com a foto" : ""}) para o link ficar bonito no LinkedIn e no WhatsApp.
- Um bloco <script type="application/ld+json"> com schema.org Person: name${perfil?.headline ? ", jobTitle" : ""}${perfil?.linkedin_url ? ", sameAs com o LinkedIn" : ""} e url ${linkUniverso.replace("#universo", "")}.

# Padrão de qualidade
O site vai ser o cartão de visita profissional de ${nome}, aberto a partir do LinkedIn, quase sempre no celular. Trate como trabalho de agência:
- Tipografia: uma fonte de títulos com personalidade e uma de texto muito legível, ambas do Google Fonts. Títulos grandes no desktop (48 a 72px), texto de 16 a 18px com entrelinha 1.6, linhas de no máximo 70 caracteres.
- Contraste de texto no nível AA, no tema claro e no escuro.
- Conteúdo com largura máxima entre 1100 e 1200px, espaçamento generoso e consistente entre as seções.
- Hover e foco visíveis em todos os links e botões.
- Animações discretas de entrada, sem esconder conteúdo se o JavaScript falhar.
- Nada de formulário de contato: o contato é pelo LinkedIn.

# Estrutura
${secoes.map((t, i) => `${i + 1}. ${t}`).join("\n")}
No rodapé, em letra pequena: "Portfólio publicado na DriveData Academy".

# Antes de responder, confira
- O arquivo está completo, do <!doctype html> ao </html>. Nada de "...", "restante do código" ou "igual ao anterior". Se estiver ficando longo, enxugue o CSS; nunca corte conteúdo.
- Os ${validos.length} projetos aparecem, cada um com o título exato.
- Não há texto de exemplo, como "Seu nome", "Lorem ipsum" ou e-mail de exemplo.
- Não há número, imagem, empresa ou resultado que não esteja nos fatos acima.
- Tem <meta name="viewport"> e o layout funciona a partir de 360px de largura.`;

  /* Os fatos, separados das instruções. O prompt tem números próprios (a
     numeração da estrutura, os 360px da regra de celular), e usar o prompt
     inteiro como régua deixava passar "4h" só porque existe um "4." na lista
     de seções. Os números da carreira entram: são fatos contados. */
  const fatos = [nome, perfil?.headline, perfil?.bio, skills, blocoProjetos, blocoCerts, numeros.join("\n"), blocoLinhaDoTempo, blocoTrajetoria, blocoConquistas, blocoRecomendacoes, objetivo]
    .filter(Boolean)
    .join("\n");

  return {
    prompt,
    fatos,
    incluidos: validos.length,
    foraPorLacuna,
    foraPorPrivado,
    certificados: certificados.length,
    titulos: validos.map((p: any) => p.titulo),
    imagens: [foto, ...validos.map((p: any) => p.cover_url)].filter(Boolean) as string[],
    linkUniverso,
  };
}

/* Conferência de número inventado no site que a IA devolveu.

   O prompt proíbe, e mesmo assim no teste de ponta a ponta o estilo "Painel
   de dados" criou "Tempo economizado 4h" e "100% mobile ready" para um
   projeto sem número nenhum: o layout pedia KPI e a IA preencheu. Nenhuma
   instrução segura isso em todas as IAs que o aluno pode usar.

   Então a plataforma confere: todo número com cara de resultado (com %, h,
   x, dias, R$, mil) no texto visível do site precisa existir nos fatos do
   aluno. Número solto sem unidade fica de fora, porque é quase sempre
   numeração de seção ("01", "02") e daria alarme falso.

   Não bloqueia a publicação. Avisa, e o aluno decide: pode ser um número que
   ele sabe e não pôs no projeto. Mas aí o certo é pôr no projeto primeiro. */
export async function numerosSemOrigem(admin: SupabaseClient, userId: string, html: string): Promise<string[]> {
  const { fatos: texto } = await montarPrompt(admin, userId, "surpresa");
  return numerosForaDosFatos(texto, html);
}

function numerosForaDosFatos(texto: string, html: string): string[] {
  const fatos = new Set((texto.match(/\d+(?:[.,]\d+)?/g) || []).map((n) => n.replace(",", ".")));

  const visivel = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");

  const alegacao = /(R\$\s?)?(\d+(?:[.,]\d+)?)\s?(%|(?:horas?|minutos|min|dias?|semanas?|meses|mil|mi|k|x|h)\b)/gi;
  const achados = new Set<string>();
  for (const m of visivel.matchAll(alegacao)) {
    const valor = m[2].replace(",", ".");
    if (!fatos.has(valor)) achados.add(m[0].trim());
  }
  return [...achados].slice(0, 12);
}

/* A auditoria completa do site colado, com o que a plataforma sabe do aluno:
   os projetos que têm que aparecer, as imagens que são dele e os números que
   ele de fato tem. Uma consulta só, para a pré-visualização e para o botão
   de publicar usarem a mesma régua. */
export async function auditarSiteDoAluno(admin: SupabaseClient, userId: string, html: string) {
  const r = await montarPrompt(admin, userId, "surpresa");
  return auditarSite(html, {
    titulosDosProjetos: r.titulos,
    imagensPermitidas: r.imagens,
    numerosSemOrigem: numerosForaDosFatos(r.fatos, html),
    linkUniverso: r.linkUniverso,
  });
}

/* O texto do post do LinkedIn, pronto para colar.

   Mesma regra do resto: só contagem do que o aluno publicou. Quantos
   projetos, de que ano a que ano, e as competências que mais aparecem
   comprovadas. Nenhum adjetivo sobre a pessoa, nenhum resultado que ela não
   escreveu. O link vai no texto porque é dele que o LinkedIn monta o cartão
   com a constelação. */
export async function textoDoPostLinkedIn(admin: SupabaseClient, userId: string, url: string): Promise<string> {
  const [{ data: projetos }, nomes] = await Promise.all([
    admin.from("portfolio_projects").select("titulo, resumo, problema, resultado, descricao, publico, feito_em, competencias").eq("user_id", userId),
    nomesDasCompetencias(),
  ]);
  const validos = (projetos ?? []).filter(
    (p: any) => p.titulo && p.publico && !LACUNA.test([p.titulo, p.resumo, p.problema, p.resultado, p.descricao].join(" ")),
  );
  const contagem = new Map<string, number>();
  for (const p of validos as any[]) {
    for (const c of p.competencias?.itens ?? []) if (nomes[c.id]) contagem.set(nomes[c.id], (contagem.get(nomes[c.id]) ?? 0) + 1);
  }
  const principais = [...contagem.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n);
  const anos = (validos as any[]).map((p) => p.feito_em?.slice(0, 4)).filter(Boolean).sort();
  const periodo = anos.length && anos[0] !== anos[anos.length - 1] ? `, de ${anos[0]} a ${anos[anos.length - 1]}` : "";
  const n = validos.length;

  const linhas = [
    "Publiquei meu portfólio na DriveData Academy.",
    "",
    n
      ? `São ${n} ${n === 1 ? "projeto" : "projetos"}${periodo}${principais.length ? `, e as competências que eles comprovam: ${principais.join(", ")}` : ""}.`
      : "",
    "",
    "Cada competência vem com o trecho do projeto que a prova. E dá para ver a minha carreira crescer num universo 4D interativo.",
    "",
    url,
    "",
    "#portfolio #dados #DriveDataAcademy",
  ];
  return linhas.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
