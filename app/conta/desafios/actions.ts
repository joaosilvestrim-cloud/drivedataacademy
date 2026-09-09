"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { knowledgeAccess } from "@/lib/knowledge/server";

async function requireStudent() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Faça login para continuar.");
  if (!(await knowledgeAccess(user.id, user.email))) throw new Error("Seu acesso ao Universo não está ativo.");
  return { user, admin: createAdminClient() };
}

// URL assinada para o aluno anexar o arquivo da entrega (bucket "entregas").
export async function signChallengeUpload(ext: string) {
  try {
    const { user, admin } = await requireStudent();
    const bucket = "entregas";
    await admin.storage.createBucket(bucket, { public: true }).catch(() => {});
    const clean = (ext || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "pdf";
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${clean}`;
    const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data) throw new Error(error?.message || "falha");
    return { ok: true as const, path: data.path, token: data.token, url: admin.storage.from(bucket).getPublicUrl(path).data.publicUrl };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Não consegui preparar o envio." };
  }
}

export async function submitChallenge(challengeId: string, content: string, link: string) {
  try {
    const { user, admin } = await requireStudent();
    if (!/^[0-9a-f-]{36}$/i.test(challengeId)) throw new Error("Desafio inválido.");
    const texto = (content || "").trim();
    const url = (link || "").trim();
    if (texto.length < 20) throw new Error("Descreva sua entrega com pelo menos 20 caracteres.");
    if (texto.length > 4000) throw new Error("Sua descrição passou de 4000 caracteres.");
    if (url && !/^https?:\/\/\S+$/i.test(url)) throw new Error("O link precisa começar com http:// ou https://");
    if (url.length > 500) throw new Error("Link muito longo.");

    const { data: challenge } = await admin
      .from("ku_challenges").select("id, published").eq("id", challengeId).maybeSingle();
    if (!challenge?.published) throw new Error("Este desafio não está aberto.");

    // Entrega aprovada já virou evidência e não pode ser reescrita.
    const { data: existing } = await admin
      .from("ku_challenge_submissions").select("id, status")
      .eq("challenge_id", challengeId).eq("user_id", user.id).maybeSingle();
    if (existing?.status === "approved") throw new Error("Esta entrega já foi aprovada.");

    const row = {
      challenge_id: challengeId, user_id: user.id, content: texto, link: url || null,
      status: "pending" as const, quality: null, feedback: null,
      reviewed_by: null, reviewed_at: null, updated_at: new Date().toISOString(),
    };
    const { error } = await admin
      .from("ku_challenge_submissions").upsert(row, { onConflict: "challenge_id,user_id" });
    if (error) throw new Error(error.message);

    revalidatePath("/conta/desafios");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Não consegui enviar." };
  }
}
