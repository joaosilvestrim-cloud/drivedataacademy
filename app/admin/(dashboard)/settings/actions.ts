"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function saveSettings(formData: FormData) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  const promoVideoUrl = ((formData.get("promo_video_url") as string) || "").trim();

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert(
      { key: "promo_video_url", value: promoVideoUrl, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );

  if (error) {
    redirect("/admin/settings?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/");
  revalidatePath("/admin/settings");
  redirect("/admin/settings?ok=1");
}
