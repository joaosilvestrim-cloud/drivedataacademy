import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { grantOffer } from "@/lib/offers";
import { sendAccessGrantedEmail, sendAccountSetupEmail } from "@/lib/email";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");

/* Liberação de acesso a partir de um pedido pago. É o mesmo caminho do webhook
   do Asaas, reunido num lugar só para o painel de operação conseguir refazer
   qualquer etapa: criar a conta, dar a assinatura e mandar o código. Cada
   passo é idempotente: rodar duas vezes não duplica nada. */

export async function encontrarUsuarioPorEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  const alvo = (email || "").toLowerCase();
  const lookup = await admin.rpc("user_id_by_email", { p_email: alvo });
  if (!lookup.error) return (lookup.data as string | null) ?? null;
  let page = 1;
  for (let i = 0; i < 5; i++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const users = data?.users ?? [];
    const found = users.find((u: any) => (u.email || "").toLowerCase() === alvo);
    if (found) return found.id;
    if (users.length < 1000) break;
    page++;
  }
  return null;
}

/* Garante a conta do comprador. Devolve o id e se ela acabou de nascer. */
export async function garantirConta(admin: SupabaseClient, email: string, nome: string): Promise<{ userId: string | null; nova: boolean }> {
  let userId = await encontrarUsuarioPorEmail(admin, email);
  let nova = false;
  if (!userId) {
    const senha = "Dd" + Math.random().toString(36).slice(2, 10) + "!9";
    const { data } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { full_name: nome || "" } });
    userId = data?.user?.id ?? null;
    nova = !!userId;
  }
  if (userId && nome) await admin.from("profiles").upsert({ id: userId, full_name: nome }, { onConflict: "id" });
  return { userId, nova };
}

/* Dá a assinatura que o pedido comprou. Anual: 12 meses somados ao que resta.
   Mensal e acesso full: pela oferta da turma, ou full por 365 dias. */
export async function concederAssinatura(admin: SupabaseClient, userId: string, order: any): Promise<void> {
  if (order.product === "subscription_annual") {
    const ANO = 365 * 864e5;
    const { data: existing } = await admin.from("memberships").select("id, expires_at").eq("user_id", userId).eq("source", "annual").limit(1).maybeSingle();
    const base = existing?.expires_at && Date.parse(existing.expires_at) > Date.now() ? Date.parse(existing.expires_at) : Date.now();
    const expires = new Date(base + ANO).toISOString();
    if (existing) await admin.from("memberships").update({ status: "active", plan: "full", expires_at: expires }).eq("id", existing.id);
    else await admin.from("memberships").insert({ user_id: userId, plan: "full", status: "active", source: "annual", expires_at: expires });
  } else if (order.product === "curso") {
    if (order.course_id) await admin.from("enrollments").upsert({ user_id: userId, course_id: order.course_id, source: "compra" }, { onConflict: "user_id,course_id" });
    return;
  } else {
    let offer: any = { kind: "full_access", access_days: 365 };
    if (order.turma_id) {
      const { data: turma } = await admin.from("turmas").select("includes, course_ids, access_days").eq("id", order.turma_id).maybeSingle();
      if (turma) offer = turma.includes !== "selected" ? { kind: "full_access", access_days: turma.access_days || 365 } : { kind: "bundle", course_ids: turma.course_ids, access_days: turma.access_days };
    }
    await grantOffer(admin, userId, offer, order.turma_id ?? null);
  }
  await admin.from("user_badges").upsert({ user_id: userId, badge: "fundador" }, { onConflict: "user_id,badge" });
}

/* Código de acesso por e-mail, para primeiro login ou troca de senha. */
export async function enviarCodigoDeAcesso(admin: SupabaseClient, email: string, nome: string, orderId?: string | null) {
  const { data } = await admin.auth.admin.generateLink({ type: "recovery", email } as any);
  const codigo = ((data as any)?.properties?.email_otp as string) || "";
  return sendAccountSetupEmail(email, nome || "", codigo, orderId ?? null);
}

/* Tudo de uma vez, a partir de um pedido já marcado como pago. */
export async function liberarPedidoPago(admin: SupabaseClient, order: any): Promise<{ ok: boolean; passos: string[] }> {
  const passos: string[] = [];
  const email = (order.email || "").toLowerCase();
  if (!email) return { ok: false, passos: ["Pedido sem e-mail."] };

  let userId: string | null = order.user_id;
  let nova = false;
  if (!userId) {
    const r = await garantirConta(admin, email, order.name || "");
    userId = r.userId; nova = r.nova;
    if (userId) await admin.from("orders").update({ user_id: userId }).eq("id", order.id);
    passos.push(nova ? "Conta criada." : userId ? "Conta já existia." : "Não foi possível criar a conta.");
  }
  if (!userId) return { ok: false, passos };

  await concederAssinatura(admin, userId, order);
  passos.push(order.product === "curso" ? "Matrícula do treinamento liberada." : "Assinatura ativa.");

  const envio = nova
    ? await enviarCodigoDeAcesso(admin, email, order.name || "", order.id)
    : await sendAccessGrantedEmail(email, order.name || "", SITE_URL, order.id);
  passos.push(envio.sent ? (nova ? "Código de acesso enviado." : "E-mail de acesso liberado enviado.") : `E-mail não enviado (${envio.reason}).`);
  return { ok: true, passos };
}
