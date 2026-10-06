import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { acessoVigente } from "./acesso-vigente";
import { prazoDeReembolso } from "./dias-uteis";

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
  /* Direito de arrependimento: reembolso integral em até 7 dias úteis depois
     da compra (lib/dias-uteis.ts). Passado o prazo, some e fica só cancelar. */
  reembolso: { pode: boolean; ate: string | null; pagamentoId: string | null };
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
    recorrente: false, cancelamentoPedidoEm: null, reembolso: { pode: false, ate: null, pagamentoId: null },
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
  // Cancelada com o mês pago correndo continua ativa para o acesso (lib/acesso-vigente.ts).
  const ativa = acessoVigente(m, agora);

  /* O pedido pago mais recente diz qual plano e quanto custa. O membership
     sozinho não guarda valor nem o id do Asaas. */
  const { data: pedidos } = await admin
    .from("orders")
    .select("id, product, amount, gateway, gateway_id, asaas_subscription_id, status, created_at")
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

  /* O id da assinatura, com rede de segurança.

     Durante um tempo o webhook sobrescreveu gateway_id com o id da COBRANÇA,
     e o cancelamento saiu chamando DELETE /subscriptions/pay_..., que devolve
     404. Pedido antigo ainda carrega esse estrago, então só vale como
     assinatura o que tem cara de assinatura. */
  const idAssinatura =
    (pedido?.asaas_subscription_id as string | null) ||
    (String(pedido?.gateway_id || "").startsWith("sub_") ? (pedido!.gateway_id as string) : null);

  // Só a mensal no Asaas tem o que cancelar lá.
  const recorrente = plano === "mensal" && pedido?.gateway === "asaas" && !!idAssinatura;

  // Só vale o cancelamento desta compra: quem saiu e assinou de novo não pode
  // ficar sem o botão por causa do cancelamento antigo.
  const { data: cancel } = await admin
    .from("subscription_cancellations")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", pedido?.created_at || m.starts_at || "1970-01-01")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  /* O prazo conta da compra (o pedido nasce na primeira cobrança; renovação
     só troca gateway_id). Precisa de cobrança do Asaas para devolver. */
  const pagamentoId = String(pedido?.gateway_id || "").startsWith("pay_") ? (pedido!.gateway_id as string) : null;
  const prazo = pedido ? prazoDeReembolso(pedido.created_at) : null;
  const reembolso = {
    pode: !!(ativa && pedido && pedido.gateway === "asaas" && pagamentoId && prazo?.dentro && (plano === "mensal" || plano === "anual")),
    ate: prazo?.ultimo ?? null,
    pagamentoId,
  };

  return {
    ativa,
    plano,
    rotulo: rotuloDoPlano(plano),
    status: m.status === "canceled" && ativa ? "cancelada" : ativa ? "ativa" : "expirada",
    acessoAte: m.expires_at ?? null,
    valor: pedido?.amount ?? null,
    desde: m.starts_at ?? pedido?.created_at ?? null,
    orderId: pedido?.id ?? null,
    asaasSubscriptionId: idAssinatura,
    recorrente,
    cancelamentoPedidoEm: cancel?.created_at ?? null,
    reembolso,
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

/* Confere no Asaas se ainda existe cobrança recorrente para um e-mail.

   Serve ao cancelamento que falhou e foi resolvido à mão no painel do Asaas:
   o alerta só sai da fila quando o Asaas confirma que não sobrou nenhuma
   assinatura ativa para aquele cliente. Olha todos os clientes com o e-mail,
   porque o mesmo aluno pode ter sido cadastrado duas vezes. */
export async function assinaturasAtivasNoAsaas(email: string): Promise<{ ok: true; ativas: string[]; vistas: string[] } | { ok: false; erro: string }> {
  const chave = process.env.ASAAS_API_KEY;
  if (!chave) return { ok: false, erro: "ASAAS_API_KEY não configurada" };
  const get = async (caminho: string) => {
    const r = await fetch(`${BASE}${caminho}`, { headers: { access_token: chave, "User-Agent": "drivedata-academy" }, cache: "no-store" });
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
    return r.json();
  };
  try {
    const clientes = await get(`/customers?email=${encodeURIComponent(email)}`);
    if (!clientes?.data?.length) return { ok: false, erro: "Nenhum cliente com esse e-mail no Asaas." };
    const ativas: string[] = [];
    const vistas: string[] = [];
    for (const c of clientes.data) {
      const subs = await get(`/subscriptions?customer=${c.id}&includeDeleted=true`);
      for (const s of subs?.data ?? []) {
        vistas.push(`${s.id} ${s.deleted ? "apagada" : String(s.status).toLowerCase()}`);
        if (!s.deleted && s.status === "ACTIVE") ativas.push(s.id);
      }
    }
    return { ok: true, ativas, vistas };
  } catch (e: any) {
    return { ok: false, erro: `sem resposta do Asaas: ${String(e?.message || e).slice(0, 200)}` };
  }
}
