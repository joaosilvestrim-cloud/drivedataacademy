"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function saveVideos(formData: FormData) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  let list: string[] = [];
  try {
    const parsed = JSON.parse((formData.get("videos_json") as string) || "[]");
    if (Array.isArray(parsed)) {
      list = parsed.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim());
    }
  } catch {
    /* json inválido -> lista vazia */
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert(
      { key: "promo_videos", value: JSON.stringify(list), updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );

  if (error) {
    redirect("/admin/settings?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/");
  revalidatePath("/admin/settings");
  redirect("/admin/settings?ok=1");
}

export async function saveCertSignature(formData: FormData) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  const rows = [
    { key: "cert_signature_url", value: ((formData.get("cert_signature_url") as string) || "").trim() },
    { key: "cert_signature_name", value: ((formData.get("cert_signature_name") as string) || "").trim() },
    { key: "cert_signature_role", value: ((formData.get("cert_signature_role") as string) || "").trim() },
  ].map((r) => ({ ...r, updated_at: new Date().toISOString() }));

  const supabase = createAdminClient();
  const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
  if (error) redirect("/admin/settings?error=" + encodeURIComponent(error.message));

  revalidatePath("/admin/settings");
  redirect("/admin/settings?ok=1");
}
