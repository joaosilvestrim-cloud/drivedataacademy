"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET_MATERIAIS, CATEGORIAS } from "@/lib/materiais";

async function admin() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return createAdminClient();
}

function voltar(msg: string, erro = false): never {
  redirect(`/admin/materiais-prontos?${erro ? "error" : "ok"}=${encodeURIComponent(msg)}`);
}

function refresh() {
  revalidatePath("/admin/materiais-prontos");
  revalidatePath("/conta/materiais");
}

function nomeSeguro(nome: string) {
  return (nome || "arquivo")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-80);
}

/* URL de envio assinada. O navegador sobe o arquivo direto no Storage, sem
   passar pelo servidor: um .pbix passa fácil de dezenas de MB e estouraria o
   limite de corpo da Vercel. O bucket é privado e nasce aqui se não existir. */
export async function assinarUploadMaterial(nomeArquivo: string) {
  const supabase = await admin();
  await supabase.storage.createBucket(BUCKET_MATERIAIS, { public: false }).catch(() => {});
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${nomeSeguro(nomeArquivo)}`;
  const { data, error } = await supabase.storage.from(BUCKET_MATERIAIS).createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, error: error?.message || "Não consegui preparar o envio." };
  return { ok: true as const, path: data.path, token: data.token };
}

export async function salvarMaterial(formData: FormData) {
  const supabase = await admin();
  const id = (formData.get("id") as string) || null;
  const title = ((formData.get("title") as string) || "").trim();
  const categoriaRaw = (formData.get("category") as string) || "powerbi";
  const category = CATEGORIAS.some((c) => c.key === categoriaRaw) ? categoriaRaw : "outro";
  const file_path = ((formData.get("file_path") as string) || "").trim() || null;
  const file_name = ((formData.get("file_name") as string) || "").trim() || null;
  const file_size = Number(formData.get("file_size") || 0) || null;
  const external_url = ((formData.get("external_url") as string) || "").trim() || null;

  if (!title) voltar("Informe o título do material.", true);
  if (!file_path && !external_url) voltar("Envie um arquivo ou informe um link.", true);

  const payload = {
    title,
    description: ((formData.get("description") as string) || "").trim() || null,
    category,
    file_path,
    file_name,
    file_size,
    external_url,
    cover_url: ((formData.get("cover_url") as string) || "").trim() || null,
    published: formData.get("published") === "on",
    position: Number(formData.get("position") || 0) || 0,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    // Trocou o arquivo? O antigo sai do bucket para não virar lixo pago.
    const { data: antes } = await supabase.from("ready_materials").select("file_path").eq("id", id).maybeSingle();
    const { error } = await supabase.from("ready_materials").update(payload).eq("id", id);
    if (error) voltar(error.message, true);
    if (antes?.file_path && antes.file_path !== file_path) {
      await supabase.storage.from(BUCKET_MATERIAIS).remove([antes.file_path]);
    }
  } else {
    const { error } = await supabase.from("ready_materials").insert(payload);
    if (error) voltar(error.message, true);
  }

  refresh();
  voltar(id ? "Material atualizado." : "Material criado.");
}

export async function excluirMaterial(formData: FormData) {
  const supabase = await admin();
  const id = formData.get("id") as string;
  const { data: m } = await supabase.from("ready_materials").select("file_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("ready_materials").delete().eq("id", id);
  if (error) voltar(error.message, true);
  if (m?.file_path) await supabase.storage.from(BUCKET_MATERIAIS).remove([m.file_path]);
  refresh();
  voltar("Material excluído.");
}
