import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminError from "../AdminError";

export const dynamic = "force-dynamic";

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

export default async function IaLogsPage({ searchParams }: { searchParams: { f?: string } }) {
  const f = searchParams?.f || "all";
  let logs: any[] = [];
  let total = 0, escalatedCount = 0;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("ai_chat_logs").select("id, email, question, answer, escalated, ticket_id, created_at").order("created_at", { ascending: false }).limit(300);
    if (error) throw new Error(error.message);
    const all = data ?? [];
    total = all.length;
    escalatedCount = all.filter((l: any) => l.escalated).length;
    logs = f === "escalated" ? all.filter((l: any) => l.escalated) : all;
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Assistente (IA)</h1>
        <div className="mt-6"><AdminError message={(e instanceof Error ? e.message : "Erro.") + " — rode o SQL de ai_chat_logs no Supabase."} /></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Assistente (IA)</h1>
      <p className="mt-1 text-sm text-slate-400">Todas as perguntas feitas ao mascote e o que foi encaminhado para o time.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="glass rounded-2xl border border-white/8 p-4"><p className="font-display text-2xl font-bold text-white">{total}</p><p className="text-xs text-slate-400">Conversas (últimas 300)</p></div>
        <div className="glass rounded-2xl border border-white/8 p-4"><p className="font-display text-2xl font-bold text-brand-green">{escalatedCount}</p><p className="text-xs text-slate-400">Encaminhadas ao time</p></div>
        <div className="glass rounded-2xl border border-white/8 p-4"><p className="font-display text-2xl font-bold text-white">{total - escalatedCount}</p><p className="text-xs text-slate-400">Resolvidas pela IA</p></div>
      </div>

      <div className="mt-6 flex gap-2">
        {[{ k: "all", l: "Todas" }, { k: "escalated", l: "Só encaminhadas" }].map((o) => (
          <Link key={o.k} href={`/admin/ia?f=${o.k}`} className={`rounded-full border px-4 py-1.5 text-sm font-medium ${f === o.k ? "border-brand-green/50 bg-brand-green/10 text-brand-green" : "border-white/10 text-slate-300 hover:border-white/30"}`}>{o.l}</Link>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {logs.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 px-4 py-12 text-center text-slate-500">Nenhuma conversa registrada ainda.</p>}
        {logs.map((l) => (
          <div key={l.id} className="glass rounded-2xl border border-white/8 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-500">{l.email || "—"} · {fmt(l.created_at)}</span>
              {l.escalated ? (
                <Link href={l.ticket_id ? `/admin/suporte/${l.ticket_id}` : "/admin/suporte"} className="rounded-full bg-brand-blue/15 px-2.5 py-1 text-xs font-semibold text-brand-cyan hover:underline">Encaminhado ao time →</Link>
              ) : (
                <span className="rounded-full bg-brand-green/15 px-2.5 py-1 text-xs font-semibold text-brand-green">Resolvido pela IA</span>
              )}
            </div>
            <p className="mt-2 text-sm font-medium text-white">P: {l.question || "—"}</p>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-300">R: {l.answer || "—"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
