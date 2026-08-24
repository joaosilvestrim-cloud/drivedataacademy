import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadProfiles, displayName, BADGE_LABELS } from "@/lib/community";
import Avatar from "@/components/Avatar";
import AdminError from "../AdminError";
import { grantBadge } from "./actions";

export const dynamic = "force-dynamic";

function npsOf(scores: number[]) {
  if (!scores.length) return { nps: null as number | null, n: 0, prom: 0, det: 0 };
  const prom = scores.filter((s) => s >= 9).length;
  const det = scores.filter((s) => s <= 6).length;
  return { nps: Math.round(((prom - det) / scores.length) * 100), n: scores.length, prom, det };
}

export default async function EnsinoPanel({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  try {
    const admin = createAdminClient();
    const [{ data: courses }, { data: enr }, { data: lessons }, { data: prog }, { data: certs }, { data: nps }, { data: points }, { count: fullCount }] =
      await Promise.all([
        admin.from("courses").select("id, title, published").order("position"),
        admin.from("enrollments").select("course_id, user_id"),
        admin.from("lessons").select("course_id"),
        admin.from("lesson_progress").select("course_id, user_id").eq("completed", true),
        admin.from("certificates").select("course_id"),
        admin.from("course_nps").select("course_id, score, comment, user_id, created_at"),
        admin.from("point_events").select("user_id, points"),
        admin.from("memberships").select("*", { count: "exact", head: true }).eq("status", "active"),
      ]);

    const lessonsPer: Record<string, number> = {};
    for (const l of lessons ?? []) lessonsPer[l.course_id] = (lessonsPer[l.course_id] || 0) + 1;
    const enrollPer: Record<string, number> = {};
    for (const e of enr ?? []) enrollPer[e.course_id] = (enrollPer[e.course_id] || 0) + 1;
    const certPer: Record<string, number> = {};
    for (const c of certs ?? []) certPer[c.course_id] = (certPer[c.course_id] || 0) + 1;

    // conclusões: aluno com done>=total do curso
    const donePer: Record<string, Record<string, number>> = {};
    for (const p of prog ?? []) { (donePer[p.course_id] ||= {})[p.user_id] = ((donePer[p.course_id]?.[p.user_id]) || 0) + 1; }
    const completionsPer: Record<string, number> = {};
    for (const cid of Object.keys(donePer)) {
      const total = lessonsPer[cid] || 0;
      if (!total) continue;
      completionsPer[cid] = Object.values(donePer[cid]).filter((d) => d >= total).length;
    }

    const npsPer: Record<string, number[]> = {};
    for (const r of nps ?? []) (npsPer[r.course_id] ||= []).push(r.score);
    const npsGeral = npsOf((nps ?? []).map((r: any) => r.score));

    // ranking
    const totals: Record<string, number> = {};
    for (const e of points ?? []) totals[e.user_id] = (totals[e.user_id] || 0) + (e.points || 0);
    const ranked = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 10);

    const recentComments = (nps ?? []).filter((r: any) => r.comment).sort((a: any, b: any) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 8);
    const ids = [...ranked.map(([id]) => id), ...recentComments.map((r: any) => r.user_id)];
    const { nameById, badgeById } = await loadProfiles(admin, ids);

    const totalEnroll = (enr ?? []).length;
    const totalCompletions = Object.values(completionsPer).reduce((s, v) => s + v, 0);
    const totalCerts = (certs ?? []).length;
    const complRate = totalEnroll ? Math.round((totalCompletions / totalEnroll) * 100) : 0;

    const kpis = [
      { label: "Cursos", value: (courses ?? []).length },
      { label: "Matrículas", value: totalEnroll },
      { label: "Conclusões", value: totalCompletions },
      { label: "Taxa de conclusão", value: complRate + "%" },
      { label: "Certificados", value: totalCerts },
      { label: "Acessos full", value: fullCount ?? 0 },
      { label: "NPS geral", value: npsGeral.nps ?? "—" },
      { label: "Respostas NPS", value: npsGeral.n },
    ];

    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Painel de Ensino</h1>
        <p className="mt-1 text-sm text-slate-400">Desempenho do Academy: engajamento, conclusão, satisfação (NPS) e ranking.</p>

        {searchParams?.ok && <div className="mt-4 rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm text-brand-green">{searchParams.ok}</div>}
        {searchParams?.error && <div className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{searchParams.error}</div>}

        {/* KPIs */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="glass rounded-2xl border border-white/8 p-4">
              <p className="font-display text-2xl font-bold text-white">{k.value}</p>
              <p className="text-xs text-slate-400">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Por curso */}
        <h2 className="mt-8 font-display text-lg font-bold text-white">Por curso</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/8">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr><th className="px-4 py-3">Curso</th><th className="px-4 py-3 text-center">Matrículas</th><th className="px-4 py-3 text-center">Conclusões</th><th className="px-4 py-3 text-center">Certificados</th><th className="px-4 py-3 text-center">NPS</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(courses ?? []).map((c: any) => {
                const en = enrollPer[c.id] || 0;
                const co = completionsPer[c.id] || 0;
                const rate = en ? Math.round((co / en) * 100) : 0;
                const n = npsOf(npsPer[c.id] || []);
                return (
                  <tr key={c.id} className="text-slate-200">
                    <td className="px-4 py-3"><Link href={`/admin/cursos/${c.id}`} className="font-medium text-white hover:text-brand-green">{c.title}</Link>{!c.published && <span className="ml-2 rounded-full bg-white/5 px-2 py-0.5 text-[0.6rem] uppercase text-slate-400">rascunho</span>}</td>
                    <td className="px-4 py-3 text-center text-slate-300">{en}</td>
                    <td className="px-4 py-3 text-center text-slate-300">{co} <span className="text-xs text-slate-500">({rate}%)</span></td>
                    <td className="px-4 py-3 text-center text-slate-300">{certPer[c.id] || 0}</td>
                    <td className="px-4 py-3 text-center">{n.nps == null ? <span className="text-slate-500">—</span> : <span className={`font-semibold ${n.nps >= 50 ? "text-brand-green" : n.nps >= 0 ? "text-amber-300" : "text-red-300"}`}>{n.nps}</span>} <span className="text-[0.65rem] text-slate-500">({n.n})</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Ranking */}
          <div className="glass rounded-2xl border border-white/8 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">Ranking (top 10)</h2>
              <Link href="/conta/ranking" target="_blank" className="text-xs text-brand-green hover:underline">Ver ranking ↗</Link>
            </div>
            <div className="mt-4 space-y-2">
              {ranked.length === 0 && <p className="text-sm text-slate-500">Ninguém pontuou ainda.</p>}
              {ranked.map(([id, pts], i) => (
                <div key={id} className="flex items-center gap-3">
                  <span className="w-5 text-center text-sm font-bold text-slate-400">{i + 1}</span>
                  <Avatar name={displayName(nameById, id)} size="xs" />
                  <span className="flex-1 truncate text-sm text-white">{displayName(nameById, id)}
                    {(badgeById[id] || []).map((b) => <span key={b} className="ml-1.5 rounded-full bg-brand-teal/15 px-2 py-0.5 text-[0.55rem] font-semibold uppercase text-brand-teal">{BADGE_LABELS[b] || b}</span>)}
                  </span>
                  <span className="text-sm font-semibold text-brand-green">{pts} pts</span>
                </div>
              ))}
            </div>
            <form action={grantBadge} className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/8 pt-4">
              <input name="email" required placeholder="e-mail do aluno" className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60" />
              <select name="badge" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white [&>option]:bg-ink-900">
                <option value="fundador">Fundador</option>
                <option value="top">Top do ranking</option>
              </select>
              <button className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15">Conceder selo</button>
            </form>
          </div>

          {/* Comentários NPS */}
          <div className="glass rounded-2xl border border-white/8 p-5">
            <h2 className="font-display text-lg font-bold text-white">Comentários recentes (NPS)</h2>
            <div className="mt-4 space-y-3">
              {recentComments.length === 0 && <p className="text-sm text-slate-500">Sem comentários ainda.</p>}
              {recentComments.map((r: any, i: number) => (
                <div key={i} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                  <div className="flex items-center gap-2">
                    <span className={`grid h-6 w-6 place-items-center rounded-full text-[0.65rem] font-bold ${r.score >= 9 ? "bg-brand-green/20 text-brand-green" : r.score >= 7 ? "bg-amber-400/20 text-amber-300" : "bg-red-400/20 text-red-300"}`}>{r.score}</span>
                    <span className="text-xs text-slate-400">{displayName(nameById, r.user_id)}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-200">{r.comment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Painel de Ensino</h1>
        <div className="mt-6"><AdminError message={(e instanceof Error ? e.message : "Erro.") + " — verifique se o SQL de NPS foi rodado."} /></div>
      </div>
    );
  }
}
