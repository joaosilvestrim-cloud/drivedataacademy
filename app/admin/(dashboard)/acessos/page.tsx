import { createAdminClient } from "@/lib/supabase/admin";
import { Button, Status, Badge } from "@/components/ui/primitives";
import { DataTable, SortTh, Tr, Cell } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/layout";
import AdminError from "../AdminError";
import Avatar from "@/components/Avatar";
import GrantForm from "./GrantForm";
import CreateStudentForm from "./CreateStudentForm";
import GrantCoursesForm from "./GrantCoursesForm";
import { revokeMembership, reactivateMembership } from "./actions";

export const dynamic = "force-dynamic";

function fmt(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

// Uma ação por linha, então botão direto. Dropdown continua adiado e não há
// evidência que justifique criar um aqui.
function MembershipAction({ id, status, nome }: { id: string; status: string; nome: string }) {
  const revogar = status === "active";
  return (
    <form action={revogar ? revokeMembership : reactivateMembership} className="inline-block">
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant={revogar ? "danger" : "secondary"} size="sm">
        {revogar ? "Revogar" : "Reativar"}
        <span className="sr-only"> o acesso de {nome}</span>
      </Button>
    </form>
  );
}

function produto(p: string | null) {
  if (p === "subscription") return "assinatura";
  if (p === "workshop") return "workshop";
  if (p === "full_access") return "acesso full";
  return p || "—";
}

export default async function AcessosPage({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  let members: any[] = [];
  let orders: any[] = [];
  let courses: { id: string; title: string }[] = [];
  try {
    const admin = createAdminClient();
    const [{ data: mem, error: memErr }, { data: userData }, { data: profs }, { data: ord }, { data: cs }] = await Promise.all([
      admin.from("memberships").select("id, user_id, plan, status, source, starts_at, expires_at").order("starts_at", { ascending: false }),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      admin.from("profiles").select("id, full_name"),
      admin.from("orders").select("id, email, amount, status, gateway, created_at, product").order("created_at", { ascending: false }).limit(50),
      admin.from("courses").select("id, title").order("title"),
    ]);
    if (memErr) throw new Error(memErr.message);
    courses = cs ?? [];

    const emailById: Record<string, string> = {};
    for (const u of userData?.users ?? []) emailById[u.id] = u.email || "";
    const nameById: Record<string, string> = {};
    for (const p of profs ?? []) nameById[p.id] = p.full_name || "";

    const now = Date.now();
    members = (mem ?? []).map((m: any) => ({
      ...m,
      email: emailById[m.user_id] || "(sem e-mail)",
      name: nameById[m.user_id] || "",
      active: m.status === "active" && (!m.expires_at || new Date(m.expires_at).getTime() > now),
    }));
    orders = ord ?? [];
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Acessos</h1>
        <div className="mt-6">
          <AdminError
            message={
              (e instanceof Error ? e.message : "Erro desconhecido.") +
              " — verifique se as tabelas memberships e orders foram criadas (rode o SQL do terreno no Supabase)."
            }
          />
        </div>
      </div>
    );
  }

  const activeCount = members.filter((m) => m.active).length;

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Acessos</h1>
        <p className="mt-1 text-sm text-slate-400">Liberar acesso na mão (individual): criar aluno, dar acesso full, liberar treinamentos específicos ou revogar. {activeCount} acesso(s) full ativo(s).</p>
      </div>

      {searchParams?.ok && (
        <div className="mt-5 rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm text-brand-green">{searchParams.ok}</div>
      )}
      {searchParams?.error && (
        <div className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{searchParams.error}</div>
      )}

      <div className="mt-6 grid gap-4">
        <CreateStudentForm />
        <GrantForm />
        <GrantCoursesForm courses={courses} />
      </div>

      {/* Alunos com acesso. A tabela some no celular e vira lista estruturada:
          rolagem lateral não é leitura, é adiamento do problema. */}
      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-ds-line pb-2.5">
          <h2 className="font-display text-section font-semibold text-ds-text">Alunos com acesso</h2>
          <span className="text-meta uppercase text-ds-text-3">
            {members.length} {members.length === 1 ? "registro" : "registros"}
            {members.length > 0 && ` · ${activeCount} ${activeCount === 1 ? "ativo" : "ativos"}`}
          </span>
        </div>

        {members.length === 0 ? (
          <EmptyState
            title="Nenhum acesso liberado ainda"
            description="Use um dos três formulários acima para liberar o primeiro."
          />
        ) : (
          <>
            <div className="mt-4 hidden tablet:block">
              <DataTable caption="Alunos com acesso, origem, vigência e situação">
                <thead>
                  <tr>
                    <SortTh className="w-full">Aluno</SortTh>
                    <SortTh className="hidden lg:table-cell">Origem</SortTh>
                    <SortTh>Desde</SortTh>
                    <SortTh>Expira</SortTh>
                    <SortTh>Situação</SortTh>
                    <SortTh className="text-right">Ação</SortTh>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <Tr key={m.id}>
                      <Cell className="max-w-0">
                        <span className="flex min-w-0 items-center gap-2.5">
                          <Avatar name={m.name || m.email} size="xs" />
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-ds-text">{m.name || m.email}</span>
                            {m.name && <span className="block truncate text-caption text-ds-text-3">{m.email}</span>}
                          </span>
                        </span>
                      </Cell>
                      <Cell muted className="hidden whitespace-nowrap lg:table-cell">{m.source || "—"}</Cell>
                      <Cell muted className="whitespace-nowrap">{fmt(m.starts_at)}</Cell>
                      <Cell muted className="whitespace-nowrap">{fmt(m.expires_at)}</Cell>
                      <Cell className="whitespace-nowrap">
                        <Status tone={m.active ? "accent" : "attention"}>
                          {m.active ? "Ativo" : m.status === "active" ? "Expirado" : m.status}
                        </Status>
                      </Cell>
                      <Cell className="text-right">
                        <MembershipAction id={m.id} status={m.status} nome={m.name || m.email} />
                      </Cell>
                    </Tr>
                  ))}
                </tbody>
              </DataTable>
            </div>

            <ul className="mt-2 flex flex-col tablet:hidden">
              {members.map((m) => (
                <li key={m.id} className="flex flex-col gap-2 border-b border-ds-line-soft py-3.5">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={m.name || m.email} size="xs" />
                    <span className="min-w-0">
                      <span className="block truncate text-body-sm font-medium text-ds-text">{m.name || m.email}</span>
                      {m.name && <span className="block truncate text-caption text-ds-text-3">{m.email}</span>}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Status tone={m.active ? "accent" : "attention"}>
                        {m.active ? "Ativo" : m.status === "active" ? "Expirado" : m.status}
                      </Status>
                      <span className="text-caption text-ds-text-3">
                        desde {fmt(m.starts_at)} · expira {fmt(m.expires_at)}
                      </span>
                    </span>
                    <MembershipAction id={m.id} status={m.status} nome={m.name || m.email} />
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Pedidos. Só leitura, sem ação de linha. */}
      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-ds-line pb-2.5">
          <h2 className="font-display text-section font-semibold text-ds-text">Pedidos</h2>
          <span className="text-meta uppercase text-ds-text-3">
            {orders.length} {orders.length === 1 ? "registro" : "registros"}
          </span>
        </div>
        <p className="mt-2 text-body-sm text-ds-text-3">
          Preenchido automaticamente quando o checkout do Asaas estiver ativo. A tela mostra os 50 pedidos
          mais recentes; não há paginação, então pedidos mais antigos não aparecem aqui.
        </p>

        {orders.length === 0 ? (
          <EmptyState
            title="Nenhum pedido registrado"
            description="Os pedidos aparecem sozinhos assim que o checkout começar a rodar."
          />
        ) : (
          <>
            <div className="mt-4 hidden tablet:block">
              <DataTable caption="Pedidos recentes, com tipo, valor e situação de pagamento">
                <thead>
                  <tr>
                    <SortTh className="w-full">E-mail</SortTh>
                    <SortTh>Tipo</SortTh>
                    <SortTh numeric>Valor</SortTh>
                    <SortTh className="hidden lg:table-cell">Gateway</SortTh>
                    <SortTh>Situação</SortTh>
                    <SortTh>Data</SortTh>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <Tr key={o.id}>
                      <Cell className="max-w-0"><span className="block truncate text-ds-text">{o.email || "—"}</span></Cell>
                      <Cell className="whitespace-nowrap"><Badge>{produto(o.product)}</Badge></Cell>
                      <Cell numeric className="whitespace-nowrap">{o.amount != null ? `R$ ${Number(o.amount).toFixed(2)}` : "—"}</Cell>
                      <Cell muted className="hidden whitespace-nowrap lg:table-cell">{o.gateway || "—"}</Cell>
                      <Cell className="whitespace-nowrap">
                        <Status tone={o.status === "paid" ? "accent" : "attention"}>{o.status === "paid" ? "Pago" : o.status}</Status>
                      </Cell>
                      <Cell muted className="whitespace-nowrap">{fmt(o.created_at)}</Cell>
                    </Tr>
                  ))}
                </tbody>
              </DataTable>
            </div>

            <ul className="mt-2 flex flex-col tablet:hidden">
              {orders.map((o) => (
                <li key={o.id} className="flex flex-col gap-2 border-b border-ds-line-soft py-3.5">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="min-w-0 flex-1 truncate text-body-sm text-ds-text">{o.email || "—"}</span>
                    <span className="font-mono text-body-sm tabular-nums text-ds-text">
                      {o.amount != null ? `R$ ${Number(o.amount).toFixed(2)}` : "—"}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Status tone={o.status === "paid" ? "accent" : "attention"}>{o.status === "paid" ? "Pago" : o.status}</Status>
                    <Badge>{produto(o.product)}</Badge>
                    <span className="text-caption text-ds-text-3">{fmt(o.created_at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
