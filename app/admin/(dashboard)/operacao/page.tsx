import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button, Badge, Status } from "@/components/ui/primitives";
import { PageHeader, SectionHeader, EmptyState, Alert } from "@/components/ui/layout";
import { DataTable, Tr, Cell } from "@/components/ui/data";
import { LinkFilter } from "@/components/ui/filter";
import ExportCsv from "../ExportCsv";
import { liberarPedido, consultarAsaas, reenviarCodigo } from "./actions";

export const dynamic = "force-dynamic";

/* Painel de operação: as integrações estão de pé, quem pagou recebeu acesso e
   os e-mails saíram. Tudo o que o webhook faz sozinho pode ser refeito daqui.

   A lista abre nos pagos, que é a pergunta do dia a dia. O que deu errado não
   fica escondido atrás do filtro: sobe como alerta no topo, contado sobre todos
   os pedidos, e cada alerta leva para a lista já filtrada. */

const brl = (v: number | null) => (v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const quando = (iso: string | null) => (iso ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso)) : "—");
const PRODUTO: Record<string, string> = { subscription_annual: "Anual", subscription: "Mensal", full_access: "Acesso full", workshop: "Workshop", curso: "Treinamento" };

const ESTADOS = [
  { key: "pagos", label: "Pagos" },
  { key: "problemas", label: "Com problema" },
  { key: "pendentes", label: "Aguardando" },
  { key: "todos", label: "Todos" },
];

const PERIODOS = [
  { key: "7", label: "Últimos 7 dias" },
  { key: "30", label: "Últimos 30 dias" },
  { key: "90", label: "Últimos 90 dias" },
  { key: "tudo", label: "Todo o período" },
];

/* Um pedido tem no máximo um problema em destaque, na ordem em que doem: o
   checkout que nem gerou cobrança, o dinheiro que entrou sem liberar acesso e
   o e-mail que não saiu. */
type Problema = { chave: "sem_cobranca" | "sem_acesso" | "email_falhou"; label: string };

function Tile({ label, valor, detalhe, href, tom }: { label: string; valor: string; detalhe?: string; href?: string; tom?: "danger" | "accent" }) {
  const corpo = (
    <>
      <span className="block text-meta uppercase tracking-wide text-ds-text-3">{label}</span>
      <span className={`mt-1 block font-mono text-heading-sm tabular-nums ${tom === "danger" ? "text-ds-danger" : tom === "accent" ? "text-ds-accent" : "text-ds-text"}`}>{valor}</span>
      {detalhe && <span className="mt-0.5 block text-caption text-ds-text-3">{detalhe}</span>}
    </>
  );
  const classe = `rounded-ctl border px-4 py-3 transition-colors ${tom === "danger" ? "border-ds-danger/40 bg-ds-danger/[0.06]" : "border-ds-line bg-ds-surface"} ${href ? "hover:border-ds-text-3" : ""}`;
  return href ? <Link href={href} className={classe}>{corpo}</Link> : <div className={classe}>{corpo}</div>;
}

export default async function OperacaoAdmin({
  searchParams,
}: {
  searchParams: { ok?: string; error?: string; estado?: string; produto?: string; periodo?: string; q?: string };
}) {
  const supabase = createAdminClient();
  const [{ data: pedidosRaw }, logRes] = await Promise.all([
    supabase.from("orders").select("id, created_at, email, name, product, amount, status, gateway_id, user_id, coupon_code").order("created_at", { ascending: false }).limit(400),
    supabase.from("email_log").select("id, created_at, to_email, subject, kind, status, reason, order_id").order("created_at", { ascending: false }).limit(200),
  ]);
  const logDisponivel = !logRes.error;
  const emails = logRes.data ?? [];
  const pedidos = pedidosRaw ?? [];

  // Diagnóstico por pedido: tem conta? tem assinatura ativa? recebeu e-mail?
  const userIds = Array.from(new Set(pedidos.map((p: any) => p.user_id).filter(Boolean)));
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

  const linhas = pedidos.map((p: any) => {
    const pago = p.status === "paid";
    const temConta = !!p.user_id;
    const temAcesso = temConta && ativo.has(p.user_id);
    const naoPrecisaAcesso = p.product === "workshop" || p.product === "curso";
    const envio = emailPorPedido.get(p.id) || emailPorDestino.get(p.email) || null;
    let problema: Problema | null = null;
    if (!pago && p.status === "pending" && !p.gateway_id) problema = { chave: "sem_cobranca", label: "Cobrança não gerada" };
    else if (pago && !naoPrecisaAcesso && !temAcesso) problema = { chave: "sem_acesso", label: "Pago sem acesso" };
    else if (pago && envio && envio.status !== "sent") problema = { chave: "email_falhou", label: "E-mail falhou" };
    return { ...p, pago, temConta, temAcesso, naoPrecisaAcesso, envio, problema };
  });

  // Os alertas contam sobre todos os pedidos, nunca sobre o filtro da tela.
  const semCobranca = linhas.filter((l) => l.problema?.chave === "sem_cobranca");
  const pagosSemAcesso = linhas.filter((l) => l.problema?.chave === "sem_acesso");
  const emailFalhou = linhas.filter((l) => l.problema?.chave === "email_falhou");

  const estado = ESTADOS.some((e) => e.key === searchParams.estado) ? searchParams.estado! : "pagos";
  const produto = searchParams.produto && searchParams.produto !== "todos" ? searchParams.produto : "";
  const periodo = PERIODOS.some((p) => p.key === searchParams.periodo) ? searchParams.periodo! : "tudo";
  const busca = (searchParams.q || "").trim().toLowerCase();

  const corte = periodo === "tudo" ? 0 : agora - Number(periodo) * 24 * 60 * 60 * 1000;
  const base = linhas
    .filter((l) => !corte || Date.parse(l.created_at) >= corte)
    .filter((l) => !produto || l.product === produto)
    .filter((l) => !busca || [l.name, l.email, l.gateway_id, l.coupon_code].some((c: string | null) => (c || "").toLowerCase().includes(busca)));

  const aguardando = (l: any) => !l.pago && l.status === "pending" && !!l.gateway_id;

  const contagem = {
    pagos: base.filter((l) => l.pago).length,
    problemas: base.filter((l) => l.problema).length,
    pendentes: base.filter(aguardando).length,
    todos: base.length,
  };

  const filtradas = base.filter((l) =>
    estado === "todos" ? true : estado === "pagos" ? l.pago : estado === "problemas" ? !!l.problema : aguardando(l)
  );

  const recebido = base.filter((l) => l.pago).reduce((soma, l) => soma + Number(l.amount || 0), 0);
  const emAberto = base.filter(aguardando).reduce((soma, l) => soma + Number(l.amount || 0), 0);

  const csv = filtradas.map((l) => ({
    quando: quando(l.created_at),
    nome: l.name || "",
    email: l.email,
    produto: PRODUTO[l.product] || l.product,
    valor: Number(l.amount || 0).toFixed(2).replace(".", ","),
    situacao: l.pago ? "pago" : l.status,
    cobranca: l.gateway_id || "",
    cupom: l.coupon_code || "",
    acesso: l.naoPrecisaAcesso ? "n/a" : l.temAcesso ? "ativo" : l.pago ? "faltando" : "",
    problema: l.problema?.label || "",
  }));

  const filtroAtual = { produto: produto || undefined, periodo: periodo !== "tudo" ? periodo : undefined, q: busca || undefined };
  const comEstado = (chave: string) =>
    `/admin/operacao?${new URLSearchParams([["estado", chave], ...Object.entries(filtroAtual).filter(([, v]) => v)] as string[][]).toString()}`;

  const campo = "rounded-ctl border border-ds-line bg-ds-surface px-3 py-2 text-body-sm text-ds-text outline-none focus:border-ds-accent";

  return (
    <div className="flex max-w-6xl flex-col gap-10">
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
          {pagosSemAcesso.length} {pagosSemAcesso.length === 1 ? "pedido pago está" : "pedidos pagos estão"} sem assinatura ativa. Alguém pagou e não entrou.{" "}
          <Link href={comEstado("problemas")} className="underline underline-offset-4">Ver e liberar acesso</Link>.
        </Alert>
      )}

      {semCobranca.length > 0 && (
        <Alert tone="danger">
          {semCobranca.length} {semCobranca.length === 1 ? "pedido travou" : "pedidos travaram"} no checkout: a cobrança nunca chegou a ser gerada no Asaas, quase sempre porque o CPF foi recusado. Essas pessoas não chegaram a ver como pagar.{" "}
          <Link href={comEstado("problemas")} className="underline underline-offset-4">Ver quem foi</Link> e chamar no WhatsApp.
        </Alert>
      )}

      {emailFalhou.length > 0 && (
        <Alert tone="attention">
          {emailFalhou.length} {emailFalhou.length === 1 ? "pedido pago ficou" : "pedidos pagos ficaram"} sem e-mail entregue. Use Reenviar código na lista.
        </Alert>
      )}

      <section id="pagamentos" className="scroll-mt-24">
        <SectionHeader title="Pedidos" action={csv.length > 0 ? <ExportCsv rows={csv} filename="pedidos.csv" /> : undefined} />

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Tile label="Recebido" valor={brl(recebido)} detalhe={`${contagem.pagos} ${contagem.pagos === 1 ? "pedido pago" : "pedidos pagos"}`} tom="accent" href={comEstado("pagos")} />
          <Tile label="Aguardando" valor={brl(emAberto)} detalhe={`${contagem.pendentes} com link gerado`} href={comEstado("pendentes")} />
          <Tile label="Cobrança não gerada" valor={String(semCobranca.length)} detalhe="checkout travou" tom={semCobranca.length ? "danger" : undefined} href={comEstado("problemas")} />
          <Tile label="Pago sem acesso" valor={String(pagosSemAcesso.length)} detalhe="precisa liberar" tom={pagosSemAcesso.length ? "danger" : undefined} href={comEstado("problemas")} />
          <Tile label="E-mail falhou" valor={String(emailFalhou.length)} detalhe="precisa reenviar" tom={emailFalhou.length ? "danger" : undefined} href={comEstado("problemas")} />
        </div>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <LinkFilter
            label="Filtrar pedidos por situação"
            basePath="/admin/operacao"
            param="estado"
            options={ESTADOS}
            active={estado}
            counts={contagem}
            extra={filtroAtual}
          />
          <form className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="estado" value={estado} />
            <label className="flex flex-col gap-1.5">
              <span className="text-label font-medium text-ds-text-2">Produto</span>
              <select name="produto" defaultValue={produto || "todos"} className={campo}>
                <option value="todos">Todos</option>
                {Object.entries(PRODUTO).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-label font-medium text-ds-text-2">Período</span>
              <select name="periodo" defaultValue={periodo} className={campo}>
                {PERIODOS.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-label font-medium text-ds-text-2">Buscar</span>
              <input name="q" defaultValue={searchParams.q || ""} placeholder="nome, e-mail, cupom ou id da cobrança" className={`w-60 ${campo}`} />
            </label>
            <Button type="submit" size="sm">Aplicar</Button>
          </form>
        </div>

        {filtradas.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Nenhum pedido com esse filtro"
              description={estado === "problemas" ? "Nada quebrado por aqui: toda cobrança foi gerada e todo pagamento virou acesso." : "Troque a situação, o produto ou o período para ver outros pedidos."}
            />
          </div>
        ) : (
          <div className="mt-3">
            <DataTable caption="Pedidos e estado do acesso">
              <thead>
                <tr className="text-left text-meta uppercase text-ds-text-3">
                  <th className="px-3 py-2">Quando</th><th className="px-3 py-2">Comprador</th><th className="px-3 py-2">Produto</th><th className="px-3 py-2">Pagamento</th><th className="px-3 py-2">Conta</th><th className="px-3 py-2">Assinatura</th><th className="px-3 py-2">E-mail</th><th className="px-3 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((p: any) => (
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
                      <Status tone={p.pago ? "accent" : p.status === "pending" ? "attention" : "neutral"}>{p.pago ? "Pago" : p.status === "pending" ? "Pendente" : p.status}</Status>
                      {/* Pedido sem cobrança no gateway: o checkout falhou antes de
                          gerar o link, então essa pessoa nunca viu como pagar. */}
                      {p.problema && (
                        <span className={`mt-1 block text-caption ${p.problema.chave === "email_falhou" ? "text-ds-text-3" : "text-ds-danger"}`}>{p.problema.label}</span>
                      )}
                    </Cell>
                    <Cell><Badge tone={p.temConta ? "info" : "neutral"}>{p.temConta ? "Criada" : "Sem conta"}</Badge></Cell>
                    <Cell>{p.naoPrecisaAcesso ? <span className="text-caption text-ds-text-3">n/a</span> : <Status tone={p.temAcesso ? "accent" : p.pago ? "danger" : "neutral"}>{p.temAcesso ? "Ativa" : p.pago ? "Faltando" : "—"}</Status>}</Cell>
                    <Cell>
                      {!logDisponivel ? <span className="text-caption text-ds-text-3">sem registro</span> : p.envio ? (
                        <span className="block">
                          <Status tone={p.envio.status === "sent" ? "accent" : "danger"}>{p.envio.status === "sent" ? "Enviado" : "Falhou"}</Status>
                          <span className="mt-1 block text-caption text-ds-text-3">{p.envio.kind} · {quando(p.envio.created_at)}</span>
                        </span>
                      ) : <span className="text-caption text-ds-text-3">nenhum</span>}
                    </Cell>
                    <Cell>
                      <div className="flex flex-wrap gap-1.5">
                        {!p.pago && p.gateway_id && (
                          <form action={consultarAsaas}><input type="hidden" name="id" value={p.id} /><Button type="submit" variant="secondary" size="sm">Consultar Asaas</Button></form>
                        )}
                        {p.pago && !p.naoPrecisaAcesso && !p.temAcesso && (
                          <form action={liberarPedido}><input type="hidden" name="id" value={p.id} /><Button type="submit" size="sm">Liberar acesso</Button></form>
                        )}
                        {p.temConta && (
                          <form action={reenviarCodigo}>
                            <input type="hidden" name="email" value={p.email} /><input type="hidden" name="nome" value={p.name || ""} /><input type="hidden" name="order_id" value={p.id} />
                            <Button type="submit" variant="ghost" size="sm">Reenviar código</Button>
                          </form>
                        )}
                      </div>
                    </Cell>
                  </Tr>
                ))}
              </tbody>
            </DataTable>
            <p className="mt-2 text-caption text-ds-text-3">Mostrando {filtradas.length} de {linhas.length} pedidos carregados.</p>
          </div>
        )}
      </section>

      <section id="emails" className="scroll-mt-24">
        <SectionHeader title="E-mails enviados" action={<span className="text-meta uppercase text-ds-text-3">últimos {Math.min(emails.length, 60)}</span>} />
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
                {emails.slice(0, 60).map((e: any) => (
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
