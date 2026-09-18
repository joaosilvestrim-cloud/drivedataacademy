"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NOMES_PADRAO, CHAVE_CONFIG, LIMITE_NOME, LIMITE_DESC } from "@/lib/ferramentas-nomes";

/* Grava só o que foi trocado. Campo igual ao padrão ou em branco não é
   guardado: assim, se o texto padrão mudar no código, quem nunca mexeu recebe
   o novo automaticamente. */
export async function salvarNomes(formData: FormData) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  const trocas: Record<string, { nome?: string; desc?: string }> = {};
  for (const [chave, padrao] of Object.entries(NOMES_PADRAO)) {
    const nome = String(formData.get(`nome:${chave}`) || "").replace(/\s+/g, " ").trim();
    const desc = String(formData.get(`desc:${chave}`) || "").replace(/\s+/g, " ").trim();
    if (nome.length > LIMITE_NOME) redirect("/admin/nomes-ferramentas?error=" + encodeURIComponent(`O nome de "${padrao.nome}" passa de ${LIMITE_NOME} caracteres.`));
    if (desc.length > LIMITE_DESC) redirect("/admin/nomes-ferramentas?error=" + encodeURIComponent(`A descrição de "${padrao.nome}" passa de ${LIMITE_DESC} caracteres.`));
    const t: { nome?: string; desc?: string } = {};
    if (nome && nome !== padrao.nome) t.nome = nome;
    if (desc && desc !== padrao.desc) t.desc = desc;
    if (t.nome || t.desc) trocas[chave] = t;
  }

  const { error } = await createAdminClient()
    .from("site_settings")
    .upsert({ key: CHAVE_CONFIG, value: JSON.stringify(trocas), updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) redirect("/admin/nomes-ferramentas?error=" + encodeURIComponent(error.message));

  revalidatePath("/conta/ferramentas");
  revalidatePath("/admin/nomes-ferramentas");
  redirect("/admin/nomes-ferramentas?ok=1");
}
