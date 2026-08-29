import { createAdminClient } from "@/lib/supabase/admin";
import { loadProfiles, displayName } from "@/lib/community";
import AdminError from "../AdminError";
import { saveToolPrice } from "./actions";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "Ativa", cls: "bg-brand-green/15 text-brand-green" },
  pending: { label: "Pendente", cls: "bg-amber-400/15 text-amber-300" },
  overdue: { label: "Atrasada", cls: "bg-red-400/15 text-red-300" },
  canceled: { label: "Cancelada", cls: "bg-white/5 text-slate-400" },
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

export default async function AdminFerramentaPage({ searchParams }: { searchParams: { ok?: string } }) {
  let subs: any[] = [], nameById: Record<string, string> = {};
  let visualCount = 0, userCount = 0, activeCount = 0, price = "19.90";
  try {
    const admin = createAdminClient();
    const [{ data: s, error }, { count: vc }, { data: visualsUsers }, { data: cfg }] = await Promise.all([
      admin.from("tool_subscriptions").select("user_id, email, status, current_period_end, created_at").order("created_at", { ascending: false }).limit(100),
      admin.from("saved_visuals").select("*", { count: "exact", head: true }),
      admin.from("saved_visuals").select("user_id"),
      admin.from("site_settings").select("value").eq("key", "tool_price").maybeSingle(),
    ]);
    if (error) throw new Error(error.message);
    subs = s ?? [];
    visualCount = vc ?? 0;
    userCount = new Set((visualsUsers ?? []).map((v: any) => v.user_id)).size;
    activeCount = subs.filter((x) => x.status === "active").length;
    if (cfg?.value) price = cfg.value;
    nameById = (await loadProfiles(admin, subs.map((x) => x.user_id))).nameById;
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Ferramenta de Visuais</h1>
        <div className="mt-6"><AdminError message={(e instanceof Error ? e.message : "Erro.") + " — rode o SQL de tool_subscriptions/saved_visuals no Supabase."} /></div>
      </div>
    );
  }

  const field = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-brand-green/60";
  const stats = [
    { label: "Assinaturas ativas", value: activeCount, d: "M20 6L9 17l-5-5" },
    { label: "Visuais salvos", value: visualCount, d: "M4 5h16v10H4zM2 19h20" },
    { label: "Alunos que usaram", value: userCount, d: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Ferramenta de Visuais</h1>
      <p className="mt-1 text-sm text-slate-400">Assinatura mensal separada. Gerencie preço e acompanhe uso e assinantes.</p>

      {searchParams?.ok && <div className="mt-5 rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm text-brand-green">Salvo!</div>}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-2xl border border-white/8 p-4">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-green/10">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-brand-green"><path d={s.d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Preço */}
      <form action={saveToolPrice} className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-300">Preço da assinatura (R$/mês)</label>
          <input name="tool_price" defaultValue={price} inputMode="decimal" className={`${field} w-40`} />
        </div>
        <button className="rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2 text-sm font-semibold text-ink-900">Salvar preço</button>
        <p className="w-full text-xs text-slate-500">A ferramenta é um produto à parte. Quem assina usa em /ferramenta, independente de ter comprado o curso. Admin sempre tem acesso.</p>
      </form>

      {/* Assinantes */}
      <h2 className="mt-8 font-display text-lg font-bold text-white">Assinantes</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/8">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
            <tr><th className="px-4 py-3">Aluno</th><th className="px-4 py-3">E-mail</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Válido até</th></tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {subs.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-500">Nenhuma assinatura ainda.</td></tr>}
            {subs.map((x) => {
              const st = STATUS[x.status] || STATUS.pending;
              return (
                <tr key={x.user_id} className="text-slate-200">
                  <td className="px-4 py-3">{displayName(nameById, x.user_id)}</td>
                  <td className="px-4 py-3 text-slate-400">{x.email || "—"}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase ${st.cls}`}>{st.label}</span></td>
                  <td className="px-4 py-3 text-slate-400">{fmt(x.current_period_end)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-xs text-slate-400">
        Próximas fases da ferramenta: salvar visual como <span className="text-slate-200">template</span> e <span className="text-slate-200">galeria da comunidade</span> com moderação (hoje estão como "em breve").
      </div>
    </div>
  );
}
