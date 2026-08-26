"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderNotice } from "@/lib/email";

export type MatriculaResult =
  | { ok: true; mode: "asaas"; url: string }
  | { ok: true; mode: "manual"; whatsapp: string | null }
  | { ok: false; error: string };

async function findUserIdByEmail(admin: ReturnType<typeof createAdminClient>, email: string): Promise<string | null> {
  const target = email.toLowerCase();
  let page = 1;
  for (let i = 0; i < 5; i++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const users = data?.users ?? [];
    const found = users.find((u: any) => (u.email || "").toLowerCase() === target);
    if (found) return found.id;
    if (users.length < 1000) break;
    page++;
  }
  return null;
}

export async function createMatricula(formData: FormData): Promise<MatriculaResult> {
  const name = ((formData.get("name") as string) || "").trim();
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const phone = ((formData.get("phone") as string) || "").replace(/\D/g, "");
  const cpf = ((formData.get("cpf") as string) || "").replace(/\D/g, "");

  if (!name || !email) return { ok: false, error: "Preencha nome e e-mail." };
  if (process.env.ASAAS_API_KEY && cpf.length !== 11) return { ok: false, error: "Informe um CPF válido (11 dígitos) para gerar o pagamento." };

  const admin = createAdminClient();

  // Config da turma
  const { data: cfg } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", ["full_access_price", "sales_open", "checkout_whatsapp"]);
  const map = Object.fromEntries((cfg ?? []).map((r: any) => [r.key, r.value]));

  // Preço, formas e o que inclui vêm da TURMA marcada para venda online.
  const { data: turma } = await admin
    .from("turmas")
    .select("id, name, description, price, methods")
    .eq("status", "open")
    .eq("online_sale", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (map.sales_open !== "1" && !turma) return { ok: false, error: "As matrículas estão fechadas no momento." };

  const amount = turma ? Number(turma.price) : Number(map.full_access_price || "0") || null;
  const methods = turma?.methods || "pix,card,boleto";
  const description = turma?.description || turma?.name || "Acesso Full - DriveData Academy";
  const user_id = await findUserIdByEmail(admin, email);

  const { data: order, error } = await admin
    .from("orders")
    .insert({
      user_id,
      email,
      product: "full_access",
      turma_id: turma?.id ?? null,
      amount,
      status: "pending",
      gateway: process.env.ASAAS_API_KEY ? "asaas" : "manual",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: "Não foi possível registrar agora. Tente de novo." };

  // Aviso interno (silencioso se Resend não estiver configurado)
  const adminEmail = (process.env.ADMIN_EMAILS || "").split(",")[0]?.trim();
  if (adminEmail) await sendOrderNotice(adminEmail, { name, email, phone, amount });

  // Pagamento automático: ligado quando ASAAS_API_KEY existir (a cobrança é criada aqui).
  // Por enquanto, fluxo manual orientado por WhatsApp.
  if (process.env.ASAAS_API_KEY) {
    const res = await createAsaasCheckout(admin, { orderId: order.id, name, email, phone, cpf, amount, methods, description });
    if (res) return { ok: true, mode: "asaas", url: res };
    // se falhar, cai no manual
  }

  return { ok: true, mode: "manual", whatsapp: map.checkout_whatsapp || null };
}

const ASAAS_BASE = process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";

function billingTypeFrom(methods: string): string {
  const set = (methods || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (set.length === 1) return set[0] === "pix" ? "PIX" : set[0] === "card" ? "CREDIT_CARD" : set[0] === "boleto" ? "BOLETO" : "UNDEFINED";
  return "UNDEFINED"; // várias formas: o aluno escolhe na tela do Asaas
}

// Cria cliente + cobrança no Asaas e devolve a invoiceUrl (página de pagamento).
async function createAsaasCheckout(
  admin: ReturnType<typeof createAdminClient>,
  { orderId, name, email, phone, cpf, amount, methods, description }: { orderId: string; name: string; email: string; phone: string; cpf: string; amount: number | null; methods: string; description: string }
): Promise<string | null> {
  const key = process.env.ASAAS_API_KEY!;
  const headers = { access_token: key, "Content-Type": "application/json" };
  try {
    // 1) cliente (telefone só se parecer válido, senão o Asaas rejeita)
    const validPhone = /^\d{10,11}$/.test(phone) && !/^(\d)\1+$/.test(phone) ? phone : undefined;
    const custRes = await fetch(`${ASAAS_BASE}/customers`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name, email, cpfCnpj: cpf, mobilePhone: validPhone, externalReference: email }),
    });
    const cust = await custRes.json();
    if (!custRes.ok || !cust?.id) return null;

    // 2) cobrança (billingType UNDEFINED = o pagador escolhe PIX/cartão/boleto)
    const due = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
    const payRes = await fetch(`${ASAAS_BASE}/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        customer: cust.id,
        billingType: billingTypeFrom(methods),
        value: amount ?? 0,
        dueDate: due,
        externalReference: orderId,
        description,
      }),
    });
    const pay = await payRes.json();
    if (!payRes.ok || !pay?.invoiceUrl) return null;

    await admin.from("orders").update({ gateway_id: pay.id, external_reference: orderId }).eq("id", orderId);
    return pay.invoiceUrl as string;
  } catch {
    return null;
  }
}
