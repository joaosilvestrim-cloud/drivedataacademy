"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

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
    cover_url: ((formData.get("cover_url") as string) || "").trim() || null,
    published: formData.get("published") === "on",
  };

  if (id) await supabase.from("live_events").update(payload).eq("id", id);
  else await supabase.from("live_events").insert(payload);

  revalidatePath("/admin/lives");
  revalidatePath("/conta/agenda");
  redirect("/admin/lives?ok=1");
}

export async function deleteLive(formData: FormData) {
  const supabase = await admin();
  await supabase.from("live_events").delete().eq("id", formData.get("id") as string);
  revalidatePath("/admin/lives");
  revalidatePath("/conta/agenda");
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
