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

export async function savePost(formData: FormData) {
  await requireAdmin();

  const supabase = createAdminClient();

  const id = (formData.get("id") as string) || null;
  const title = (formData.get("title") as string).trim();
  const slugInput = (formData.get("slug") as string).trim();
  const slug = slugInput ? slugify(slugInput) : slugify(title);
  const published = formData.get("published") === "on";

  // Capa: upload de arquivo tem prioridade; senão usa a URL informada.
  let coverUrl = ((formData.get("cover_url") as string) || "").trim() || null;
  const file = formData.get("cover_file") as File | null;
  if (file && file.size > 0) {
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const safeSlug = (slug || "capa").slice(0, 40);
    const path = `covers/${safeSlug}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage.from("blog").upload(path, buffer, {
      contentType: file.type || "image/png",
      upsert: true,
    });
    if (!error) {
      coverUrl = supabase.storage.from("blog").getPublicUrl(path).data.publicUrl;
    }
  }

  const payload = {
    title,
    slug,
    category: ((formData.get("category") as string) || "").trim() || null,
    excerpt: ((formData.get("excerpt") as string) || "").trim() || null,
    content: ((formData.get("content") as string) || "").trim() || null,
    cover_url: coverUrl,
    author: ((formData.get("author") as string) || "").trim() || null,
    published,
    published_at: published
      ? (formData.get("published_at") as string) || new Date().toISOString()
      : null,
  };

  if (id) {
    await supabase.from("posts").update(payload).eq("id", id);
  } else {
    await supabase.from("posts").insert(payload);
  }

  revalidatePath("/admin/posts");
  revalidatePath("/");
  redirect("/admin/posts");
}

export async function deletePost(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const supabase = createAdminClient();
  await supabase.from("posts").delete().eq("id", id);
  revalidatePath("/admin/posts");
  revalidatePath("/");
}

export async function togglePublish(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const next = formData.get("next") === "true";
  const supabase = createAdminClient();
  await supabase
    .from("posts")
    .update({
      published: next,
      published_at: next ? new Date().toISOString() : null,
    })
    .eq("id", id);
  revalidatePath("/admin/posts");
  revalidatePath("/");
}
