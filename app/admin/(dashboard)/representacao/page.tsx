import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadProfiles, displayName } from "@/lib/community";
import AdminError from "../AdminError";
import { setRepStatus } from "./actions";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  portal: "Venda Portal BI", parceria: "Parceria em projeto", mentoria: "Mentoria", candidatura: "Candidatura", marketplace: "Marketplace",
};
const STATUS: Record<string, { label: string; cls: string }> = {
  novo: { label: "Novo", cls: "bg-brand-green/15 text-brand-green" },
  em_andamento: { label: "Em andamento", cls: "bg-amber-400/15 text-amber-300" },
  concluido: { label: "Concluído", cls: "bg-brand-blue/15 text-brand-teal" },
  recusado: { label: "Recusado", cls: "bg-white/5 text-slate-400" },
};
const FILTERS = [{ k: "all", l: "Todos" }, { k: "portal", l: "Portal BI" }, { k: "parceria", l: "Parcerias" }, { k: "mentoria", l: "Mentorias" }, { k: "candidatura", l: "Candidaturas" }, { k: "marketplace", l: "Marketplace" }];

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

export default async function AdminRepresentacao({ searchParams }: { searchParams: { f?: string } }) {
  const f = searchParams?.f || "all";
  let rows: any[] = [], nameById: Record<string, string> = {};
  const counts: Record<string, number> = { all: 0 };
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("rep_requests").select("id, user_id, type, payload, status, created_at").order("created_at", { ascending: false }).limit(300);
    if (error) throw new Error(error.message);
    const all = data ?? [];
    for (const r of all) { counts.all++; counts[r.type] = (counts[r.type] || 0) + 1; }
    rows = f === "all" ? all : all.filter((r: any) => r.type === f);
    nameById = (await loadProfiles(admin, all.map((r: any) => r.user_id))).nameById;
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Representação</h1>
        <div className="mt-6"><AdminError message={(e instanceof Error ? e.message : "Erro.") + " — rode o SQL de rep_requests no Supabase."} /></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Representação DriveData</h1>
      <p className="mt-1 text-sm text-slate-400">Solicitações dos alunos: revenda do Portal, parcerias, mentorias, candidaturas e marketplace.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((o) => (
          <Link key={o.k} href={`/admin/representacao?f=${o.k}`} className={`rounded-full border px-4 py-1.5 text-sm font-medium ${f === o.k ? "border-brand-green/50 bg-brand-green/10 text-brand-green" : "border-white/10 text-slate-300 hover:border-white/30"}`}>{o.l} <span className="ml-1 text-xs opacity-70">{counts[o.k] ?? 0}</span></Link>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {rows.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 px-4 py-12 text-center text-slate-500">Nada por aqui.</p>}
        {rows.map((r) => {
          const st = STATUS[r.status] || STATUS.novo;
          const entries = Object.entries(r.payload || {}).filter(([, v]) => v != null && String(v).trim() !== "");
          return (
            <div key={r.id} className="glass rounded-2xl border border-white/8 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[0.6rem] font-semibold uppercase text-slate-300">{TYPE_LABEL[r.type] || r.type}</span>
                <span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase ${st.cls}`}>{st.label}</span>
                <span className="text-sm font-medium text-white">{displayName(nameById, r.user_id)}</span>
                <span className="text-xs text-slate-500">{fmt(r.created_at)}</span>
              </div>
              <dl className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                {entries.map(([k, v]) => (
                  <div key={k} className="text-sm">
                    <dt className="text-[0.7rem] uppercase tracking-wide text-slate-500">{k.replace(/_/g, " ")}</dt>
                    <dd className="whitespace-pre-line text-slate-200">{String(v)}</dd>
                  </div>
                ))}
              </dl>
              <form action={setRepStatus} className="mt-3 flex items-center gap-2 border-t border-white/8 pt-3">
                <input type="hidden" name="id" value={r.id} />
                <select name="status" defaultValue={r.status} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white [&>option]:bg-ink-900">
                  <option value="novo">Novo</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="concluido">Concluído</option>
                  <option value="recusado">Recusado</option>
                </select>
                <button className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15">Atualizar status</button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
