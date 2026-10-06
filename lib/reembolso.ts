import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/* Reembolso feito no Asaas vira reembolso aqui.

   O pedido passa a "refunded" (sai do "Recebido" e do "Pago sem acesso") e o
   acesso que ele comprou é cortado na hora: a assinatura fica cancelada com
   expires_at = agora; o treinamento comprado perde a matrícula de compra.

   Chamado pelo webhook (PAYMENT_REFUNDED e PAYMENT_CHARGEBACK_REQUESTED) e pelo
   botão "Conferir reembolsos no Asaas" em Admin > Cancelamentos, para os
   reembolsos anteriores a este código, que o webhook ignorava. */

const PRODUTOS_DE_ASSINATURA = ["subscription", "subscription_annual", "full_access"];

export async function registrarReembolso(admin: SupabaseClient, order: any): Promise<boolean> {
  if (!order || order.status === "refunded") return false;
  await admin.from("orders").update({ status: "refunded" }).eq("id", order.id);
  if (order.user_id && PRODUTOS_DE_ASSINATURA.includes(order.product)) {
    await admin
      .from("memberships")
      .update({ status: "canceled", expires_at: new Date().toISOString() })
      .eq("user_id", order.user_id)
      .in("source", ["subscription", "annual"]);
  }
  if (order.user_id && order.product === "curso" && order.course_id) {
    await admin.from("enrollments").delete().eq("user_id", order.user_id).eq("course_id", order.course_id).eq("source", "compra");
  }
  return true;
}

/** Acha o pedido de uma cobrança do Asaas: pela nossa referência, pela cobrança ou pela assinatura. */
export async function pedidoDaCobranca(admin: SupabaseClient, payment: any): Promise<any | null> {
  const ref = String(payment?.externalReference || "");
  const id = ref.includes(":") ? ref.split(":")[1] : ref;
  if (/^[0-9a-f-]{36}$/i.test(id)) {
    const { data } = await admin.from("orders").select("*").eq("id", id).maybeSingle();
    if (data) return data;
  }
  if (payment?.id) {
    const { data } = await admin.from("orders").select("*").eq("gateway_id", payment.id).maybeSingle();
    if (data) return data;
  }
  if (payment?.subscription) {
    const { data } = await admin
      .from("orders")
      .select("*")
      .eq("asaas_subscription_id", payment.subscription)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

/** A cobrança foi reembolsada no Asaas? Só leitura: o reembolso em si é feito no painel do Asaas. */
export async function reembolsadaNoAsaas(paymentId: string): Promise<boolean | null> {
  const chave = process.env.ASAAS_API_KEY;
  if (!chave || !paymentId.startsWith("pay_")) return null;
  const base = process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";
  try {
    const r = await fetch(`${base}/payments/${paymentId}`, { headers: { access_token: chave, "User-Agent": "drivedata-academy" }, cache: "no-store" });
    if (!r.ok) return null;
    const p = await r.json();
    return p?.status === "REFUNDED" || (p?.refunds ?? []).some((x: any) => x?.status === "DONE");
  } catch {
    return null;
  }
}

/* Pede ao Asaas o reembolso integral da cobrança.

   Só a ação "Pedir reembolso" do aluno chama isto, e só dentro do prazo de
   7 dias úteis (conferido de novo no servidor). Parcelado no cartão devolve
   pelo parcelamento inteiro; à vista, pela cobrança. Devolve o que aconteceu
   em vez de lançar erro: quem decide o que mostrar é a ação. */
export async function reembolsarNoAsaas(paymentId: string): Promise<{ ok: boolean; resposta: string }> {
  const chave = process.env.ASAAS_API_KEY;
  if (!chave) return { ok: false, resposta: "ASAAS_API_KEY não configurada" };
  const base = process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";
  const h = { access_token: chave, "User-Agent": "drivedata-academy", "Content-Type": "application/json" };
  try {
    const consulta = await fetch(`${base}/payments/${paymentId}`, { headers: h, cache: "no-store" });
    if (!consulta.ok) return { ok: false, resposta: `consulta ${consulta.status} ${(await consulta.text()).slice(0, 200)}` };
    const pagamento = await consulta.json();
    if (pagamento?.status === "REFUNDED") return { ok: true, resposta: "já estava reembolsada no Asaas" };
    const caminho = pagamento?.installment ? `/installments/${pagamento.installment}/refund` : `/payments/${paymentId}/refund`;
    const r = await fetch(`${base}${caminho}`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({ description: "Reembolso pedido pelo aluno dentro de 7 dias úteis da compra" }),
      cache: "no-store",
    });
    const corpo = await r.text();
    return { ok: r.ok, resposta: `${r.status} ${corpo.slice(0, 300)}` };
  } catch (e: any) {
    return { ok: false, resposta: `sem resposta do Asaas: ${String(e?.message || e).slice(0, 200)}` };
  }
}
