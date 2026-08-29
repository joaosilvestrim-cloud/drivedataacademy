import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAccessGrantedEmail } from "@/lib/email";
import { grantOffer } from "@/lib/offers";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Webhook do Asaas: confirma pagamento -> marca pedido pago -> libera acesso full.
// Configure no Asaas a URL: https://academy.drivedata.com.br/api/webhooks/asaas
// e o "Token de autenticação" igual ao env ASAAS_WEBHOOK_TOKEN.
export async function POST(req: Request) {
  const token = process.env.ASAAS_WEBHOOK_TOKEN;
  if (token) {
    const sent = req.headers.get("asaas-access-token");
    if (sent !== token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const event: string = body?.event || "";
  const payment = body?.payment || {};
  const paidEvents = ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"];

  const admin = createAdminClient();

  // Assinatura da Ferramenta de Visuais (externalReference = "tool:<userId>")
  const extRef = (payment.externalReference as string | undefined) || "";
  if (extRef.startsWith("tool:")) {
    const userId = extRef.slice(5);
    if (paidEvents.includes(event)) {
      // libera/renova por ~35 dias (cobre o mês + margem até a próxima cobrança)
      const periodEnd = new Date(Date.now() + 35 * 864e5).toISOString();
      await admin.from("tool_subscriptions").upsert(
        { user_id: userId, status: "active", current_period_end: periodEnd, asaas_subscription_id: payment.subscription ?? null, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    } else if (event === "PAYMENT_OVERDUE") {
      await admin.from("tool_subscriptions").update({ status: "overdue", updated_at: new Date().toISOString() }).eq("user_id", userId);
    }
    return NextResponse.json({ ok: true, tool: event });
  }

  if (!paidEvents.includes(event)) {
    return NextResponse.json({ ok: true, ignored: event });
  }

  // Localiza o pedido pela nossa referência ou pelo id da cobrança.
  const ref = payment.externalReference as string | undefined;
  let order: any = null;
  if (ref) {
    const { data } = await admin.from("orders").select("*").eq("id", ref).maybeSingle();
    order = data;
  }
  if (!order && payment.id) {
    const { data } = await admin.from("orders").select("*").eq("gateway_id", payment.id).maybeSingle();
    order = data;
  }
  if (!order) {
    return NextResponse.json({ ok: true, note: "pedido não encontrado" });
  }

  await admin.from("orders").update({ status: "paid", gateway_id: payment.id ?? order.gateway_id }).eq("id", order.id);

  // Libera o acesso conforme a turma do pedido (Full ou cursos selecionados). Sem turma, cai em Full.
  if (order.user_id && order.status !== "paid") {
    let offer: any = { kind: "full_access", access_days: 365 };
    let isFull = true;
    if (order.turma_id) {
      const { data: turma } = await admin.from("turmas").select("includes, course_ids, access_days").eq("id", order.turma_id).maybeSingle();
      if (turma) {
        isFull = turma.includes !== "selected";
        offer = isFull
          ? { kind: "full_access", access_days: turma.access_days || 365 }
          : { kind: "bundle", course_ids: turma.course_ids, access_days: turma.access_days };
      }
    }
    await grantOffer(admin, order.user_id, offer, order.turma_id ?? null);
    if (isFull) await admin.from("user_badges").upsert({ user_id: order.user_id, badge: "fundador" }, { onConflict: "user_id,badge" });
    if (order.email) {
      const { data: prof } = await admin.from("profiles").select("full_name").eq("id", order.user_id).maybeSingle();
      await sendAccessGrantedEmail(order.email, prof?.full_name || "", SITE_URL);
    }
  }

  return NextResponse.json({ ok: true });
}
