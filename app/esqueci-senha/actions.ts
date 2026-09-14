"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendAccessCodeEmail } from "@/lib/email";

/* Envia um código de acesso por email. Serve para o primeiro acesso e para
   trocar a senha. Código em vez de link: filtros como o do Outlook abrem os
   links antes da pessoa e gastam o token de uso único. Um código digitado não
   se gasta sozinho.

   Para email sem conta a resposta é a mesma de sucesso, para não revelar
   quem está cadastrado. */
export async function enviarCodigoAcesso(emailRaw: string): Promise<{ ok: boolean; error?: string }> {
  const email = (emailRaw || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "Informe um e-mail válido." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
  if (error) return { ok: true };

  const codigo = (data as any)?.properties?.email_otp as string | undefined;
  if (!codigo) return { ok: false, error: "Não conseguimos gerar o código agora. Tente de novo em instantes." };

  const envio = await sendAccessCodeEmail(email, codigo);
  if (!envio.sent) return { ok: false, error: "Não conseguimos enviar o e-mail agora. Tente de novo em instantes." };
  return { ok: true };
}
