"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { liberarPedidoPago, encontrarUsuarioPorEmail, enviarCodigoDeAcesso } from "@/lib/acesso";

const ASAAS_BASE = process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";

async function admin() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return createAdminClient();
}

function voltar(msg: string, erro = false): never {
  revalidatePath("/admin/operacao");
  redirect(`/admin/operacao?${erro ? "error" : "ok"}=${encodeURIComponent(msg)}#pagamentos`);
}

/* Refaz a liberação de um pedido pago: conta, assinatura e e-mail. Serve
   quando o webhook falhou no meio ou o e-mail não saiu. */
export async function liberarPedido(formData: FormData) {
  const supabase = await admin();
  const id = formData.get("id") as string;
  const { data: order } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (!order) voltar("Pedido não encontrado.", true);
  if (order!.status !== "paid") voltar("Este pedido ainda não está pago. Consulte o Asaas primeiro.", true);
  const r = await liberarPedidoPago(supabase, order);
  voltar(`${order!.email}: ${r.passos.join(" ")}`, !r.ok);
}

/* Pergunta ao Asaas o estado real da cobrança. Se já foi paga, marca o pedido
   e libera o acesso na hora, sem depender do webhook. */
export async function consultarAsaas(formData: FormData) {
  const supabase = await admin();
  const id = formData.get("id") as string;
  const key = process.env.ASAAS_API_KEY;
  if (!key) voltar("ASAAS_API_KEY não está configurada na Vercel.", true);
  const { data: order } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (!order) voltar("Pedido não encontrado.", true);
  if (!order!.gateway_id) voltar("Este pedido não tem cobrança no Asaas (não chegou a gerar pagamento).", true);

  const url = order!.product === "subscription" && String(order!.gateway_id).startsWith("sub_")
    ? `${ASAAS_BASE}/subscriptions/${order!.gateway_id}/payments?limit=1`
    : `${ASAAS_BASE}/payments/${order!.gateway_id}`;
  const res = await fetch(url, { headers: { access_token: key! }, cache: "no-store" });
  if (!res.ok) voltar(`Asaas respondeu ${res.status} para a cobrança ${order!.gateway_id}.`, true);
  const json = await res.json();
  const pagamento = Array.isArray(json?.data) ? json.data[0] : json;
  const status = String(pagamento?.status || "desconhecido");
  const pago = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(status);

  if (!pago) voltar(`Asaas: cobrança ${status}. Nada foi alterado.`);
  if (order!.status === "paid") voltar(`Asaas confirma pagamento (${status}) e o pedido já estava pago.`);

  await supabase.from("orders").update({ status: "paid" }).eq("id", order!.id);
  const r = await liberarPedidoPago(supabase, { ...order, status: "paid" });
  voltar(`Asaas confirmou (${status}). Pedido marcado como pago. ${r.passos.join(" ")}`, !r.ok);
}

/* Manda um código novo de acesso para o e-mail do pedido. */
export async function reenviarCodigo(formData: FormData) {
  const supabase = await admin();
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const nome = ((formData.get("nome") as string) || "").trim();
  const orderId = ((formData.get("order_id") as string) || "").trim() || null;
  if (!email) voltar("Informe o e-mail.", true);
  const userId = await encontrarUsuarioPorEmail(supabase, email);
  if (!userId) voltar(`${email} ainda não tem conta. Libere o pedido primeiro.`, true);
  const r = await enviarCodigoDeAcesso(supabase, email, nome, orderId);
  voltar(r.sent ? `Código enviado para ${email}.` : `Falha ao enviar para ${email} (${r.reason}).`, !r.sent);
}
