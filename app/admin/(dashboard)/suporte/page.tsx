import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadProfiles, displayName } from "@/lib/community";
import { CATEGORIES, TICKET_STATUS } from "@/lib/support";
import AdminError from "../AdminError";

export const dynamic = "force-dynamic";

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

const FILTERS = [
  { key: "open", label: "Abertos" },
  { key: "answered", label: "Respondidos" },
  { key: "resolved", label: "Resolvidos" },
  { key: "all", label: "Todos" },
];

export default async function SuportePage({ searchParams }: { searchParams: { status?: string } }) {
  const active = searchParams?.status || "open";
  let tickets: any[] = [];
  let nameById: Record<string, string> = {};
  const counts: Record<string, number> = { open: 0, answered: 0, resolved: 0, all: 0 };
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("support_tickets")
      .select("id, user_id, email, subject, category, status, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    const all = data ?? [];
    for (const t of all) { counts.all++; counts[t.status] = (counts[t.status] || 0) + 1; }
    tickets = active === "all" ? all : all.filter((t: any) => t.status === active);
    const prof = await loadProfiles(admin, all.map((t: any) => t.user_id));
    nameById = prof.nameById;
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Suporte</h1>
        <div className="mt-6"><AdminError message={(e instanceof Error ? e.message : "Erro.") + " — rode o SQL de suporte no Supabase."} /></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Suporte</h1>
      <p className="mt-1 text-sm text-slate-400">Chamados dos alunos. Quando a IA não resolver, cai aqui para o time.</p>

      {/* Filtros */}
      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/suporte?status=${f.key}`}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${active === f.key ? "border-brand-green/50 bg-brand-green/10 text-brand-green" : "border-white/10 text-slate-300 hover:border-white/30"}`}
          >
            {f.label} <span className="ml-1 text-xs opacity-70">{counts[f.key] ?? 0}</span>
          </Link>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-white/8">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Assunto</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Aluno</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Atualizado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {tickets.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">Nenhum chamado {active !== "all" ? `“${FILTERS.find((f) => f.key === active)?.label.toLowerCase()}”` : ""}.</td></tr>
            )}
            {tickets.map((t) => {
              const st = TICKET_STATUS[t.status] || TICKET_STATUS.open;
              return (
                <tr key={t.id} className="text-slate-200 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/suporte/${t.id}`} className="font-medium text-white hover:text-brand-green">{t.subject}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{CATEGORIES[t.category] || t.category}</td>
                  <td className="px-4 py-3">
                    <div className="text-slate-200">{displayName(nameById, t.user_id)}</div>
                    <div className="text-xs text-slate-500">{t.email}</div>
                  </td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span></td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-400">{fmt(t.updated_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
