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

  // upsert, não update: contas criadas sem o trigger de perfil não têm linha em
  // profiles, e um update nessas contas afeta 0 linhas sem retornar erro nenhum.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .upsert({ id: user.id, ...payload, updated_at: new Date().toISOString() }, { onConflict: "id" })
    .select("id");
  if (error) return { ok: false as const, error: error.message };
  if (!data?.length) return { ok: false as const, error: "Não foi possível gravar o perfil." };

  revalidatePath("/conta/perfil");
  revalidatePath("/conta/vitrine");
  revalidatePath("/conta/comunidade");
  return { ok: true as const };
}

/* Voto da enquete dentro da conta. O aluno clica na opção e pronto: o e-mail
   vem da sessão, então não existe formulário de identificação. É a mesma
   tabela da página pública, para as duas telas mostrarem o mesmo número. */
export async function votarEnquete(formData: FormData) {
  const optionId = ((formData.get("option_id") as string) || "").trim();
  if (!optionId) return;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const admin = createAdminClient();

  const { data: opcao } = await admin.from("poll_options").select("id, poll_id").eq("id", optionId).maybeSingle();
  if (!opcao) return;
  const { data: enquete } = await admin.from("polls").select("id, slug, max_choices, published, closes_at").eq("id", opcao.poll_id).maybeSingle();
  if (!enquete || !enquete.published) return;
  if (enquete.closes_at && new Date(enquete.closes_at).getTime() < Date.now()) return;

  const email = (user.email || "").toLowerCase();
  const { data: perfil } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const { data: voto } = await admin.from("poll_votes").select("options").eq("poll_id", enquete.id).eq("email", email).maybeSingle();

  const atuais: string[] = voto?.options ?? [];
  let escolhas: string[];
  if (enquete.max_choices <= 1) {
    // Clicar na opção já marcada desmarca: o aluno pode tirar o voto.
    escolhas = atuais.includes(optionId) ? [] : [optionId];
  } else if (atuais.includes(optionId)) {
    escolhas = atuais.filter((id) => id !== optionId);
  } else {
    escolhas = [...atuais, optionId].slice(-enquete.max_choices);
  }

  if (escolhas.length === 0) {
    await admin.from("poll_votes").delete().eq("poll_id", enquete.id).eq("email", email);
  } else {
    await admin.from("poll_votes").upsert(
      { poll_id: enquete.id, email, name: perfil?.full_name || user.email, options: escolhas },
      { onConflict: "poll_id,email" }
    );
  }

  revalidatePath("/conta");
  revalidatePath(`/votacao/${enquete.slug}`);
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
