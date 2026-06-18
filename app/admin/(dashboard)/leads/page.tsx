import { createAdminClient } from "@/lib/supabase/admin";
import ExportCsv from "../ExportCsv";

export const dynamic = "force-dynamic";

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default async function LeadsPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("enterprise_leads")
    .select("created_at, name, request_type, email, phone, message")
    .order("created_at", { ascending: false });

  const rows = data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Leads de empresas</h1>
          <p className="mt-1 text-sm text-slate-400">{rows.length} solicitação(ões).</p>
        </div>
        <ExportCsv rows={rows} filename="leads-empresas.csv" />
      </div>

      <div className="mt-6 space-y-4">
        {rows.map((r, i) => (
          <div key={i} className="glass rounded-2xl border border-white/8 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-white">{r.name}</p>
              <span className="text-xs text-slate-500">{fmt(r.created_at)}</span>
            </div>
            {r.request_type && (
              <span className="mt-2 inline-block rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-brand-teal">
                {r.request_type}
              </span>
            )}
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-300">
              <span>{r.email}</span>
              {r.phone && <span>{r.phone}</span>}
            </div>
            {r.message && <p className="mt-3 text-sm text-slate-400">{r.message}</p>}
          </div>
        ))}
        {rows.length === 0 && (
          <div className="rounded-2xl border border-white/8 px-4 py-10 text-center text-slate-500">
            Nenhum lead ainda.
          </div>
        )}
      </div>
    </div>
  );
}
