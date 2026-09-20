"use server";

import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/* Upload de imagem do admin, em um lugar só.

   O navegador sobe direto para o Storage por uma URL assinada aqui pelo
   servidor. Assim não passa pelo limite de corpo da Vercel e não depende de
   regra de RLS no bucket. O prefixo só serve para achar o arquivo depois
   ("live-...", "capa-...", "assinatura-..."). */
export async function assinarUploadDeImagem(ext: string, prefixo = "imagem") {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  const supabase = createAdminClient();
  const bucket = "covers";
  await supabase.storage.createBucket(bucket, { public: true }).catch(() => {});
  const limpo = (ext || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
  const nome = (prefixo || "imagem").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 20) || "imagem";
  const path = `${nome}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${limpo}`;
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, error: error?.message || "Não consegui preparar o upload." };
  return { ok: true as const, path: data.path, token: data.token };
}
