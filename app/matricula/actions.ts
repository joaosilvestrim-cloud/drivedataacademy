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

  if (!name || !email) return { ok: false, error: "Preencha nome e e-mail." };

  const admin = createAdminClient();

  // Config da turma
  const { data: cfg } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", ["full_access_price", "sales_open", "checkout_whatsapp"]);
  const map = Object.fromEntries((cfg ?? []).map((r: any) => [r.key, r.value]));

  if (map.sales_open !== "1") return { ok: false, error: "As matrículas estão fechadas no momento." };

  const amount = Number(map.full_access_price || "0") || null;
  const user_id = await findUserIdByEmail(admin, email);

  const { data: order, error } = await admin
    .from("orders")
    .insert({
      user_id,
      email,
      product: "full_access",
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
    const url = await createAsaasCheckout({ orderId: order.id, name, email, phone, amount });
    if (url) return { ok: true, mode: "asaas", url };
    // se falhar, cai no manual
  }

  return { ok: true, mode: "manual", whatsapp: map.checkout_whatsapp || null };
}

// Placeholder do checkout Asaas. Será implementado quando a chave estiver disponível.
// Deve criar cliente + cobrança e devolver a URL de pagamento (invoiceUrl).
async function createAsaasCheckout(_args: {
  orderId: string;
  name: string;
  email: string;
  phone: string;
  amount: number | null;
}): Promise<string | null> {
  return null;
}
