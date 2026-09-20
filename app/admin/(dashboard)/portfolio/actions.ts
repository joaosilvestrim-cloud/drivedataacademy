"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/* Moderação da vitrine.

   Aprovar publica na hora. Recusar sempre pede um motivo, porque devolver sem
   dizer o que ajustar é pior do que não responder. O destaque é o que sobe o
   projeto para o topo da vitrine e para a página pública. */

async function admin() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return createAdminClient();
}

function voltar(msg: string, ok = true) {
  revalidatePath("/admin/portfolio");
  revalidatePath("/conta/portfolio");
  revalidatePath("/portfolio");
  redirect(`/admin/portfolio?${ok ? "ok" : "error"}=` + encodeURIComponent(msg));
}

export async function aprovarProjeto(formData: FormData) {
  const supabase = await admin();
  const id = formData.get("id") as string;
  const { error } = await supabase
    .from("portfolio_projects")
    .update({ status: "aprovado", motivo: null, aprovado_em: new Date().toISOString() })
    .eq("id", id);
  voltar(error ? error.message : "Projeto publicado na vitrine.", !error);
}

export async function recusarProjeto(formData: FormData) {
  const supabase = await admin();
  const id = formData.get("id") as string;
  const motivo = ((formData.get("motivo") as string) || "").trim();
  if (motivo.length < 10) voltar("Escreva o que o aluno precisa ajustar (pelo menos 10 letras).", false);
  const { error } = await supabase.from("portfolio_projects").update({ status: "recusado", motivo }).eq("id", id);
  voltar(error ? error.message : "Devolvido para o aluno com o motivo.", !error);
}

export async function alternarDestaque(formData: FormData) {
  const supabase = await admin();
  const id = formData.get("id") as string;
  const ligado = formData.get("destaque") === "1";
  const { error } = await supabase.from("portfolio_projects").update({ destaque: !ligado }).eq("id", id);
  voltar(error ? error.message : ligado ? "Destaque removido." : "Projeto em destaque na vitrine.", !error);
}

export async function despublicarProjeto(formData: FormData) {
  const supabase = await admin();
  const id = formData.get("id") as string;
  const { error } = await supabase.from("portfolio_projects").update({ status: "revisao", destaque: false }).eq("id", id);
  voltar(error ? error.message : "Projeto saiu da vitrine e voltou para a fila.", !error);
}
