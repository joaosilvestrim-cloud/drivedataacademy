"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WORKSHOP_OPTIONS } from "./workshop";

export async function voteWorkshop(formData: FormData) {
  const option = ((formData.get("option") as string) || "").trim();
  if (!WORKSHOP_OPTIONS.includes(option)) return;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const admin = createAdminClient();
  await admin.from("workshop_votes").upsert(
    { user_id: user.id, option, created_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  revalidatePath("/conta");
}
