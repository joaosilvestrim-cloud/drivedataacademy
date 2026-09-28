import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LACUNA } from "@/lib/portfolio";

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

import { ESTILOS, type Estilo } from "@/lib/portfolio-site-html";
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
  incluidos: number;
  foraPorLacuna: string[];
  foraPorPrivado: string[];
  certificados: number;
};

const linha = (rotulo: string, valor?: string | null) => (valor && String(valor).trim() ? `${rotulo}: ${String(valor).trim()}\n` : "");

/* Monta o prompt a partir do que o aluno tem aqui, e só disso.

   O prompt carrega a mesma regra do organizador: nenhum fato novo. Projeto
   com lacuna ainda aberta fica de fora, porque mandar "[quanto tempo
   levava?]" para outra IA é pedir que ela invente a resposta. Projeto que o
   aluno marcou como só para a turma também fica de fora: o site é público. */
export async function montarPrompt(admin: SupabaseClient, userId: string, estilo: Estilo): Promise<Resultado> {
  const [{ data: perfil }, { data: projetos }, { data: certs }] = await Promise.all([
    admin.from("profiles").select("full_name, headline, bio, skills, linkedin_url, avatar_url").eq("id", userId).maybeSingle(),
    admin
      .from("portfolio_projects")
      .select("titulo, resumo, problema, resultado, descricao, ferramentas, cover_url, link_url, repo_url, status, publico, destaque, updated_at")
      .eq("user_id", userId)
      .order("destaque", { ascending: false })
      .order("updated_at", { ascending: false }),
    admin
      .from("certificates")
      .select("code, course_title, workload, kind, revoked, expires_at, created_at")
      .eq("user_id", userId)
      .eq("revoked", false)
      .order("created_at", { ascending: false }),
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

  let blocoProjetos = "";
  validos.forEach((p: any, i: number) => {
    blocoProjetos +=
      `\n${i + 1}. ${p.titulo}\n` +
      linha("   Resumo", p.resumo) +
      linha("   Problema", p.problema) +
      linha("   O que mudou", p.resultado) +
      linha("   Como foi feito", p.descricao) +
      linha("   Ferramentas", (p.ferramentas ?? []).join(", ")) +
      linha("   Imagem", p.cover_url) +
      linha("   Link do projeto", p.link_url) +
      linha("   Código", p.repo_url);
  });

  let blocoCerts = "";
  for (const c of certificados) {
    const horas = c.workload ? `, ${String(c.workload).replace(/h$/i, "")}h` : "";
    blocoCerts += `- ${c.course_title}${horas}. Verificação: ${SITE}/certificado/${c.code}\n`;
  }

  const estiloEscolhido = ESTILOS[estilo] ?? ESTILOS.surpresa;

  const prompt = `Você é um designer e desenvolvedor front-end premiado. Crie o site de portfólio profissional de ${nome}, que trabalha com dados.

# Entrega
Um único arquivo HTML completo, do <!doctype html> ao </html>, pronto para publicar. Responda só com o código, sem explicação antes ou depois.

# Regras técnicas obrigatórias
O site vai rodar num ambiente isolado e restrito. Se estas regras forem quebradas, ele não funciona:
- Todo o CSS e o JavaScript dentro do próprio arquivo, em <style> e <script>.
- Fontes só do Google Fonts. Bibliotecas, se precisar, só de cdnjs.cloudflare.com ou cdn.jsdelivr.net.
- Nada de formulário, fetch, chamada de API ou iframe. O site não consegue acessar a rede.
- Todo link externo com target="_blank" e rel="noopener".
- Imagens: use só as URLs listadas abaixo. Não invente imagem, não use banco de imagens, não embuta imagem em base64.
- Funcionar bem no celular, a partir de 360px de largura.
- Respeitar prefers-reduced-motion e prefers-color-scheme.

# Conteúdo
Use exatamente estes fatos. Não invente número, empresa, cargo, cliente, depoimento nem resultado. Se um campo não existir, omita a parte correspondente em vez de preencher com texto de exemplo.

${linha("Nome", nome)}${linha("Título profissional", perfil?.headline)}${linha("Sobre", perfil?.bio)}${linha("Habilidades", skills)}${linha("LinkedIn", perfil?.linkedin_url)}${linha("Foto", foto)}
## Projetos
${blocoProjetos || "\n(nenhum projeto pronto ainda: faça uma seção de projetos com a frase \"Projetos em breve\")\n"}
${blocoCerts ? `## Certificados verificáveis\nEmitidos pela DriveData Academy. Mostre cada um com um botão "Verificar" apontando para o link.\n${blocoCerts}` : ""}
# Direção de arte: ${estiloEscolhido.nome}
${estiloEscolhido.direcao}

Isto não é um currículo, é a vitrine de alguém que resolve problemas com dados. Os números reais dos projetos são os protagonistas: dê a eles tamanho e destaque.
Evite a cara de template gerado por IA: nada de gradiente roxo e azul, nada de emoji como ícone, nada de tudo centralizado, nada de adjetivo vazio como "apaixonado por dados".

# Estrutura
1. Abertura com o nome, o título profissional e uma frase de valor tirada dos projetos.
2. Projetos, a parte principal: para cada um, o problema, o que foi feito e o que mudou.
3. Ferramentas que aparecem nos projetos.
${[blocoCerts ? "Certificados, com o link de verificação." : "", perfil?.linkedin_url ? "Contato pelo LinkedIn." : ""]
  .filter(Boolean)
  .map((t, i) => `${i + 4}. ${t}\n`)
  .join("")}No rodapé, em letra pequena: "Portfólio publicado na DriveData Academy".`;

  return { prompt, incluidos: validos.length, foraPorLacuna, foraPorPrivado, certificados: certificados.length };
}
