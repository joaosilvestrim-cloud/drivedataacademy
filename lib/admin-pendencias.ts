import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/* O que está esperando o time agir, por item do menu do admin. A chave é o
   href do item. Cada contagem falha sozinha: se uma tabela não existir, o item
   só não mostra badge, e os outros continuam. */

export type Pendencias = Record<string, number>;

async function chamadosAbertos(admin: SupabaseClient): Promise<number> {
  // Aberto = sem resposta do time. É o filtro padrão da tela de Chamados.
  const { count } = await admin.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open");
  return count ?? 0;
}

async function desafiosParaCorrigir(admin: SupabaseClient): Promise<number> {
  const { count } = await admin.from("ku_challenge_submissions").select("*", { count: "exact", head: true }).eq("status", "pending");
  return count ?? 0;
}

async function pagosSemAcesso(admin: SupabaseClient): Promise<number> {
  // Pedido de assinatura pago cujo comprador não tem assinatura ativa.
  const { data: pagos } = await admin
    .from("orders")
    .select("user_id, product")
    .eq("status", "paid")
    .in("product", ["subscription", "subscription_annual", "full_access"])
    .limit(500);
  const lista = pagos ?? [];
  if (!lista.length) return 0;
  const ids = Array.from(new Set(lista.map((o: any) => o.user_id).filter(Boolean)));
  const agora = Date.now();
  const ativos = new Set<string>();
  if (ids.length) {
    const { data: m } = await admin.from("memberships").select("user_id, status, expires_at").in("user_id", ids);
    for (const x of m ?? []) if (x.status === "active" && (!x.expires_at || Date.parse(x.expires_at) > agora)) ativos.add(x.user_id);
  }
  return lista.filter((o: any) => !o.user_id || !ativos.has(o.user_id)).length;
}

async function seguro(fn: () => Promise<number>): Promise<number> {
  try { return await fn(); } catch { return 0; }
}

export async function contarPendencias(admin: SupabaseClient): Promise<Pendencias> {
  const [suporte, desafios, pagamentos] = await Promise.all([
    seguro(() => chamadosAbertos(admin)),
    seguro(() => desafiosParaCorrigir(admin)),
    seguro(() => pagosSemAcesso(admin)),
  ]);
  return { "/admin/suporte": suporte, "/admin/desafios": desafios, "/admin/operacao": pagamentos };
}
