"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity } from "@/lib/community";
import { LACUNA, LIMITES, ferramentasValidas, limpar, linkValido, pendenciasDoProjeto, type Projeto } from "@/lib/portfolio";
import { organizarExperiencias, organizarRelato, type ExperienciaLida } from "@/lib/portfolio-ia";
import { tabelaAusente } from "@/lib/portfolio-carreira";
import { aprovacaoLigada } from "@/lib/portfolio-aprovacao";
import { randomBytes } from "crypto";
import { competenciasDoObjetivo, competenciasParaSalvar, cursosPorCompetencia, identificarCompetencias, nomesDasCompetencias, textoDoProjeto } from "@/lib/portfolio-competencias";
import { auditarSiteDoAluno, limparHtmlColado, montarPrompt, slugDoNome, slugLivre, textoDoPostLinkedIn, type Estilo } from "@/lib/portfolio-site";
import type { Personalizacao } from "@/lib/portfolio-site-html";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");

/* O que o aluno pode fazer com o próprio projeto.

   Toda ação confere duas coisas: que a pessoa tem acesso ativo e que o projeto
   é dela. O status de revisão nunca vem da tela: quem decide se está publicado
   é o time, no admin. */

async function alunoComAcesso() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const admin = createAdminClient();
  if (!(await canUseCommunity(admin, user.id, user.email))) redirect("/matricula");
  return { user, admin };
}

/* "AAAA-MM" do campo de mês vira "AAAA-MM-01". Recusa futuro e antes de
   1990: projeto de dados de 1985 ou de 2031 é erro de digitação, e bagunçaria
   a linha do tempo do universo. */
function mesValido(bruto: string | null): string | null {
  const m = (bruto || "").match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  const data = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
  if (isNaN(data.getTime()) || data.getUTCFullYear() < 1990 || data.getTime() > Date.now()) return null;
  return `${m[1]}-${m[2]}-01`;
}

async function meuProjeto(admin: ReturnType<typeof createAdminClient>, id: string, userId: string) {
  const { data } = await admin.from("portfolio_projects").select("*").eq("id", id).maybeSingle();
  if (!data || data.user_id !== userId) return null;
  return data as Projeto;
}

export async function assinarCapaDoProjeto(ext: string) {
  const { admin } = await alunoComAcesso();
  const bucket = "portfolio";
  await admin.storage.createBucket(bucket, { public: true }).catch(() => {});
  const limpo = (ext || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
  const path = `projeto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${limpo}`;
  const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, error: error?.message || "Não consegui preparar o envio." };
  return { ok: true as const, path: data.path, token: data.token, url: admin.storage.from(bucket).getPublicUrl(path).data.publicUrl };
}

export async function salvarProjeto(formData: FormData) {
  const { user, admin } = await alunoComAcesso();
  const id = (formData.get("id") as string) || "";
  const enviar = formData.get("acao") === "enviar";

  const dados = {
    titulo: limpar(formData.get("titulo") as string, LIMITES.titulo),
    resumo: limpar(formData.get("resumo") as string, LIMITES.resumo),
    descricao: limpar(formData.get("descricao") as string, LIMITES.descricao) || null,
    problema: limpar(formData.get("problema") as string, 600) || null,
    resultado: limpar(formData.get("resultado") as string, 600) || null,
    ferramentas: ferramentasValidas(formData.getAll("ferramentas")),
    cover_url: linkValido(formData.get("cover_url") as string),
    link_url: linkValido(formData.get("link_url") as string),
    repo_url: linkValido(formData.get("repo_url") as string),
    course_id: (formData.get("course_id") as string) || null,
    feito_em: mesValido(formData.get("feito_em") as string),
    publico: formData.get("publico") === "on",
    updated_at: new Date().toISOString(),
  };

  // Enviar para revisão exige o projeto completo; salvar rascunho aceita o que tiver.
  const faltas = pendenciasDoProjeto(dados as any);
  if (enviar && faltas.length) {
    return { ok: false as const, erro: `Falta ${faltas.join(", ")}.` };
  }
  // Com a aprovação desligada pelo time, o projeto enviado já sai publicado.
  const comAprovacao = await aprovacaoLigada(admin);
  const status = enviar ? (comAprovacao ? "revisao" : "aprovado") : "rascunho";

  const atual = id ? await meuProjeto(admin, id, user.id) : null;
  if (id && !atual) return { ok: false as const, erro: "Projeto não encontrado." };

  /* O que o texto do projeto prova, para o Universo 4D. Reaproveita a
     leitura anterior se o texto não mudou, e nunca impede o salvamento: com
     a IA fora do ar, o projeto salva e o 4D usa só as ferramentas. */
  const competencias = await competenciasParaSalvar(textoDoProjeto(dados), atual?.competencias);
  (dados as any).competencias = competencias;

  if (id && atual) {
    // Mexer em projeto publicado volta para a fila: o que está na vitrine foi o que o time leu.
    const novoStatus = enviar ? status : atual.status === "aprovado" ? (comAprovacao ? "revisao" : "aprovado") : status;
    const { error } = await admin
      .from("portfolio_projects")
      .update({ ...dados, status: novoStatus, motivo: null, ...(novoStatus === "aprovado" && atual.status !== "aprovado" ? { aprovado_em: new Date().toISOString() } : {}) })
      .eq("id", id);
    if (error) return { ok: false as const, erro: error.message };
    await salvarDetalhes(admin, id, user.id, formData);
  } else {
    const { data: novo, error } = await admin
      .from("portfolio_projects")
      .insert({ ...dados, user_id: user.id, status, ...(status === "aprovado" ? { aprovado_em: new Date().toISOString() } : {}) })
      .select("id")
      .single();
    if (error) return { ok: false as const, erro: error.message };
    if (novo?.id) await salvarDetalhes(admin, novo.id, user.id, formData);
  }

  revalidatePath("/conta/portfolio");
  revalidatePath("/portfolio");
  return { ok: true as const, status };
}

export async function excluirProjeto(id: string) {
  const { user, admin } = await alunoComAcesso();
  const atual = await meuProjeto(admin, id, user.id);
  if (!atual) return { ok: false as const, erro: "Projeto não encontrado." };
  await admin.from("portfolio_projects").delete().eq("id", id);
  revalidatePath("/conta/portfolio");
  revalidatePath("/portfolio");
  return { ok: true as const };
}

/* Organizar com IA. A regra e o prompt estão em lib/portfolio-ia, onde dá
   para testar sem passar pelo login. Aqui só se confere o acesso. */
export async function organizarComIA(relato: string) {
  await alunoComAcesso();
  return organizarRelato(relato);
}

/** Curtida do colega. Clicar de novo tira a curtida. */
export async function curtirProjeto(id: string) {
  const { user, admin } = await alunoComAcesso();
  const { data: ja } = await admin.from("portfolio_likes").select("project_id").eq("project_id", id).eq("user_id", user.id).maybeSingle();
  if (ja) await admin.from("portfolio_likes").delete().eq("project_id", id).eq("user_id", user.id);
  else await admin.from("portfolio_likes").insert({ project_id: id, user_id: user.id });

  const { count } = await admin.from("portfolio_likes").select("user_id", { count: "exact", head: true }).eq("project_id", id);
  await admin.from("portfolio_projects").update({ curtidas: count ?? 0 }).eq("id", id);
  revalidatePath("/conta/portfolio");
  return { ok: true as const, curtido: !ja, curtidas: count ?? 0 };
}

/* Site de portfólio: o prompt, o HTML colado e a publicação.
   O desenho e o isolamento estão explicados em lib/portfolio-site.ts. */

export async function gerarPromptDoSite(estilo: Estilo, personalizacao: Partial<Personalizacao> = {}) {
  const { user, admin } = await alunoComAcesso();
  const r = await montarPrompt(admin, user.id, estilo, personalizacao);
  return { ok: true as const, ...r };
}

/* Prévia no formulário: o que este projeto acende no 4D, e por quê. É o
   momento em que o aluno vê a constelação se formando enquanto escreve. */
export async function previaDasCompetencias(texto: string) {
  await alunoComAcesso();
  const [itens, nomes] = await Promise.all([identificarCompetencias(texto), nomesDasCompetencias()]);
  if (itens === null) return { ok: false as const, erro: "A IA não respondeu agora. As competências são lidas de novo quando você salvar." };
  return { ok: true as const, itens: itens.map((i) => ({ ...i, nome: nomes[i.id] || i.id })) };
}

/** Auditoria do site colado: nota, erros que bloqueiam, avisos e o pedido de correção pronto. */
export async function conferirSite(html: string) {
  const { user, admin } = await alunoComAcesso();
  const limpo = limparHtmlColado(html);
  if (!limpo.ok) return { ok: false as const, erro: limpo.erro };
  return { ok: true as const, auditoria: await auditarSiteDoAluno(admin, user.id, limpo.html) };
}

export async function salvarSite(dados: { html: string; publicar: boolean; mostrarUniverso: boolean }) {
  const { user, admin } = await alunoComAcesso();
  const limpo = limparHtmlColado(dados.html);
  if (!limpo.ok) return { ok: false as const, erro: limpo.erro };

  /* Publicar passa pela mesma auditoria da pré-visualização, no servidor.
     Site cortado, com texto de exemplo ou sem um projeto não vai para o ar,
     mesmo que alguém pule a pré-visualização. Salvar sem publicar continua
     livre: é rascunho. */
  if (dados.publicar) {
    const auditoria = await auditarSiteDoAluno(admin, user.id, limpo.html);
    const erros = auditoria.achados.filter((a) => a.nivel === "erro");
    if (erros.length) return { ok: false as const, erro: `Antes de publicar, corrija: ${erros.map((e) => e.texto).join(" ")}` };
  }

  const { data: atual } = await admin.from("portfolio_sites").select("slug, bloqueado").eq("user_id", user.id).maybeSingle();
  // Bloqueio é do time. Republicar não desfaz, senão o bloqueio não valeria nada.
  if (atual?.bloqueado) return { ok: false as const, erro: "Seu site foi tirado do ar pelo time. Fale com o suporte pela Central de Ajuda." };

  let slug = atual?.slug;
  if (!slug) {
    const { data: perfil } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    slug = await slugLivre(admin, slugDoNome(perfil?.full_name || (user.email || "").split("@")[0]), user.id);
  }

  const { error } = await admin.from("portfolio_sites").upsert(
    {
      user_id: user.id,
      slug,
      html: limpo.html,
      publicado: dados.publicar,
      mostrar_universo: dados.mostrarUniverso,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false as const, erro: error.message };

  const url = `${SITE}/portfolio/${slug}`;
  /* O perfil tem um campo de portfólio que aparece na comunidade. Preenche só
     se estiver vazio: quem já tinha um site próprio lá escolheu aquele. */
  if (dados.publicar) {
    await admin.from("profiles").update({ portfolio_url: url }).eq("id", user.id).or("portfolio_url.is.null,portfolio_url.eq.");
  }

  revalidatePath(`/portfolio/${slug}`);
  revalidatePath("/conta/portfolio");
  return { ok: true as const, slug, url, publicado: dados.publicar };
}

export async function despublicarSite() {
  const { user, admin } = await alunoComAcesso();
  const { data } = await admin.from("portfolio_sites").update({ publicado: false }).eq("user_id", user.id).select("slug").maybeSingle();
  if (data?.slug) revalidatePath(`/portfolio/${data.slug}`);
  revalidatePath("/conta/portfolio");
  return { ok: true as const };
}

/** Texto do post do LinkedIn para o site publicado, montado só com o que o aluno publicou. */
export async function postDoLinkedIn() {
  const { user, admin } = await alunoComAcesso();
  const { data: site } = await admin.from("portfolio_sites").select("slug, publicado").eq("user_id", user.id).maybeSingle();
  if (!site?.publicado) return { ok: false as const, erro: "Publique o site primeiro." };
  return { ok: true as const, texto: await textoDoPostLinkedIn(admin, user.id, `${SITE}/portfolio/${site.slug}`) };
}

/* ------------------------------------------------------------------------
   Universo da carreira: detalhes do projeto, objetivo, trajetória,
   conquistas e recomendações. Tudo em tabelas novas; sem a migration
   20260929_universo_da_carreira.sql, cada ação responde com um aviso em vez
   de quebrar.
   ------------------------------------------------------------------------ */

const SEM_TABELA = "Essa parte ainda está sendo ligada pelo time. Tente de novo mais tarde.";

const inteiro = (v: FormDataEntryValue | null, min: number, max: number) => {
  const n = Number(String(v ?? "").replace(/\D/g, ""));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

/** Os detalhes que viram o planeta: papel, tamanho do time, duração, aprendizado, setor. */
async function salvarDetalhes(admin: ReturnType<typeof createAdminClient>, projectId: string, userId: string, formData: FormData) {
  if (!formData.has("papel") && !formData.has("setor")) return;
  const { error } = await admin.from("portfolio_projeto_detalhes").upsert(
    {
      project_id: projectId,
      user_id: userId,
      papel: limpar(formData.get("papel") as string, 600) || null,
      time_tamanho: inteiro(formData.get("time_tamanho"), 1, 500),
      duracao_meses: inteiro(formData.get("duracao_meses"), 1, 240),
      aprendizado: limpar(formData.get("aprendizado") as string, 600) || null,
      setor: limpar(formData.get("setor") as string, 40) || null,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "project_id" },
  );
  if (error && !tabelaAusente(error)) console.warn("[portfolio] detalhes do projeto:", error.message);
}

/* Estrela-guia. A leitura do que o cargo pede é uma estimativa da IA, e a
   tela diz isso; o aluno pode trocar o objetivo quando quiser. */
export async function definirObjetivo(titulo: string) {
  const { user, admin } = await alunoComAcesso();
  const alvo = limpar(titulo, 120);
  if (alvo.length < 3) return { ok: false as const, erro: "Escreva o cargo que você quer alcançar." };
  const requeridas = await competenciasDoObjetivo(alvo);
  const { error } = await admin.from("portfolio_objetivos").upsert(
    { user_id: user.id, titulo: alvo, requeridas: requeridas ?? null, atualizado_em: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false as const, erro: tabelaAusente(error) ? SEM_TABELA : error.message };
  revalidatePath("/conta/portfolio");
  return { ok: true as const, requeridas: requeridas ?? [] };
}

export async function removerObjetivo() {
  const { user, admin } = await alunoComAcesso();
  await admin.from("portfolio_objetivos").delete().eq("user_id", user.id);
  revalidatePath("/conta/portfolio");
  return { ok: true as const };
}

/** Lê a trajetória no texto colado. Não grava: a tela mostra e o aluno confirma. */
export async function lerTrajetoria(texto: string) {
  await alunoComAcesso();
  return organizarExperiencias(texto);
}

const mesParaData = (v: string | null | undefined) => {
  const m = String(v || "").match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-01` : null;
};

export async function salvarExperiencias(itens: ExperienciaLida[]) {
  const { user, admin } = await alunoComAcesso();
  const linhas = (itens || [])
    .filter((e) => limpar(e.cargo, 120).length >= 3)
    .slice(0, 30)
    .map((e) => ({
      user_id: user.id,
      cargo: limpar(e.cargo, 120),
      organizacao: limpar(e.organizacao, 120) || null,
      setor: limpar(e.setor, 40) || null,
      inicio: mesParaData(e.inicio),
      fim: mesParaData(e.fim),
      descricao: limpar(e.descricao, 600) || null,
    }));
  if (!linhas.length) return { ok: false as const, erro: "Nenhuma experiência para salvar." };
  const { error } = await admin.from("portfolio_experiencias").insert(linhas);
  if (error) return { ok: false as const, erro: tabelaAusente(error) ? SEM_TABELA : error.message };
  revalidatePath("/conta/portfolio");
  return { ok: true as const };
}

export async function excluirExperiencia(id: string) {
  const { user, admin } = await alunoComAcesso();
  await admin.from("portfolio_experiencias").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/conta/portfolio");
  return { ok: true as const };
}

export async function adicionarConquista(c: { titulo: string; data: string; descricao: string; link_prova: string }) {
  const { user, admin } = await alunoComAcesso();
  const titulo = limpar(c.titulo, 140);
  if (titulo.length < 3) return { ok: false as const, erro: "Dê um título para a conquista." };
  const { error } = await admin.from("portfolio_conquistas").insert({
    user_id: user.id,
    titulo,
    data: mesParaData(c.data),
    descricao: limpar(c.descricao, 400) || null,
    link_prova: linkValido(c.link_prova),
  });
  if (error) return { ok: false as const, erro: tabelaAusente(error) ? SEM_TABELA : error.message };
  revalidatePath("/conta/portfolio");
  return { ok: true as const };
}

export async function excluirConquista(id: string) {
  const { user, admin } = await alunoComAcesso();
  await admin.from("portfolio_conquistas").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/conta/portfolio");
  return { ok: true as const };
}

/* Recomendação: o aluno só gera o convite. Quem escreve é o colega, pelo
   link, e confirma o próprio e-mail antes de chegar para o aluno aprovar. */
export async function criarConviteRecomendacao(projectId: string | null) {
  const { user, admin } = await alunoComAcesso();
  if (projectId) {
    const dono = await meuProjeto(admin, projectId, user.id);
    if (!dono) return { ok: false as const, erro: "Projeto não encontrado." };
  }
  const token = randomBytes(18).toString("base64url");
  const { error } = await admin.from("portfolio_recomendacoes").insert({ user_id: user.id, project_id: projectId || null, token });
  if (error) return { ok: false as const, erro: tabelaAusente(error) ? SEM_TABELA : error.message };
  revalidatePath("/conta/portfolio");
  return { ok: true as const, url: `${SITE}/recomendar/${token}` };
}

export async function decidirRecomendacao(id: string, aprovar: boolean) {
  const { user, admin } = await alunoComAcesso();
  const { data } = await admin.from("portfolio_recomendacoes").select("status").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!data || data.status !== "aguardando_aprovacao") return { ok: false as const, erro: "Essa recomendação não está esperando aprovação." };
  await admin
    .from("portfolio_recomendacoes")
    .update({ status: aprovar ? "aprovada" : "recusada", aprovado_em: aprovar ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/conta/portfolio");
  return { ok: true as const };
}

export async function excluirRecomendacao(id: string) {
  const { user, admin } = await alunoComAcesso();
  await admin.from("portfolio_recomendacoes").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/conta/portfolio");
  return { ok: true as const };
}

/* Aderência a uma vaga, do lado do aluno: a mesma leitura que o recrutador
   faz na página pública, para o aluno testar antes de mandar o link. Não
   grava nada além do registro de uso, que segura o custo de IA. */
export async function testarVaga(texto: string) {
  const { user, admin } = await alunoComAcesso();
  const limpo = (texto || "").trim().slice(0, 9000);
  if (limpo.length < 80) return { ok: false as const, erro: "Cole a descrição completa da vaga, com as responsabilidades e os requisitos." };

  const chave = `aluno:${user.id}`;
  const { count, error } = await admin
    .from("portfolio_consultas")
    .select("id", { count: "exact", head: true })
    .eq("slug", chave)
    .gte("criado_em", new Date(Date.now() - 3600_000).toISOString());
  if (error) return { ok: false as const, erro: tabelaAusente(error) ? SEM_TABELA : error.message };
  if ((count ?? 0) >= 15) return { ok: false as const, erro: "Muitas comparações seguidas. Tente de novo daqui a pouco." };
  await admin.from("portfolio_consultas").insert({ slug: chave, origem: "aluno" });

  const pedidas = await identificarCompetencias(limpo, "vaga");
  if (pedidas === null) return { ok: false as const, erro: "Não consegui ler a vaga agora. Tente de novo em instantes." };
  if (!pedidas.length) return { ok: false as const, erro: "Não encontrei na vaga competências do catálogo de dados. Confira se colou a descrição inteira." };

  const [{ data: projetos }, nomes, cursos] = await Promise.all([
    admin.from("portfolio_projects").select("titulo, resumo, problema, resultado, descricao, publico, competencias").eq("user_id", user.id),
    nomesDasCompetencias(),
    cursosPorCompetencia(admin),
  ]);
  // Do lado do aluno vale projeto privado também, avisado: a página pública só conta os públicos.
  const provas = new Map<string, { titulo: string; publico: boolean }[]>();
  for (const p of (projetos ?? []) as any[]) {
    if (LACUNA.test([p.titulo, p.resumo, p.problema, p.resultado, p.descricao].join(" "))) continue;
    for (const c of Array.isArray(p.competencias?.itens) ? p.competencias.itens : []) {
      provas.set(c.id, [...(provas.get(c.id) ?? []), { titulo: p.titulo, publico: !!p.publico }]);
    }
  }
  const itens = pedidas
    .filter((c) => nomes[c.id])
    .map((c) => ({
      id: c.id,
      nome: nomes[c.id],
      trecho: c.trecho,
      tem: provas.has(c.id),
      projetos: provas.get(c.id) ?? [],
      cursos: provas.has(c.id) ? [] : (cursos[c.id] ?? []).slice(0, 2),
    }))
    .sort((a, b) => Number(b.tem) - Number(a.tem));
  return { ok: true as const, itens, tem: itens.filter((i) => i.tem).length, total: itens.length };
}

/* Kit de divulgação, depois de publicar: QR code do site e textos prontos
   para o LinkedIn e para recrutador. Tudo montado com o que o aluno tem de
   verdade; o nome do recrutador fica entre colchetes para ele trocar. */
export async function kitDeDivulgacao() {
  const { user, admin } = await alunoComAcesso();
  const { data: site } = await admin.from("portfolio_sites").select("slug, publicado").eq("user_id", user.id).maybeSingle();
  if (!site?.publicado) return { ok: false as const, erro: "Publique o site primeiro." };

  const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");
  const url = `${SITE}/portfolio/${site.slug}`;
  const [{ data: perfil }, { data: projetos }] = await Promise.all([
    admin.from("profiles").select("full_name, headline").eq("id", user.id).maybeSingle(),
    admin.from("portfolio_projects").select("titulo, resumo, problema, resultado, descricao, competencias, publico").eq("user_id", user.id).eq("publico", true),
  ]);
  const validos = (projetos ?? []).filter((p: any) => !LACUNA.test([p.titulo, p.resumo, p.problema, p.resultado, p.descricao].join(" ")));
  const comps = new Set(validos.flatMap((p: any) => (p.competencias?.itens ?? []).map((c: any) => c.id)));
  const nome = (perfil?.full_name || "").trim();
  const n = validos.length;

  const QRCode = (await import("qrcode")).default;
  const qrSvg = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#04140d", light: "#ffffff" } });

  const resumoCarreira = `${n} ${n === 1 ? "projeto" : "projetos"}${comps.size ? ` e ${comps.size} ${comps.size === 1 ? "competência provada" : "competências provadas"}` : ""}`;
  return {
    ok: true as const,
    url,
    qrSvg,
    destaqueTitulo: `Portfólio${nome ? ` de ${nome}` : ""}`,
    destaqueDescricao: `${resumoCarreira}, cada um com o problema, o que fiz e o que mudou. Tem também o Universo 4D da minha carreira.`,
    mensagem:
      `Olá, [nome da pessoa]! ${perfil?.headline ? `Sou ${nome.split(" ")[0] || ""}, ${perfil.headline.split("|")[0].trim()}. ` : ""}` +
      `Reuni meu trabalho num portfólio com ${resumoCarreira}, cada um com o problema, o que fiz e o que mudou: ${url}\n\nSe fizer sentido, adoraria conversar.`,
  };
}
