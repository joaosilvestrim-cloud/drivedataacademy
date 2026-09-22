import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/* O que o time precisa ver, por item do menu do admin. A chave é o href.

   São duas perguntas diferentes, e o menu mostra as duas do mesmo jeito:

   - fila: o que está parado esperando alguém agir. Chamado aberto, desafio
     para corrigir, pagamento sem acesso. Esse número some quando a pessoa
     resolve, não quando ela olha.
   - movimentação: o que chegou de novo desde a última vez que aquela pessoa
     abriu a tela. Comentário de aula, voto em enquete, candidatura. Esses não
     ficam "pendentes", eles só acontecem, e antes disso o time só descobria
     entrando na tela por acaso. Esse número some quando a pessoa olha.

   Cada contagem falha sozinha: se uma tabela não existir, o item só não mostra
   badge, e os outros continuam. */

export type Pendencias = Record<string, number>;

/* Registra que esta pessoa acabou de abrir esta tela. Chamado pela rota que o
   menu consulta a cada troca de página, então o badge de movimentação apaga
   sozinho no instante em que alguém olha. */
export async function marcarVisto(admin: SupabaseClient, userId: string, href: string) {
  try {
    await admin.from("admin_menu_reads").upsert(
      { user_id: userId, href, last_seen_at: new Date().toISOString() },
      { onConflict: "user_id,href" },
    );
  } catch { /* sem marca de leitura o badge só não zera; não vale quebrar a tela */ }
}

async function lidoEm(admin: SupabaseClient, userId: string | null): Promise<Record<string, string>> {
  if (!userId) return {};
  try {
    const { data } = await admin.from("admin_menu_reads").select("href, last_seen_at").eq("user_id", userId);
    return Object.fromEntries((data ?? []).map((r: any) => [r.href, r.last_seen_at]));
  } catch { return {}; }
}

/* Conta o que entrou depois da última olhada. Sem marca de leitura, conta o
   que chegou nos últimos 7 dias: assim a primeira visita de alguém não vem com
   um badge de "1.842" que não diz nada. */
async function novosDesde(
  admin: SupabaseClient,
  tabela: string,
  coluna: string,
  desde: string | undefined,
  filtro?: (q: any) => any,
): Promise<number> {
  const corte = desde ?? new Date(Date.now() - 7 * 864e5).toISOString();
  let q = admin.from(tabela).select("*", { count: "exact", head: true }).gt(coluna, corte);
  if (filtro) q = filtro(q);
  const { count } = await q;
  return count ?? 0;
}

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

async function imagensParaModerar(admin: SupabaseClient): Promise<number> {
  const { count } = await admin
    .from("channel_messages")
    .select("*", { count: "exact", head: true })
    .eq("image_status", "pendente")
    .not("image_url", "is", null);
  return count ?? 0;
}

// Projeto de aluno esperando revisão: enquanto ninguém olha, ele fica parado.
async function projetosParaRevisar(admin: SupabaseClient): Promise<number> {
  const { count } = await admin
    .from("portfolio_projects")
    .select("id", { count: "exact", head: true })
    .eq("status", "revisao");
  return count ?? 0;
}

/* Cancelamento em que a chamada ao Asaas falhou: a cobranca continua de pe e
   alguem precisa cancelar na mao. Isso e fila, nao movimentacao: o numero so
   some quando o time resolve. */
async function cancelamentosPresos(admin: SupabaseClient): Promise<number> {
  const { count } = await admin
    .from("subscription_cancellations")
    .select("id", { count: "exact", head: true })
    .eq("asaas_ok", false);
  return count ?? 0;
}

async function seguro(fn: () => Promise<number>): Promise<number> {
  try { return await fn(); } catch { return 0; }
}

export async function contarPendencias(admin: SupabaseClient, userId?: string | null): Promise<Pendencias> {
  const lido = await lidoEm(admin, userId ?? null);

  const [suporte, desafios, pagamentos, imagens, portfolio, presos,
         comentarios, votos, cancelamentos, alunos, certificados, parceria, leads, espera] = await Promise.all([
    // fila: some quando o time resolve
    seguro(() => chamadosAbertos(admin)),
    seguro(() => desafiosParaCorrigir(admin)),
    seguro(() => pagosSemAcesso(admin)),
    seguro(() => imagensParaModerar(admin)),
    seguro(() => projetosParaRevisar(admin)),
    seguro(() => cancelamentosPresos(admin)),
    // movimentação: some quando a pessoa olha
    seguro(() => novosDesde(admin, "lesson_comments", "created_at", lido["/admin/comentarios"])),
    seguro(() => novosDesde(admin, "poll_votes", "created_at", lido["/admin/votacoes"])),
    seguro(() => novosDesde(admin, "subscription_cancellations", "created_at", lido["/admin/cancelamentos"])),
    seguro(() => novosDesde(admin, "profiles", "created_at", lido["/admin/alunos"])),
    seguro(() => novosDesde(admin, "certificates", "created_at", lido["/admin/certificados"])),
    seguro(() => novosDesde(admin, "rep_requests", "created_at", lido["/admin/representacao"])),
    seguro(() => novosDesde(admin, "enterprise_leads", "created_at", lido["/admin/leads"])),
    seguro(() => novosDesde(admin, "waitlist", "created_at", lido["/admin/waitlist"])),
  ]);

  return {
    "/admin/suporte": suporte,
    "/admin/desafios": desafios,
    "/admin/operacao": pagamentos,
    "/admin/comunidade": imagens,
    "/admin/portfolio": portfolio,
    "/admin/comentarios": comentarios,
    "/admin/votacoes": votos,
    // O que o Asaas recusou pesa mais do que o cancelamento novo: um é
    // dinheiro continuando a sair do cartão de alguém, o outro é só leitura.
    "/admin/cancelamentos": presos || cancelamentos,
    "/admin/alunos": alunos,
    "/admin/certificados": certificados,
    "/admin/representacao": parceria,
    "/admin/leads": leads,
    "/admin/waitlist": espera,
  };
}
