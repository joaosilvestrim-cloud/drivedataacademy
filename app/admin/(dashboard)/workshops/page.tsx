import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminError from "../AdminError";

export const dynamic = "force-dynamic";

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}
function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function AdminWorkshops() {
  let events: any[] = [], orders: any[] = [];
  const sold: Record<string, number> = {};
  const revenue: Record<string, number> = {};
  try {
    const admin = createAdminClient();
    const [{ data: ev, error }, { data: ord }] = await Promise.all([
      admin.from("live_events").select("id, title, starts_at, price, published").gt("price", 0).order("starts_at", { ascending: false }),
      admin.from("orders").select("id, email, name, amount, status, created_at, event_id").eq("product", "workshop").order("created_at", { ascending: false }).limit(200),
    ]);
    if (error) throw new Error(error.message);
    events = ev ?? [];
    orders = ord ?? [];
    for (const o of orders) {
      if (o.status === "paid" && o.event_id) {
        sold[o.event_id] = (sold[o.event_id] || 0) + 1;
        revenue[o.event_id] = (revenue[o.event_id] || 0) + (Number(o.amount) || 0);
      }
    }
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Workshops</h1>
        <div className="mt-6"><AdminError message={(e instanceof Error ? e.message : "Erro.") + " — rode o SQL de workshops (live_events.price / orders.event_id)."} /></div>
      </div>
    );
  }

  const titleById: Record<string, string> = {};
  for (const e of events) titleById[e.id] = e.title;
  const totalPaid = Object.values(sold).reduce((s, v) => s + v, 0);
  const totalRev = Object.values(revenue).reduce((s, v) => s + v, 0);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Workshops (venda avulsa)</h1>
      <p className="mt-1 text-sm text-slate-400">Eventos com preço para não-assinantes. Assinantes participam de graça. Crie e edite em <Link href="/admin/lives" className="text-brand-teal hover:underline">Ensino → Lives</Link>.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="glass rounded-2xl border border-white/8 p-4"><p className="font-display text-2xl font-bold text-white">{events.length}</p><p className="text-xs text-slate-400">Workshops pagos</p></div>
        <div className="glass rounded-2xl border border-white/8 p-4"><p className="font-display text-2xl font-bold text-white">{totalPaid}</p><p className="text-xs text-slate-400">Ingressos vendidos</p></div>
        <div className="glass rounded-2xl border border-white/8 p-4"><p className="font-display text-2xl font-bold text-brand-green">{brl(totalRev)}</p><p className="text-xs text-slate-400">Receita</p></div>
      </div>

      <h2 className="mt-8 font-display text-lg font-bold text-white">Por workshop</h2>
      <div className="mt-4 space-y-3">
        {events.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-slate-500">Nenhum workshop pago ainda. Defina um preço numa Live em Ensino → Lives.</p>}
        {events.map((e) => (
          <div key={e.id} className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 p-4">
            <div className="min-w-0">
              <p className="font-medium text-white">{e.title} {!e.published && <span className="ml-1 rounded-full bg-white/5 px-2 py-0.5 text-[0.6rem] uppercase text-slate-400">rascunho</span>}</p>
              <p className="text-xs text-slate-500">{fmt(e.starts_at)} · {brl(Number(e.price))}</p>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-right"><p className="font-display text-lg font-bold text-white">{sold[e.id] || 0}</p><p className="text-[0.65rem] text-slate-400">vendidos</p></div>
              <div className="text-right"><p className="font-display text-lg font-bold text-brand-green">{brl(revenue[e.id] || 0)}</p><p className="text-[0.65rem] text-slate-400">receita</p></div>
              <a href={`/workshop/${e.id}`} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-brand-teal hover:border-brand-teal/50">Página ↗</a>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-8 font-display text-lg font-bold text-white">Compras recentes</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/8">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
            <tr><th className="px-4 py-3">Comprador</th><th className="px-4 py-3">Workshop</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Data</th></tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {orders.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Nenhuma compra ainda.</td></tr>}
            {orders.map((o) => (
              <tr key={o.id} className="text-slate-200">
                <td className="px-4 py-3">{o.name || o.email || "—"}</td>
                <td className="px-4 py-3 text-slate-400">{titleById[o.event_id] || "—"}</td>
                <td className="px-4 py-3">{o.amount != null ? brl(Number(o.amount)) : "—"}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${o.status === "paid" ? "bg-brand-green/15 text-brand-green" : "bg-white/10 text-slate-400"}`}>{o.status}</span></td>
                <td className="px-4 py-3 text-slate-400">{fmt(o.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
