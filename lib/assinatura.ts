import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/* O que o aluno assina, do jeito que ele precisa ver.

   A informação está espalhada: o acesso vive em memberships, o dinheiro vive
   no pedido, e a recorrência vive no Asaas. Esta camada junta os três e
   devolve uma coisa só, para a tela não ter que saber disso.

   Sobre os dois planos:

   - Mensal é uma subscription do Asaas. Cancelar é um DELETE lá, e a partir
     daí não cobra mais.
   - Anual é cobrança única. Não existe recorrência para cancelar: ele
     simplesmente não renova. Dizer "cancelado" para o aluno nesse caso seria
     mentira, então a tela fala que o acesso vai até a data e acabou. */

const BASE = process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";

export type Assinatura = {
  ativa: boolean;
  plano: "mensal" | "anual" | "cortesia" | "turma" | null;
  rotulo: string;
  status: string;
  /* Até quando o acesso vale. null no mensal ativo, que renova sozinho. */
  acessoAte: string | null;
  valor: number | null;
  desde: string | null;
  orderId: string | null;
  asaasSubscriptionId: string | null;
  /* Tem recorrência para cancelar. Falso no anual e na cortesia. */
  recorrente: boolean;
  /* Já pediu cancelamento e ainda está no período pago. */
  cancelamentoPedidoEm: string | null;
};

const PRODUTOS_ASSINATURA = ["subscription", "subscription_annual", "full_access"];

function rotuloDoPlano(plano: Assinatura["plano"]): string {
  if (plano === "mensal") return "Assinatura mensal";
  if (plano === "anual") return "Assinatura anual";
  if (plano === "cortesia") return "Acesso cortesia";
  if (plano === "turma") return "Acesso por turma";
  return "Sem assinatura";
}

export async function assinaturaDoAluno(admin: SupabaseClient, userId: string): Promise<Assinatura> {
  const vazia: Assinatura = {
    ativa: false, plano: null, rotulo: rotuloDoPlano(null), status: "sem assinatura",
    acessoAte: null, valor: null, desde: null, orderId: null, asaasSubscriptionId: null,
    recorrente: false, cancelamentoPedidoEm: null,
  };

  const { data: m } = await admin
    .from("memberships")
    .select("plan, status, source, starts_at, expires_at, turma_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!m) return vazia;

  const agora = Date.now();
  const ativa = m.status === "active" && (!m.expires_at || Date.parse(m.expires_at) > agora);

  /* O pedido pago mais recente diz qual plano e quanto custa. O membership
     sozinho não guarda valor nem o id do Asaas. */
  const { data: pedidos } = await admin
    .from("orders")
    .select("id, product, amount, gateway, gateway_id, status, created_at")
    .eq("user_id", userId)
    .eq("status", "paid")
    .in("product", PRODUTOS_ASSINATURA)
    .order("created_at", { ascending: false })
    .limit(1);
  const pedido = pedidos?.[0] ?? null;

  let plano: Assinatura["plano"] = null;
  if (m.source === "subscription") plano = pedido?.product === "subscription_annual" ? "anual" : "mensal";
  else if (m.turma_id) plano = "turma";
  else plano = "cortesia";

  // Só a mensal no Asaas tem o que cancelar lá.
  const recorrente = plano === "mensal" && pedido?.gateway === "asaas" && !!pedido?.gateway_id;

  const { data: cancel } = await admin
    .from("subscription_cancellations")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    ativa,
    plano,
    rotulo: rotuloDoPlano(plano),
    status: ativa ? "ativa" : m.status === "canceled" ? "cancelada" : "expirada",
    acessoAte: m.expires_at ?? null,
    valor: pedido?.amount ?? null,
    desde: m.starts_at ?? pedido?.created_at ?? null,
    orderId: pedido?.id ?? null,
    asaasSubscriptionId: recorrente ? (pedido!.gateway_id as string) : null,
    recorrente,
    cancelamentoPedidoEm: cancel?.created_at ?? null,
  };
}

/* Cancela a recorrência no Asaas.

   Devolve o que aconteceu em vez de lançar erro: o pedido do aluno fica
   registrado de qualquer jeito, e o time precisa saber quais não saíram para
   cancelar na mão. */
export async function cancelarNoAsaas(subscriptionId: string): Promise<{ ok: boolean; resposta: string }> {
  const chave = process.env.ASAAS_API_KEY;
  if (!chave) return { ok: false, resposta: "ASAAS_API_KEY não configurada" };
  try {
    const r = await fetch(`${BASE}/subscriptions/${subscriptionId}`, {
      method: "DELETE",
      headers: { access_token: chave, "User-Agent": "drivedata-academy" },
      cache: "no-store",
    });
    const corpo = await r.text();
    // O Asaas devolve {"deleted": true} quando dá certo.
    let apagou = r.ok;
    try { apagou = r.ok && JSON.parse(corpo)?.deleted !== false; } catch { /* corpo não-JSON: vale o status */ }
    return { ok: apagou, resposta: `${r.status} ${corpo.slice(0, 300)}` };
  } catch (e: any) {
    return { ok: false, resposta: `sem resposta do Asaas: ${String(e?.message || e).slice(0, 200)}` };
  }
}
