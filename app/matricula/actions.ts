"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderNotice } from "@/lib/email";
import { avisarTime } from "@/lib/notificacoes";
import { aplicarCupom, type Plano } from "@/lib/cupons";

export type MatriculaResult =
  | { ok: true; mode: "asaas"; url: string }
  | { ok: true; mode: "manual"; whatsapp: string | null }
  | { ok: false; error: string };

const ASAAS_BASE = process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";

export type PreviaCupom =
  | { ok: true; codigo: string; original: number; desconto: number; final: number; recorrente: boolean; rotulo: string }
  | { ok: false; erro: string };

/* Prévia do cupom para o botão Aplicar. Lê os preços do banco, igual à
   cobrança, e devolve o valor final. Na hora de pagar a validação roda de novo. */
export async function previewCupom(codigo: string, plano: Plano, email: string): Promise<PreviaCupom> {
  const admin = createAdminClient();
  const { data: cfg } = await admin.from("site_settings").select("key, value").in("key", ["sub_price", "sub_price_annual", "full_access_price"]);
  const map = Object.fromEntries((cfg ?? []).map((r: any) => [r.key, r.value]));
  const mensal = Number(map.sub_price || map.full_access_price || "0") || 0;
  const anual = Number(map.sub_price_annual || "0") || 0;
  const preco = plano === "anual" && anual > 0 ? anual : mensal;
  if (preco <= 0) return { ok: false, erro: "A assinatura ainda não foi configurada." };
  const r = await aplicarCupom(admin, codigo, plano === "anual" && anual > 0 ? "anual" : "mensal", email, preco);
  return r.ok ? r : { ok: false, erro: r.erro };
}

// Matrícula = ASSINATURA mensal (acesso full enquanto pagar), só cartão de crédito.
// A conta do aluno só é criada DEPOIS que o pagamento é confirmado (no webhook).
export async function createMatricula(formData: FormData): Promise<MatriculaResult> {
  const name = ((formData.get("name") as string) || "").trim();
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const phone = ((formData.get("phone") as string) || "").replace(/\D/g, "");
  const cpf = ((formData.get("cpf") as string) || "").replace(/\D/g, "");
  const plano = formData.get("plano") === "anual" ? "anual" : "mensal";
  // Anual só em Pix ou cartão. Qualquer outro valor vindo do navegador vira Pix.
  const forma = formData.get("forma") === "cartao" ? "cartao" : "pix";
  const cupomDigitado = ((formData.get("cupom") as string) || "").trim();

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
    .in("key", ["sub_price", "sub_price_annual", "full_access_price", "sales_open", "checkout_whatsapp"]);
  const map = Object.fromEntries((cfg ?? []).map((r: any) => [r.key, r.value]));

  if (map.sales_open !== "1") return { ok: false, error: "As matrículas estão fechadas no momento." };

  const mensal = Number(map.sub_price || map.full_access_price || "0") || 0;
  const anual = Number(map.sub_price_annual || "0") || 0;
  // O preço sai sempre do banco, nunca do navegador. Anual sem preço
  // configurado vira mensal em vez de gerar cobrança de zero.
  const ehAnual = plano === "anual" && anual > 0;
  const cheio = ehAnual ? anual : mensal;
  if (process.env.ASAAS_API_KEY && cheio <= 0) return { ok: false, error: "A assinatura ainda não foi configurada. Fale com o suporte." };

  // Cupom validado de novo aqui, com o e-mail e o plano reais do pedido.
  let cupom: Awaited<ReturnType<typeof aplicarCupom>> | null = null;
  if (cupomDigitado) {
    cupom = await aplicarCupom(admin, cupomDigitado, ehAnual ? "anual" : "mensal", email, cheio);
    if (!cupom.ok) return { ok: false, error: cupom.erro };
  }
  const comCupom = cupom && cupom.ok ? cupom : null;
  // Anual: paga o valor com desconto. Mensal: a primeira cobrança sai com
  // desconto; as seguintes também, só se o cupom valer para todas.
  const price = comCupom ? comCupom.final : cheio;
  const valorAssinatura = comCupom && comCupom.recorrente ? comCupom.final : cheio;
  const primeiraCobranca = comCupom && !comCupom.recorrente && !ehAnual ? comCupom.final : undefined;

  const { data: order, error } = await admin
    .from("orders")
    .insert({ email, name, phone: phone || null, product: ehAnual ? "subscription_annual" : "subscription", amount: price, original_amount: comCupom ? cheio : null, discount_amount: comCupom ? comCupom.desconto : null, coupon_code: comCupom ? comCupom.codigo : null, status: "pending", gateway: process.env.ASAAS_API_KEY ? "asaas" : "manual" })
    .select("id")
    .single();
  if (error) return { ok: false, error: "Não foi possível registrar agora. Tente de novo." };

  // Aviso ao time: liga, desliga e destinatários em Admin > Sistema > Notificações.
  await avisarTime("pedido", (para) => sendOrderNotice(para, { name, email, phone, amount: price }));

  if (process.env.ASAAS_API_KEY) {
    const url = ehAnual
      ? await createAsaasAnnualPayment(admin, { orderId: order.id, name, email, phone, cpf, price, address, forma })
      : await createAsaasSubscription(admin, { orderId: order.id, name, email, phone, cpf, price: valorAssinatura, address, primeiraCobranca });
    if (url) return { ok: true, mode: "asaas", url };
  }
  return { ok: true, mode: "manual", whatsapp: map.checkout_whatsapp || null };
}

type Address = { postalCode: string; address: string; addressNumber: string; province: string };

// Cria cliente + ASSINATURA mensal no cartão e devolve o link de pagamento da 1ª cobrança.
async function createAsaasSubscription(
  admin: ReturnType<typeof createAdminClient>,
  { orderId, name, email, phone, cpf, price, address, primeiraCobranca }: { orderId: string; name: string; email: string; phone: string; cpf: string; price: number; address: Address; primeiraCobranca?: number }
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
    // Cupom só da primeira mensalidade: a assinatura segue no valor cheio e só a
    // primeira cobrança recebe o desconto.
    const primeira = pays?.data?.[0];
    if (primeiraCobranca && primeira?.id) {
      await fetch(`${ASAAS_BASE}/payments/${primeira.id}`, { method: "POST", headers, body: JSON.stringify({ value: primeiraCobranca }) });
    }
    return (pays?.data?.[0]?.invoiceUrl as string) || null;
  } catch {
    return null;
  }
}

/* Plano anual: cobrança única, sem recorrência, só em Pix ou cartão de crédito.
   A forma vem do formulário porque o Asaas não tem uma cobrança que aceite só
   essas duas: ou é uma forma, ou são todas, e todas inclui boleto. A referência "anual:" faz o webhook liberar
   12 meses de acesso quando o pagamento confirmar. */
async function createAsaasAnnualPayment(
  admin: ReturnType<typeof createAdminClient>,
  { orderId, name, email, phone, cpf, price, address, forma }: { orderId: string; name: string; email: string; phone: string; cpf: string; price: number; address: Address; forma: "pix" | "cartao" }
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

    const due = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
    const payRes = await fetch(`${ASAAS_BASE}/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        customer: cust.id,
        billingType: forma === "cartao" ? "CREDIT_CARD" : "PIX",
        value: price,
        dueDate: due,
        description: "DriveData Academy · plano anual (12 meses)",
        externalReference: `anual:${orderId}`,
      }),
    });
    const pay = await payRes.json();
    if (!payRes.ok || !pay?.id) return null;

    await admin.from("orders").update({ gateway_id: pay.id, external_reference: `anual:${orderId}` }).eq("id", orderId);
    return (pay.invoiceUrl as string) || null;
  } catch {
    return null;
  }
}
