"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderNotice } from "@/lib/email";

export type MatriculaResult =
  | { ok: true; mode: "asaas"; url: string }
  | { ok: true; mode: "manual"; whatsapp: string | null }
  | { ok: false; error: string };

const ASAAS_BASE = process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";

// Matrícula = ASSINATURA mensal (acesso full enquanto pagar), só cartão de crédito.
// A conta do aluno só é criada DEPOIS que o pagamento é confirmado (no webhook).
export async function createMatricula(formData: FormData): Promise<MatriculaResult> {
  const name = ((formData.get("name") as string) || "").trim();
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const phone = ((formData.get("phone") as string) || "").replace(/\D/g, "");
  const cpf = ((formData.get("cpf") as string) || "").replace(/\D/g, "");

  const address = {
    postalCode: ((formData.get("cep") as string) || "").replace(/\D/g, ""),
    address: ((formData.get("endereco") as string) || "").trim(),
    addressNumber: ((formData.get("numero") as string) || "").trim(),
    province: ((formData.get("bairro") as string) || "").trim(),
  };

  if (!name || !email) return { ok: false, error: "Preencha nome e e-mail." };
  if (process.env.ASAAS_API_KEY && cpf.length !== 11) return { ok: false, error: "Informe um CPF válido (11 dígitos) para a assinatura no cartão." };

  const admin = createAdminClient();

  const { data: cfg } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", ["sub_price", "full_access_price", "sales_open", "checkout_whatsapp"]);
  const map = Object.fromEntries((cfg ?? []).map((r: any) => [r.key, r.value]));

  if (map.sales_open !== "1") return { ok: false, error: "As matrículas estão fechadas no momento." };

  const price = Number(map.sub_price || map.full_access_price || "0") || 0;
  if (process.env.ASAAS_API_KEY && price <= 0) return { ok: false, error: "A assinatura ainda não foi configurada. Fale com o suporte." };

  const { data: order, error } = await admin
    .from("orders")
    .insert({ email, name, phone: phone || null, product: "subscription", amount: price, status: "pending", gateway: process.env.ASAAS_API_KEY ? "asaas" : "manual" })
    .select("id")
    .single();
  if (error) return { ok: false, error: "Não foi possível registrar agora. Tente de novo." };

  const adminEmail = (process.env.ADMIN_EMAILS || "").split(",")[0]?.trim();
  if (adminEmail) await sendOrderNotice(adminEmail, { name, email, phone, amount: price });

  if (process.env.ASAAS_API_KEY) {
    const url = await createAsaasSubscription(admin, { orderId: order.id, name, email, phone, cpf, price, address });
    if (url) return { ok: true, mode: "asaas", url };
  }
  return { ok: true, mode: "manual", whatsapp: map.checkout_whatsapp || null };
}

type Address = { postalCode: string; address: string; addressNumber: string; province: string };

// Cria cliente + ASSINATURA mensal no cartão e devolve o link de pagamento da 1ª cobrança.
async function createAsaasSubscription(
  admin: ReturnType<typeof createAdminClient>,
  { orderId, name, email, phone, cpf, price, address }: { orderId: string; name: string; email: string; phone: string; cpf: string; price: number; address: Address }
): Promise<string | null> {
  const key = process.env.ASAAS_API_KEY!;
  const headers = { access_token: key, "Content-Type": "application/json" };
  try {
    const validPhone = /^\d{10,11}$/.test(phone) && !/^(\d)\1+$/.test(phone) ? phone : undefined;
    const custRes = await fetch(`${ASAAS_BASE}/customers`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name, email, cpfCnpj: cpf, mobilePhone: validPhone, externalReference: email,
        postalCode: address.postalCode || undefined,
        address: address.address || undefined,
        addressNumber: address.addressNumber || undefined,
        province: address.province || undefined,
      }),
    });
    const cust = await custRes.json();
    if (!custRes.ok || !cust?.id) return null;

    // Assinatura mensal no CARTÃO (recorrência automática). externalReference liga ao pedido.
    const next = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
    const subRes = await fetch(`${ASAAS_BASE}/subscriptions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        customer: cust.id,
        billingType: "CREDIT_CARD",
        value: price,
        nextDueDate: next,
        cycle: "MONTHLY",
        description: "Assinatura DriveData Academy",
        externalReference: `sub:${orderId}`,
      }),
    });
    const sub = await subRes.json();
    if (!subRes.ok || !sub?.id) return null;

    await admin.from("orders").update({ gateway_id: sub.id, external_reference: `sub:${orderId}` }).eq("id", orderId);

    const payRes = await fetch(`${ASAAS_BASE}/subscriptions/${sub.id}/payments`, { headers });
    const pays = await payRes.json();
    return (pays?.data?.[0]?.invoiceUrl as string) || null;
  } catch {
    return null;
  }
}
