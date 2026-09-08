"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WORKSHOP_OPTIONS } from "./workshop";

// URL assinada para o aluno subir a foto de perfil (bucket público "avatars").
export async function signAvatarUpload(ext: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Faça login." };
  const admin = createAdminClient();
  const bucket = "avatars";
  await admin.storage.createBucket(bucket, { public: true }).catch(() => {});
  const clean = (ext || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${user.id}-${Date.now()}.${clean}`;
  const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, error: error?.message || "falha" };
  const url = admin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  return { ok: true as const, path: data.path, token: data.token, url };
}

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
