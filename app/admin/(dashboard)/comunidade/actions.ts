"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

async function admin() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return createAdminClient();
}

export async function createChannel(formData: FormData) {
  const supabase = await admin();
  const name = ((formData.get("name") as string) || "").trim();
  if (!name) redirect("/admin/comunidade");
  const slug = slugify(name) || slugify(name + "-canal");
  const { count } = await supabase.from("forum_channels").select("*", { count: "exact", head: true });
  await supabase.from("forum_channels").insert({
    name,
    slug,
    description: ((formData.get("description") as string) || "").trim() || null,
    position: count ?? 0,
  });
  revalidatePath("/admin/comunidade");
}

export async function updateChannel(formData: FormData) {
  const supabase = await admin();
  await supabase.from("forum_channels").update({
    name: ((formData.get("name") as string) || "").trim(),
    description: ((formData.get("description") as string) || "").trim() || null,
  }).eq("id", formData.get("id") as string);
  revalidatePath("/admin/comunidade");
}

export async function deleteChannel(formData: FormData) {
  const supabase = await admin();
  await supabase.from("forum_channels").delete().eq("id", formData.get("id") as string);
  revalidatePath("/admin/comunidade");
}

export async function moveChannel(formData: FormData) {
  const supabase = await admin();
  const id = formData.get("id") as string;
  const dir = Number(formData.get("dir"));
  const { data: rows } = await supabase.from("forum_channels").select("id, position").order("position");
  if (!rows) return;
  const idx = rows.findIndex((r: any) => r.id === id);
  const j = idx + dir;
  if (idx < 0 || j < 0 || j >= rows.length) return;
  const a: any = rows[idx];
  const b: any = rows[j];
  await supabase.from("forum_channels").update({ position: b.position }).eq("id", a.id);
  await supabase.from("forum_channels").update({ position: a.position }).eq("id", b.id);
  revalidatePath("/admin/comunidade");
}

// ---------- Moderação de mensagens (chat) ----------
export async function deleteMessage(formData: FormData) {
  const supabase = await admin();
  await supabase.from("channel_messages").delete().eq("id", formData.get("id") as string);
  revalidatePath("/admin/comunidade");
}

// ---------- Moderação de tópicos (legado) ----------
export async function togglePinThread(formData: FormData) {
  const supabase = await admin();
  await supabase.from("forum_threads").update({ pinned: formData.get("next") === "true" }).eq("id", formData.get("id") as string);
  revalidatePath("/admin/comunidade");
}

export async function toggleLockThread(formData: FormData) {
  const supabase = await admin();
  await supabase.from("forum_threads").update({ locked: formData.get("next") === "true" }).eq("id", formData.get("id") as string);
  revalidatePath("/admin/comunidade");
}

export async function deleteThread(formData: FormData) {
  const supabase = await admin();
  // apaga respostas e pontos ligados antes do tópico
  const id = formData.get("id") as string;
  const { data: posts } = await supabase.from("forum_posts").select("id").eq("thread_id", id);
  const postIds = (posts ?? []).map((p: any) => p.id);
  if (postIds.length) await supabase.from("point_events").delete().in("ref_id", postIds).eq("kind", "solution");
  await supabase.from("forum_threads").delete().eq("id", id);
  revalidatePath("/admin/comunidade");
}
