"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function requireAdmin() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
}

async function uploadTo(supabase: any, folder: string, slug: string, file: File): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${folder}/${(slug || "item").slice(0, 40)}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from("materials").upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });
  if (error) return null;
  return supabase.storage.from("materials").getPublicUrl(path).data.publicUrl;
}

export async function saveMaterial(formData: FormData) {
  await requireAdmin();
  const supabase = createAdminClient();

  const id = (formData.get("id") as string) || null;
  const title = (formData.get("title") as string).trim();
  const slugInput = (formData.get("slug") as string).trim();
  const slug = slugInput ? slugify(slugInput) : slugify(title);

  let coverUrl = ((formData.get("cover_url") as string) || "").trim() || null;
  const coverFile = formData.get("cover_file") as File | null;
  if (coverFile && coverFile.size > 0) {
    coverUrl = (await uploadTo(supabase, "covers", slug, coverFile)) || coverUrl;
  }

  let fileUrl = ((formData.get("file_url") as string) || "").trim() || null;
  const contentFile = formData.get("content_file") as File | null;
  if (contentFile && contentFile.size > 0) {
    fileUrl = (await uploadTo(supabase, "files", slug, contentFile)) || fileUrl;
  }

  const payload = {
    title,
    slug,
    subtitle: ((formData.get("subtitle") as string) || "").trim() || null,
    description: ((formData.get("description") as string) || "").trim() || null,
    cover_url: coverUrl,
    file_url: fileUrl,
    cta_text: ((formData.get("cta_text") as string) || "").trim() || null,
    email_subject: ((formData.get("email_subject") as string) || "").trim() || null,
    email_message: ((formData.get("email_message") as string) || "").trim() || null,
    ask_phone: formData.get("ask_phone") === "on",
    ask_company: formData.get("ask_company") === "on",
    ask_role: formData.get("ask_role") === "on",
    published: formData.get("published") === "on",
  };

  if (id) {
    await supabase.from("materials").update(payload).eq("id", id);
  } else {
    await supabase.from("materials").insert(payload);
  }

  revalidatePath("/admin/materiais");
  redirect("/admin/materiais");
}

export async function deleteMaterial(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const supabase = createAdminClient();
  await supabase.from("materials").delete().eq("id", id);
  revalidatePath("/admin/materiais");
}

export async function togglePublishMaterial(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const next = formData.get("next") === "true";
  const supabase = createAdminClient();
  await supabase.from("materials").update({ published: next }).eq("id", id);
  revalidatePath("/admin/materiais");
  revalidatePath("/materiais");
}

export async function duplicateMaterial(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const supabase = createAdminClient();

  const { data: orig } = await supabase.from("materials").select("*").eq("id", id).single();
  if (!orig) return;

  // slug único
  let base = `${orig.slug}-copia`;
  let slug = base;
  let n = 2;
  // tenta achar um slug livre
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data: exists } = await supabase.from("materials").select("id").eq("slug", slug).maybeSingle();
    if (!exists) break;
    slug = `${base}-${n++}`;
  }

  const { id: _id, created_at, updated_at, ...rest } = orig;
  await supabase.from("materials").insert({
    ...rest,
    slug,
    title: `${orig.title} (cópia)`,
    published: false,
  });

  revalidatePath("/admin/materiais");
}
