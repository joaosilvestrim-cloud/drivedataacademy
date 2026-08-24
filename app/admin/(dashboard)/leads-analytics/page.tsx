import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminError from "../AdminError";

export const dynamic = "force-dynamic";

const TZ = "America/Sao_Paulo";
function dayKey(iso: string) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}
function label(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit" }).format(new Date(iso));
}
function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: TZ }).format(new Date(iso));
}

const ICONS: Record<string, string> = {
  total: "M3 3v18h18M7 14l4-4 3 3 5-6",
  material: "M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2",
  wait: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  company: "M3 21h18M5 21V7l8-4v18M19 21V11l-6-3",
  clock: "M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z",
};

export default async function LeadsAnalyticsPage() {
  let mats: any[] = [], wait: any[] = [], ent: any[] = [];
  try {
    const admin = createAdminClient();
    const [m, w, e] = await Promise.all([
      admin.from("material_leads").select("created_at, material_title, name, email, utm_source, utm_medium, utm_campaign"),
      admin.from("waitlist").select("created_at, name, email"),
      admin.from("enterprise_leads").select("created_at, name, request_type"),
    ]);
    mats = m.data ?? []; wait = w.data ?? []; ent = e.data ?? [];
  } catch (err) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Analytics de Leads</h1>
        <div className="mt-6"><AdminError message={err instanceof Error ? err.message : "Erro."} /></div>
      </div>
    );
  }

  const all = [
    ...mats.map((r) => ({ ...r, source: "Materiais", detail: r.material_title })),
    ...wait.map((r) => ({ ...r, source: "Lista de espera", detail: "Lista de espera" })),
    ...ent.map((r) => ({ ...r, source: "Empresas", detail: r.request_type || "Empresa" })),
  ].filter((r) => r.created_at);

  const now = Date.now();
  const within = (days: number) => all.filter((r) => now - new Date(r.created_at).getTime() <= days * 864e5).length;

  const kpis = [
    { label: "Total de leads", value: all.length, icon: "total" },
    { label: "Materiais", value: mats.length, icon: "material" },
    { label: "Lista de espera", value: wait.length, icon: "wait" },
    { label: "Empresas", value: ent.length, icon: "company" },
    { label: "Últimos 7 dias", value: within(7), icon: "clock" },
    { label: "Últimos 30 dias", value: within(30), icon: "clock" },
  ];

  // Série diária (30 dias)
  const days: { key: string; count: number }[] = [];
  const perDay: Record<string, number> = {};
  for (const r of all) perDay[dayKey(r.created_at)] = (perDay[dayKey(r.created_at)] || 0) + 1;
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 864e5);
    const k = dayKey(d.toISOString());
    days.push({ key: k, count: perDay[k] || 0 });
  }
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  // Por material
  const byMaterial: Record<string, number> = {};
  for (const r of mats) byMaterial[r.material_title || "—"] = (byMaterial[r.material_title || "—"] || 0) + 1;
  const materials = Object.entries(byMaterial).sort((a, b) => b[1] - a[1]);

  // Por campanha (utm_source > utm_campaign > direto)
  const byCampaign: Record<string, number> = {};
  for (const r of mats) {
    const c = (r.utm_source || r.utm_campaign || "").trim() || "Direto / sem UTM";
    byCampaign[c] = (byCampaign[c] || 0) + 1;
  }
  const campaigns = Object.entries(byCampaign).sort((a, b) => b[1] - a[1]);

  // Por fonte
  const bySource = [
    { name: "Materiais", value: mats.length, cls: "from-brand-green to-brand-teal" },
    { name: "Lista de espera", value: wait.length, cls: "from-brand-blue to-brand-cyan" },
    { name: "Empresas", value: ent.length, cls: "from-amber-400 to-orange-400" },
  ];
  const maxSource = Math.max(1, ...bySource.map((s) => s.value));

  const recent = [...all].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 15);

  const Bars = ({ rows, max, tint = "bg-gradient-to-r from-brand-green to-brand-blue" }: { rows: [string, number][]; max: number; tint?: string }) => (
    <div className="space-y-2.5">
      {rows.map(([name, val]) => (
        <div key={name}>
          <div className="flex items-center justify-between text-sm">
            <span className="truncate pr-2 text-slate-200">{name}</span>
            <span className="shrink-0 font-medium text-slate-300">{val}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/8">
            <div className={`h-full rounded-full ${tint}`} style={{ width: `${Math.max(4, (val / max) * 100)}%` }} />
          </div>
        </div>
      ))}
      {rows.length === 0 && <p className="text-sm text-slate-500">Sem dados.</p>}
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Analytics de Leads</h1>
          <p className="mt-1 text-sm text-slate-400">Visão consolidada de todas as fontes de captação.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/materiais/leads" className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-brand-green/50 hover:text-brand-green">Leads de materiais</Link>
          <Link href="/admin/waitlist" className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-brand-green/50 hover:text-brand-green">Lista de espera</Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="glass rounded-2xl border border-white/8 p-4">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-green/10">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-brand-green"><path d={ICONS[k.icon]} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-white">{k.value}</p>
            <p className="text-xs text-slate-400">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Série diária */}
      <div className="mt-6 glass rounded-2xl border border-white/8 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-white">Leads por dia</h2>
          <span className="text-xs text-slate-500">últimos 30 dias</span>
        </div>
        <div className="mt-5 flex h-40 items-end gap-1">
          {days.map((d, i) => (
            <div key={d.key} className="group relative flex-1">
              <div className="w-full rounded-t bg-gradient-to-t from-brand-green/70 to-brand-blue/70 transition-all hover:from-brand-green hover:to-brand-blue" style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: d.count ? "3px" : "0" }} />
              <div className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink-900 px-2 py-1 text-[0.65rem] text-white shadow group-hover:block">{label(d.key)}: {d.count}</div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[0.65rem] text-slate-500">
          <span>{label(days[0].key)}</span>
          <span>{label(days[days.length - 1].key)}</span>
        </div>
      </div>

      {/* Breakdowns */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl border border-white/8 p-5">
          <h2 className="mb-4 font-display text-lg font-bold text-white">Por fonte</h2>
          <Bars rows={bySource.map((s) => [s.name, s.value]) as [string, number][]} max={maxSource} />
        </div>
        <div className="glass rounded-2xl border border-white/8 p-5">
          <h2 className="mb-4 font-display text-lg font-bold text-white">Por campanha (UTM)</h2>
          <Bars rows={campaigns.slice(0, 8)} max={Math.max(1, ...campaigns.map((c) => c[1]))} tint="bg-gradient-to-r from-brand-blue to-brand-cyan" />
        </div>
      </div>

      {/* Por material */}
      <div className="mt-6 glass rounded-2xl border border-white/8 p-5">
        <h2 className="mb-4 font-display text-lg font-bold text-white">Por material</h2>
        <Bars rows={materials} max={Math.max(1, ...materials.map((m) => m[1]))} tint="bg-gradient-to-r from-brand-green to-brand-teal" />
      </div>

      {/* Recentes */}
      <h2 className="mt-8 font-display text-lg font-bold text-white">Últimos leads</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/8">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
            <tr><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Fonte</th><th className="px-4 py-3">Detalhe</th><th className="px-4 py-3">Data</th></tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {recent.map((r, i) => (
              <tr key={i} className="text-slate-200">
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{r.name || "—"}</div>
                  {r.email && <div className="text-xs text-slate-500">{r.email}</div>}
                </td>
                <td className="px-4 py-3"><span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300">{r.source}</span></td>
                <td className="px-4 py-3 text-slate-400">{r.detail}</td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-400">{fmt(r.created_at)}</td>
              </tr>
            ))}
            {recent.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-500">Nenhum lead ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
