"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity } from "@/lib/community";
import { LIMITES, ferramentasValidas, limpar, linkValido, pendenciasDoProjeto, type Projeto } from "@/lib/portfolio";
import { organizarRelato } from "@/lib/portfolio-ia";
import { competenciasParaSalvar, identificarCompetencias, nomesDasCompetencias, textoDoProjeto } from "@/lib/portfolio-competencias";
import { limparHtmlColado, montarPrompt, numerosSemOrigem, slugDoNome, slugLivre, type Estilo } from "@/lib/portfolio-site";

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
  const status = enviar ? "revisao" : "rascunho";

  const atual = id ? await meuProjeto(admin, id, user.id) : null;
  if (id && !atual) return { ok: false as const, erro: "Projeto não encontrado." };

  /* O que o texto do projeto prova, para o Universo 4D. Reaproveita a
     leitura anterior se o texto não mudou, e nunca impede o salvamento: com
     a IA fora do ar, o projeto salva e o 4D usa só as ferramentas. */
  const competencias = await competenciasParaSalvar(textoDoProjeto(dados), atual?.competencias);
  (dados as any).competencias = competencias;

  if (id && atual) {
    // Mexer em projeto publicado volta para a fila: o que está na vitrine foi o que o time leu.
    const novoStatus = enviar ? "revisao" : atual.status === "aprovado" ? "revisao" : status;
    const { error } = await admin.from("portfolio_projects").update({ ...dados, status: novoStatus, motivo: null }).eq("id", id);
    if (error) return { ok: false as const, erro: error.message };
  } else {
    const { error } = await admin.from("portfolio_projects").insert({ ...dados, user_id: user.id, status });
    if (error) return { ok: false as const, erro: error.message };
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

export async function gerarPromptDoSite(estilo: Estilo) {
  const { user, admin } = await alunoComAcesso();
  const r = await montarPrompt(admin, user.id, estilo);
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

/** Números com cara de resultado no site que não existem nos fatos do aluno. */
export async function conferirSite(html: string) {
  const { user, admin } = await alunoComAcesso();
  const limpo = limparHtmlColado(html);
  if (!limpo.ok) return { ok: false as const, erro: limpo.erro, suspeitos: [] as string[] };
  return { ok: true as const, suspeitos: await numerosSemOrigem(admin, user.id, limpo.html) };
}

export async function salvarSite(dados: { html: string; publicar: boolean; mostrarUniverso: boolean }) {
  const { user, admin } = await alunoComAcesso();
  const limpo = limparHtmlColado(dados.html);
  if (!limpo.ok) return { ok: false as const, erro: limpo.erro };

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
