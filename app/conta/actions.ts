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

// Campos do perfil que o próprio aluno pode editar.
const PROFILE_FIELDS = [
  "full_name", "phone", "country", "linkedin_url",
  "headline", "bio", "skills", "cv_url", "avatar_url", "portfolio_url",
] as const;
type ProfileField = (typeof PROFILE_FIELDS)[number];

// Grava o perfil pelo servidor (service role). Evita depender da RLS/sessão do
// navegador, que fazia o update "passar" sem alterar nenhuma linha.
export async function saveProfile(patch: Partial<Record<ProfileField, string>>) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Faça login novamente." };

  const payload: Record<string, string | null> = {};
  for (const key of PROFILE_FIELDS) {
    if (!(key in patch)) continue;
    const v = patch[key];
    payload[key] = typeof v === "string" && v.trim() ? v.trim() : null;
  }
  if (Object.keys(payload).length === 0) return { ok: true as const };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/conta/perfil");
  revalidatePath("/conta/vitrine");
  revalidatePath("/conta/comunidade");
  return { ok: true as const };
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
