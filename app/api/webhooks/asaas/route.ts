import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAccessGrantedEmail } from "@/lib/email";

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

  if (!paidEvents.includes(event)) {
    return NextResponse.json({ ok: true, ignored: event });
  }

  const admin = createAdminClient();

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

  // Libera acesso full por 12 meses (ajuste a validade conforme a turma).
  if (order.user_id) {
    // evita duplicar acesso se o Asaas reenviar o webhook
    const { data: existing } = await admin
      .from("memberships")
      .select("id")
      .eq("user_id", order.user_id)
      .eq("status", "active")
      .limit(1);

    if (!existing?.length) {
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      await admin.from("memberships").insert({
        user_id: order.user_id,
        plan: "full",
        status: "active",
        source: "asaas",
        expires_at: expires.toISOString(),
      });
      if (order.email) {
        const { data: prof } = await admin.from("profiles").select("full_name").eq("id", order.user_id).maybeSingle();
        await sendAccessGrantedEmail(order.email, prof?.full_name || "", SITE_URL);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
