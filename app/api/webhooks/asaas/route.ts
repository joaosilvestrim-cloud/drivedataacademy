import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAccessGrantedEmail, sendAccountSetupEmail, sendWorkshopEmail } from "@/lib/email";
import { grantOffer } from "@/lib/offers";

async function findUserIdByEmail(admin: ReturnType<typeof createAdminClient>, email: string): Promise<string | null> {
  const target = (email || "").toLowerCase();
  // Busca direta no banco; se a função ainda não existir, cai no modo antigo.
  const lookup = await admin.rpc("user_id_by_email", { p_email: target });
  if (!lookup.error) return (lookup.data as string | null) ?? null;
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

  // Assinatura da plataforma (matrícula recorrente). externalReference = "sub:<orderId>"
  if (extRef.startsWith("sub:")) {
    const orderId = extRef.slice(4);
    const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (!order) return NextResponse.json({ ok: true, note: "pedido não encontrado" });

    if (paidEvents.includes(event)) {
      await admin.from("orders").update({ status: "paid", gateway_id: payment.id ?? order.gateway_id }).eq("id", order.id);

      // 1) Conta só nasce AGORA (após o pagamento). Cria se ainda não existir.
      let userId: string | null = order.user_id;
      let isNew = false;
      if (!userId) {
        userId = await findUserIdByEmail(admin, order.email);
        if (!userId) {
          const rand = "Dd" + Math.random().toString(36).slice(2, 10) + "!9";
          const { data: created } = await admin.auth.admin.createUser({ email: order.email, password: rand, email_confirm: true, user_metadata: { full_name: order.name || "" } });
          userId = created?.user?.id ?? null;
          isNew = true;
        }
        if (userId) await admin.from("orders").update({ user_id: userId }).eq("id", order.id);
      }

      if (userId) {
        if (order.name) await admin.from("profiles").upsert({ id: userId, full_name: order.name }, { onConflict: "id" });
        // 2) Acesso full enquanto a assinatura estiver ativa (renova ~35 dias a cada pagamento)
        const periodEnd = new Date(Date.now() + 35 * 864e5).toISOString();
        const { data: existing } = await admin.from("memberships").select("id").eq("user_id", userId).eq("source", "subscription").limit(1).maybeSingle();
        if (existing) await admin.from("memberships").update({ status: "active", plan: "full", expires_at: periodEnd }).eq("id", existing.id);
        else await admin.from("memberships").insert({ user_id: userId, plan: "full", status: "active", source: "subscription", expires_at: periodEnd });
        await admin.from("user_badges").upsert({ user_id: userId, badge: "fundador" }, { onConflict: "user_id,badge" });

        // 3) E-mail: conta nova -> define senha; conta já existente -> acesso liberado
        if (isNew) {
          const { data: link } = await admin.auth.admin.generateLink({ type: "recovery", email: order.email, options: { redirectTo: `${SITE_URL}/redefinir-senha` } } as any);
          const url = (link as any)?.properties?.action_link || `${SITE_URL}/esqueci-senha`;
          await sendAccountSetupEmail(order.email, order.name || "", url);
        } else {
          await sendAccessGrantedEmail(order.email, order.name || "", SITE_URL);
        }
      }
      return NextResponse.json({ ok: true, sub: "active" });
    }

    if (event === "PAYMENT_OVERDUE") {
      if (order.user_id) await admin.from("memberships").update({ status: "canceled" }).eq("user_id", order.user_id).eq("source", "subscription");
      return NextResponse.json({ ok: true, sub: "overdue" });
    }
    return NextResponse.json({ ok: true, ignored: event });
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

  const wasPaid = order.status === "paid";
  await admin.from("orders").update({ status: "paid", gateway_id: payment.id ?? order.gateway_id }).eq("id", order.id);

  // Workshop avulso: manda o link por e-mail, não libera acesso full.
  if (order.product === "workshop") {
    if (!wasPaid && order.event_id && order.email) {
      const { data: ev } = await admin.from("live_events").select("title, starts_at, url").eq("id", order.event_id).maybeSingle();
      if (ev) {
        const when = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(ev.starts_at));
        await sendWorkshopEmail(order.email, order.name || "", ev.title, when, ev.url || null);
      }
    }
    return NextResponse.json({ ok: true, workshop: true });
  }

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
