"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity } from "@/lib/community";
import { LIMITES, ferramentasValidas, limpar, linkValido, pendenciasDoProjeto, type Projeto } from "@/lib/portfolio";

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
    publico: formData.get("publico") === "on",
    updated_at: new Date().toISOString(),
  };

  // Enviar para revisão exige o projeto completo; salvar rascunho aceita o que tiver.
  const faltas = pendenciasDoProjeto(dados as any);
  if (enviar && faltas.length) {
    return { ok: false as const, erro: `Falta ${faltas.join(", ")}.` };
  }
  const status = enviar ? "revisao" : "rascunho";

  if (id) {
    const atual = await meuProjeto(admin, id, user.id);
    if (!atual) return { ok: false as const, erro: "Projeto não encontrado." };
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
