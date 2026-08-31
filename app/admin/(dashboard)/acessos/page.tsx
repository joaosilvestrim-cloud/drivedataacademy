import { createAdminClient } from "@/lib/supabase/admin";
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
      admin.from("orders").select("id, email, amount, status, gateway, created_at").order("created_at", { ascending: false }).limit(50),
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
        <p className="mt-1 text-sm text-slate-400">{activeCount} acesso(s) full ativo(s).</p>
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

      {/* Memberships */}
      <h2 className="mt-10 font-display text-lg font-bold text-white">Alunos com acesso</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/8">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Aluno</th>
              <th className="px-4 py-3">Origem</th>
              <th className="px-4 py-3">Desde</th>
              <th className="px-4 py-3">Expira</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {members.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Nenhum acesso ainda. Libere o primeiro acima.</td></tr>
            )}
            {members.map((m) => (
              <tr key={m.id} className="text-slate-200">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={m.name || m.email} size="xs" />
                    <div>
                      <div className="font-medium text-white">{m.name || m.email}</div>
                      {m.name && <div className="text-xs text-slate-500">{m.email}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-400">{m.source || "—"}</td>
                <td className="px-4 py-3 text-slate-400">{fmt(m.starts_at)}</td>
                <td className="px-4 py-3 text-slate-400">{fmt(m.expires_at)}</td>
                <td className="px-4 py-3">
                  {m.active ? (
                    <span className="rounded-full bg-brand-green/15 px-2.5 py-1 text-xs font-semibold text-brand-green">ativo</span>
                  ) : (
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-400">{m.status === "active" ? "expirado" : m.status}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {m.status === "active" ? (
                    <form action={revokeMembership} className="inline">
                      <input type="hidden" name="id" value={m.id} />
                      <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-red-400/40 hover:text-red-400">Revogar</button>
                    </form>
                  ) : (
                    <form action={reactivateMembership} className="inline">
                      <input type="hidden" name="id" value={m.id} />
                      <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-brand-green/40 hover:text-brand-green">Reativar</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pedidos */}
      <h2 className="mt-10 font-display text-lg font-bold text-white">Pedidos</h2>
      <p className="mt-1 text-sm text-slate-400">Preenchido automaticamente quando o checkout do Asaas estiver ativo.</p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/8">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Gateway</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {orders.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Nenhum pedido ainda.</td></tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="text-slate-200">
                <td className="px-4 py-3">{o.email || "—"}</td>
                <td className="px-4 py-3">{o.amount != null ? `R$ ${Number(o.amount).toFixed(2)}` : "—"}</td>
                <td className="px-4 py-3 text-slate-400">{o.gateway || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${o.status === "paid" ? "bg-brand-green/15 text-brand-green" : "bg-white/10 text-slate-400"}`}>{o.status}</span>
                </td>
                <td className="px-4 py-3 text-slate-400">{fmt(o.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
