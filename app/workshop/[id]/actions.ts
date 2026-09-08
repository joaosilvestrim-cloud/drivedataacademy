"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type BuyResult =
  | { ok: true; mode: "asaas"; url: string }
  | { ok: true; mode: "manual"; whatsapp: string | null }
  | { ok: false; error: string };

const ASAAS_BASE = process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";

export async function createWorkshopOrder(formData: FormData): Promise<BuyResult> {
  const eventId = (formData.get("event_id") as string) || "";
  const name = ((formData.get("name") as string) || "").trim();
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const phone = ((formData.get("phone") as string) || "").replace(/\D/g, "");
  const cpf = ((formData.get("cpf") as string) || "").replace(/\D/g, "");
  if (!name || !email) return { ok: false, error: "Preencha nome e e-mail." };
  if (process.env.ASAAS_API_KEY && cpf.length !== 11) return { ok: false, error: "Informe um CPF válido (11 dígitos)." };

  const admin = createAdminClient();
  const { data: ev } = await admin.from("live_events").select("id, title, price, starts_at, published").eq("id", eventId).maybeSingle();
  if (!ev || !ev.published || !(Number(ev.price) > 0)) return { ok: false, error: "Este workshop não está disponível para compra." };

  const { data: cfg } = await admin.from("site_settings").select("value").eq("key", "checkout_whatsapp").maybeSingle();

  const { data: order, error } = await admin
    .from("orders")
    .insert({ email, name, phone: phone || null, product: "workshop", event_id: eventId, amount: Number(ev.price), status: "pending", gateway: process.env.ASAAS_API_KEY ? "asaas" : "manual" })
    .select("id")
    .single();
  if (error) return { ok: false, error: "Não foi possível registrar. Tente de novo." };

  if (process.env.ASAAS_API_KEY) {
    const url = await createAsaasPayment({ orderId: order.id, name, email, phone, cpf, amount: Number(ev.price), description: `Workshop: ${ev.title}` });
    if (url) return { ok: true, mode: "asaas", url };
  }
  return { ok: true, mode: "manual", whatsapp: cfg?.value || null };
}

async function createAsaasPayment(
  { orderId, name, email, phone, cpf, amount, description }: { orderId: string; name: string; email: string; phone: string; cpf: string; amount: number; description: string }
): Promise<string | null> {
  const key = process.env.ASAAS_API_KEY!;
  const headers = { access_token: key, "Content-Type": "application/json" };
  const admin = createAdminClient();
  try {
    const validPhone = /^\d{10,11}$/.test(phone) && !/^(\d)\1+$/.test(phone) ? phone : undefined;
    const custRes = await fetch(`${ASAAS_BASE}/customers`, { method: "POST", headers, body: JSON.stringify({ name, email, cpfCnpj: cpf, mobilePhone: validPhone, externalReference: email }) });
    const cust = await custRes.json();
    if (!custRes.ok || !cust?.id) return null;
    const due = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
    const payRes = await fetch(`${ASAAS_BASE}/payments`, { method: "POST", headers, body: JSON.stringify({ customer: cust.id, billingType: "UNDEFINED", value: amount, dueDate: due, externalReference: orderId, description }) });
    const pay = await payRes.json();
    if (!payRes.ok || !pay?.invoiceUrl) return null;
    await admin.from("orders").update({ gateway_id: pay.id, external_reference: orderId }).eq("id", orderId);
    return pay.invoiceUrl as string;
  } catch {
    return null;
  }
}
