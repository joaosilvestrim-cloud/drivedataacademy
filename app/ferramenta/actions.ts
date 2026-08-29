"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AssinaturaResult =
  | { ok: true; mode: "asaas"; url: string }
  | { ok: true; mode: "manual"; whatsapp: string | null }
  | { ok: false; error: string };

const ASAAS_BASE = process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";

export async function assinarFerramenta(formData: FormData): Promise<AssinaturaResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Faça login para assinar." };

  const cpf = ((formData.get("cpf") as string) || "").replace(/\D/g, "");
  const phone = ((formData.get("phone") as string) || "").replace(/\D/g, "");
  if (process.env.ASAAS_API_KEY && cpf.length !== 11) return { ok: false, error: "Informe um CPF válido (11 dígitos)." };

  const admin = createAdminClient();
  const [{ data: profile }, { data: cfg }] = await Promise.all([
    admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    admin.from("site_settings").select("key, value").in("key", ["tool_price", "checkout_whatsapp"]),
  ]);
  const map = Object.fromEntries((cfg ?? []).map((r: any) => [r.key, r.value]));
  const price = Number(map.tool_price || "19.90") || 19.9;
  const name = profile?.full_name || (user.user_metadata as any)?.full_name || user.email || "Aluno";
  const email = user.email || "";

  // registra a assinatura como pendente (o webhook ativa quando o 1º pagamento cair)
  await admin.from("tool_subscriptions").upsert(
    { user_id: user.id, email, status: "pending", updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  ).select();

  if (process.env.ASAAS_API_KEY) {
    const url = await createAsaasSubscription({ userId: user.id, name, email, cpf, phone, price });
    if (url) return { ok: true, mode: "asaas", url };
  }
  return { ok: true, mode: "manual", whatsapp: map.checkout_whatsapp || null };
}

async function createAsaasSubscription(
  { userId, name, email, cpf, phone, price }: { userId: string; name: string; email: string; cpf: string; phone: string; price: number }
): Promise<string | null> {
  const key = process.env.ASAAS_API_KEY!;
  const headers = { access_token: key, "Content-Type": "application/json" };
  const admin = createAdminClient();
  try {
    const validPhone = /^\d{10,11}$/.test(phone) && !/^(\d)\1+$/.test(phone) ? phone : undefined;
    const custRes = await fetch(`${ASAAS_BASE}/customers`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name, email, cpfCnpj: cpf, mobilePhone: validPhone, externalReference: email }),
    });
    const cust = await custRes.json();
    if (!custRes.ok || !cust?.id) return null;

    // assinatura mensal; billingType UNDEFINED = o aluno escolhe Pix/cartão a cada cobrança
    const next = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
    const subRes = await fetch(`${ASAAS_BASE}/subscriptions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        customer: cust.id,
        billingType: "UNDEFINED",
        value: price,
        nextDueDate: next,
        cycle: "MONTHLY",
        description: "Ferramenta de Visuais - DriveData Academy",
        externalReference: `tool:${userId}`,
      }),
    });
    const sub = await subRes.json();
    if (!subRes.ok || !sub?.id) return null;

    await admin.from("tool_subscriptions").update({ asaas_subscription_id: sub.id, asaas_customer_id: cust.id, updated_at: new Date().toISOString() }).eq("user_id", userId);

    // pega o link de pagamento da 1ª cobrança da assinatura
    const payRes = await fetch(`${ASAAS_BASE}/subscriptions/${sub.id}/payments`, { headers });
    const pays = await payRes.json();
    const first = pays?.data?.[0];
    return (first?.invoiceUrl as string) || null;
  } catch {
    return null;
  }
}
