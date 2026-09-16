import { createAdminClient } from "@/lib/supabase/admin";
import { Button, Badge, Status } from "@/components/ui/primitives";
import { PageHeader, SectionHeader, EmptyState, Alert } from "@/components/ui/layout";
import { DataTable, Tr, Cell } from "@/components/ui/data";
import { liberarPedido, consultarAsaas, reenviarCodigo } from "./actions";

export const dynamic = "force-dynamic";

/* Painel de operação: as integrações estão de pé, quem pagou recebeu acesso e
   os e-mails saíram. Tudo o que o webhook faz sozinho pode ser refeito daqui. */


const brl = (v: number | null) => (v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const quando = (iso: string | null) => (iso ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso)) : "—");
const PRODUTO: Record<string, string> = { subscription_annual: "Anual", subscription: "Mensal", full_access: "Acesso full", workshop: "Workshop", curso: "Treinamento" };

export default async function OperacaoAdmin({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const supabase = createAdminClient();
  const [{ data: pedidos }, logRes] = await Promise.all([
    supabase.from("orders").select("id, created_at, email, name, product, amount, status, gateway_id, user_id, coupon_code").order("created_at", { ascending: false }).limit(80),
    supabase.from("email_log").select("id, created_at, to_email, subject, kind, status, reason, order_id").order("created_at", { ascending: false }).limit(60),
  ]);
  const logDisponivel = !logRes.error;
  const emails = logRes.data ?? [];

  // Diagnóstico por pedido: tem conta? tem assinatura ativa? recebeu e-mail?
  const userIds = Array.from(new Set((pedidos ?? []).map((p: any) => p.user_id).filter(Boolean)));
  const { data: memberships } = userIds.length
    ? await supabase.from("memberships").select("user_id, status, expires_at").in("user_id", userIds)
    : { data: [] as any[] };
  const agora = Date.now();
  const ativo = new Set((memberships ?? []).filter((m: any) => m.status === "active" && (!m.expires_at || Date.parse(m.expires_at) > agora)).map((m: any) => m.user_id));
  const emailPorPedido = new Map<string, any>();
  const emailPorDestino = new Map<string, any>();
  for (const e of emails) {
    if (e.order_id && !emailPorPedido.has(e.order_id)) emailPorPedido.set(e.order_id, e);
    if (!emailPorDestino.has(e.to_email)) emailPorDestino.set(e.to_email, e);
  }

  const pagosSemAcesso = (pedidos ?? []).filter((p: any) => p.status === "paid" && p.product !== "workshop" && p.product !== "curso" && (!p.user_id || !ativo.has(p.user_id)));

  return (
    <div className="flex max-w-6xl flex-col gap-12">
      <div>
        <PageHeader context="Sistema" title="Pagamentos, acessos e e-mails" />
        <p className="mt-2 max-w-2xl text-body-sm text-ds-text-2">
          Tudo o que o webhook faz sozinho pode ser conferido e refeito aqui: consultar a cobrança no Asaas, liberar o acesso de quem pagou e reenviar o código de entrada. O estado das integrações fica em <a href="/admin/sistema#integracoes" className="text-ds-info underline decoration-ds-line underline-offset-4 hover:decoration-ds-info">Visão do sistema</a>.
        </p>
      </div>

      {searchParams?.ok && <Alert tone="accent">{searchParams.ok}</Alert>}
      {searchParams?.error && <Alert tone="danger">{searchParams.error}</Alert>}

      {pagosSemAcesso.length > 0 && (
        <Alert tone="danger">
          {pagosSemAcesso.length} {pagosSemAcesso.length === 1 ? "pedido pago está" : "pedidos pagos estão"} sem assinatura ativa. Use “Liberar acesso” na lista abaixo.
        </Alert>
      )}

      <section id="pagamentos" className="scroll-mt-24">
        <SectionHeader title="Pedidos" action={<span className="text-meta uppercase text-ds-text-3">últimos {(pedidos ?? []).length}</span>} />
        {(pedidos ?? []).length === 0 ? (
          <EmptyState title="Nenhum pedido ainda" description="Os pedidos da página de assinatura aparecem aqui." />
        ) : (
          <div className="mt-3">
            <DataTable caption="Pedidos e estado do acesso">
              <thead>
                <tr className="text-left text-meta uppercase text-ds-text-3">
                  <th className="px-3 py-2">Quando</th><th className="px-3 py-2">Comprador</th><th className="px-3 py-2">Produto</th><th className="px-3 py-2">Pagamento</th><th className="px-3 py-2">Conta</th><th className="px-3 py-2">Assinatura</th><th className="px-3 py-2">E-mail</th><th className="px-3 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(pedidos ?? []).map((p: any) => {
                  const pago = p.status === "paid";
                  const temConta = !!p.user_id;
                  const temAcesso = temConta && ativo.has(p.user_id);
                  const e = emailPorPedido.get(p.id) || emailPorDestino.get(p.email);
                  const naoPrecisaAcesso = p.product === "workshop" || p.product === "curso";
                  return (
                    <Tr key={p.id}>
                      <Cell className="whitespace-nowrap text-caption text-ds-text-3">{quando(p.created_at)}</Cell>
                      <Cell>
                        <span className="block text-body-sm text-ds-text">{p.name || "—"}</span>
                        <span className="block font-mono text-caption text-ds-text-3">{p.email}</span>
                      </Cell>
                      <Cell>
                        <span className="text-body-sm text-ds-text">{PRODUTO[p.product] || p.product}</span>
                        <span className="block text-caption text-ds-text-3">{brl(p.amount)}{p.coupon_code ? ` · ${p.coupon_code}` : ""}</span>
                      </Cell>
                      <Cell>
                        <Status tone={pago ? "accent" : p.status === "pending" ? "attention" : "neutral"}>{pago ? "Pago" : p.status === "pending" ? "Pendente" : p.status}</Status>
                        {/* Pedido sem cobrança no gateway: o checkout falhou antes de
                            gerar o link, então essa pessoa nunca viu como pagar. */}
                        {!pago && !p.gateway_id && (
                          <span className="mt-1 block text-caption text-ds-danger">cobrança não gerada</span>
                        )}
                      </Cell>
                      <Cell><Badge tone={temConta ? "info" : "neutral"}>{temConta ? "Criada" : "Sem conta"}</Badge></Cell>
                      <Cell>{naoPrecisaAcesso ? <span className="text-caption text-ds-text-3">n/a</span> : <Status tone={temAcesso ? "accent" : pago ? "danger" : "neutral"}>{temAcesso ? "Ativa" : pago ? "Faltando" : "—"}</Status>}</Cell>
                      <Cell>
                        {!logDisponivel ? <span className="text-caption text-ds-text-3">sem registro</span> : e ? (
                          <span className="block">
                            <Status tone={e.status === "sent" ? "accent" : "danger"}>{e.status === "sent" ? "Enviado" : "Falhou"}</Status>
                            <span className="mt-1 block text-caption text-ds-text-3">{e.kind} · {quando(e.created_at)}</span>
                          </span>
                        ) : <span className="text-caption text-ds-text-3">nenhum</span>}
                      </Cell>
                      <Cell>
                        <div className="flex flex-wrap gap-1.5">
                          {!pago && p.gateway_id && (
                            <form action={consultarAsaas}><input type="hidden" name="id" value={p.id} /><Button type="submit" variant="secondary" size="sm">Consultar Asaas</Button></form>
                          )}
                          {pago && !naoPrecisaAcesso && !temAcesso && (
                            <form action={liberarPedido}><input type="hidden" name="id" value={p.id} /><Button type="submit" size="sm">Liberar acesso</Button></form>
                          )}
                          {temConta && (
                            <form action={reenviarCodigo}>
                              <input type="hidden" name="email" value={p.email} /><input type="hidden" name="nome" value={p.name || ""} /><input type="hidden" name="order_id" value={p.id} />
                              <Button type="submit" variant="ghost" size="sm">Reenviar código</Button>
                            </form>
                          )}
                        </div>
                      </Cell>
                    </Tr>
                  );
                })}
              </tbody>
            </DataTable>
          </div>
        )}
      </section>

      <section id="emails" className="scroll-mt-24">
        <SectionHeader title="E-mails enviados" action={<span className="text-meta uppercase text-ds-text-3">últimos {emails.length}</span>} />
        {!logDisponivel ? (
          <Alert tone="attention">A tabela email_log ainda não existe. Rode a migration 20260915_email_log.sql no Supabase para começar a registrar os envios.</Alert>
        ) : emails.length === 0 ? (
          <EmptyState title="Nenhum e-mail registrado" description="A partir de agora cada envio aparece aqui, com sucesso ou falha." />
        ) : (
          <div className="mt-3">
            <DataTable caption="Registro de e-mails">
              <thead>
                <tr className="text-left text-meta uppercase text-ds-text-3">
                  <th className="px-3 py-2">Quando</th><th className="px-3 py-2">Para</th><th className="px-3 py-2">Assunto</th><th className="px-3 py-2">Tipo</th><th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {emails.map((e: any) => (
                  <Tr key={e.id}>
                    <Cell className="whitespace-nowrap text-caption text-ds-text-3">{quando(e.created_at)}</Cell>
                    <Cell className="font-mono text-caption text-ds-text-2">{e.to_email}</Cell>
                    <Cell className="text-body-sm text-ds-text">{e.subject}</Cell>
                    <Cell><Badge tone="neutral">{e.kind}</Badge></Cell>
                    <Cell>
                      <Status tone={e.status === "sent" ? "accent" : "danger"}>{e.status === "sent" ? "Enviado" : "Falhou"}</Status>
                      {e.reason && <span className="mt-1 block max-w-xs break-words text-caption text-ds-danger">{e.reason}</span>}
                    </Cell>
                  </Tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        )}
      </section>
    </div>
  );
}
