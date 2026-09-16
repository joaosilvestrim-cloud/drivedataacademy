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

  // Os dois sócios assinam todo certificado, então são dois blocos iguais.
  const campos = [
    "cert_signature_url", "cert_signature_name", "cert_signature_role",
    "cert_signature2_url", "cert_signature2_name", "cert_signature2_role",
  ];
  const rows = campos.map((key) => ({
    key,
    value: ((formData.get(key) as string) || "").trim(),
    updated_at: new Date().toISOString(),
  }));

  const supabase = createAdminClient();
  const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
  if (error) redirect("/admin/settings?error=" + encodeURIComponent(error.message));

  revalidatePath("/admin/settings");
  redirect("/admin/settings?ok=1");
}
