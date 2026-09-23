"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { srcColado } from "@/lib/video";

async function admin() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return createAdminClient();
}

// datetime-local ("YYYY-MM-DDTHH:mm") interpretado no fuso do Brasil (UTC-3).
function toISO(local: string): string | null {
  if (!local) return null;
  const d = new Date(local.length <= 16 ? local + ":00-03:00" : local);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/* O Panda entrega um <iframe> pronto e é isso que a pessoa cola. Guardar o
   HTML inteiro funcionaria, mas suja o banco e quebra qualquer validação de
   link. Aqui fica só o src, lido pelo mesmo módulo que a página do aluno usa. */
function endereçoDoVideo(bruto: string): string | null {
  return srcColado(bruto) || null;
}

export async function saveLive(formData: FormData) {
  const supabase = await admin();
  const id = (formData.get("id") as string) || null;
  const starts = toISO((formData.get("starts_at") as string) || "");
  if (!starts) redirect("/admin/lives?error=" + encodeURIComponent("Informe a data/hora da live."));

  const payload = {
    title: ((formData.get("title") as string) || "").trim(),
    description: ((formData.get("description") as string) || "").trim() || null,
    starts_at: starts,
    duration_min: Number((formData.get("duration_min") as string) || "0") || null,
    url: ((formData.get("url") as string) || "").trim() || null,
    // Link e dados de sala fechada. Ficam fora do `url` porque aquele campo é
    // lido pela home e por /cursos, que não pedem login.
    url_alunos: ((formData.get("url_alunos") as string) || "").trim() || null,
    acesso_alunos: ((formData.get("acesso_alunos") as string) || "").trim() || null,
    recording_url: endereçoDoVideo((formData.get("recording_url") as string) || ""),
    cover_url: ((formData.get("cover_url") as string) || "").trim() || null,
    kind: (formData.get("kind") as string) === "mentoria" ? "mentoria" : "live",
    price: Number(((formData.get("price") as string) || "").replace(/[^\d,\.]/g, "").replace(",", ".")) || null,
    published: formData.get("published") === "on",
    // Presenca por QR code: so existe quando o certificado esta ligado.
    certificate_enabled: formData.get("certificate_enabled") === "on",
    attendance_code: ((formData.get("attendance_code") as string) || "").trim() || null,
    certificate_hours: ((formData.get("certificate_hours") as string) || "").trim() || null,
    certificate_signature_name: ((formData.get("certificate_signature_name") as string) || "").trim() || null,
    certificate_signature_role: ((formData.get("certificate_signature_role") as string) || "").trim() || null,
    certificate_signature_url: ((formData.get("certificate_signature_url") as string) || "").trim() || null,
  };

  // Até aqui, um erro do banco era engolido e a tela dizia "Salvo" do mesmo
  // jeito. Quem colava a gravação e não via nada mudar não tinha como saber se
  // o problema era o link ou o sistema.
  const { error } = id
    ? await supabase.from("live_events").update(payload).eq("id", id)
    : await supabase.from("live_events").insert(payload);
  if (error) redirect("/admin/lives?error=" + encodeURIComponent(error.message));

  revalidatePath("/admin/lives");
  revalidatePath("/conta/agenda");
  revalidatePath("/conta/gravacoes");
  redirect("/admin/lives?ok=1");
}

export async function deleteLive(formData: FormData) {
  const supabase = await admin();
  await supabase.from("live_events").delete().eq("id", formData.get("id") as string);
  revalidatePath("/admin/lives");
  revalidatePath("/conta/agenda");
  revalidatePath("/conta/gravacoes");
  redirect("/admin/lives?ok=1");
}

// Drip: define/limpa a data de liberação de um módulo.
export async function setModuleRelease(formData: FormData) {
  const supabase = await admin();
  const moduleId = formData.get("module_id") as string;
  const courseId = formData.get("course_id") as string;
  const available_at = toISO((formData.get("available_at") as string) || "");
  await supabase.from("course_modules").update({ available_at }).eq("id", moduleId);
  revalidatePath(`/admin/cursos/${courseId}`);
}
