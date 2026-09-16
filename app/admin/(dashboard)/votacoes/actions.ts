"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugDeTitulo } from "@/lib/votacao";

async function admin() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return createAdminClient();
}

// datetime-local ("YYYY-MM-DDTHH:mm") lido no fuso do Brasil.
function toISO(local: string): string | null {
  if (!local) return null;
  const d = new Date(local.length <= 16 ? local + ":00-03:00" : local);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

const volta = (msg: string, erro = false, id?: string) =>
  redirect(`/admin/votacoes${id ? `?v=${id}&` : "?"}${erro ? "error" : "ok"}=${encodeURIComponent(msg)}`);

export async function criarVotacao(formData: FormData) {
  const supabase = await admin();
  const title = ((formData.get("title") as string) || "").trim();
  const opcoes = ((formData.get("opcoes") as string) || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (!title) volta("Dê um título para a votação.", true);
  if (opcoes.length < 2) volta("Escreva pelo menos duas opções, uma por linha.", true);

  // Slug único: se já existe, entra com sufixo curto em vez de falhar.
  let slug = slugDeTitulo(title) || "votacao";
  const { data: existe } = await supabase.from("polls").select("id").eq("slug", slug).maybeSingle();
  if (existe) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const { data: nova, error } = await supabase
    .from("polls")
    .insert({
      slug,
      title,
      description: ((formData.get("description") as string) || "").trim() || null,
      max_choices: Math.max(1, Number(formData.get("max_choices") || 1)),
      closes_at: toISO((formData.get("closes_at") as string) || ""),
      allow_suggestion: formData.get("allow_suggestion") === "on",
      show_results: formData.get("show_results") === "on",
      published: formData.get("published") === "on",
    })
    .select("id")
    .single();
  if (error || !nova) volta(error?.message || "Não consegui criar a votação.", true);

  await supabase.from("poll_options").insert(opcoes.map((label, i) => ({ poll_id: nova!.id, label, position: i })));

  revalidatePath("/admin/votacoes");
  volta("Votação criada.", false, nova!.id);
}

export async function salvarVotacao(formData: FormData) {
  const supabase = await admin();
  const id = formData.get("id") as string;
  await supabase
    .from("polls")
    .update({
      title: ((formData.get("title") as string) || "").trim(),
      description: ((formData.get("description") as string) || "").trim() || null,
      max_choices: Math.max(1, Number(formData.get("max_choices") || 1)),
      closes_at: toISO((formData.get("closes_at") as string) || ""),
      allow_suggestion: formData.get("allow_suggestion") === "on",
      show_results: formData.get("show_results") === "on",
      published: formData.get("published") === "on",
    })
    .eq("id", id);

  revalidatePath("/admin/votacoes");
  volta("Votação salva.", false, id);
}

export async function adicionarOpcao(formData: FormData) {
  const supabase = await admin();
  const poll_id = formData.get("poll_id") as string;
  const label = ((formData.get("label") as string) || "").trim();
  if (!label) volta("Escreva o texto da opção.", true, poll_id);

  const { count } = await supabase.from("poll_options").select("*", { count: "exact", head: true }).eq("poll_id", poll_id);
  await supabase.from("poll_options").insert({ poll_id, label, position: count ?? 0 });

  revalidatePath("/admin/votacoes");
  volta("Opção adicionada.", false, poll_id);
}

export async function excluirOpcao(formData: FormData) {
  const supabase = await admin();
  const poll_id = formData.get("poll_id") as string;
  await supabase.from("poll_options").delete().eq("id", formData.get("id") as string);
  // Os votos guardam a lista de ids escolhidos. Um id apagado some da apuração
  // sozinho, então não é preciso reescrever voto nenhum.
  revalidatePath("/admin/votacoes");
  volta("Opção removida.", false, poll_id);
}

export async function excluirVotacao(formData: FormData) {
  const supabase = await admin();
  await supabase.from("polls").delete().eq("id", formData.get("id") as string);
  revalidatePath("/admin/votacoes");
  volta("Votação excluída.");
}
