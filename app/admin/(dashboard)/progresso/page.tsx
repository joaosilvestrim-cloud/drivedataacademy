import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadProfiles, displayName } from "@/lib/community";
import Avatar from "@/components/Avatar";
import AdminError from "../AdminError";

export const dynamic = "force-dynamic";

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}
function Bar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-brand-green to-brand-blue" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400">{pct}%</span>
    </div>
  );
}

export default async function ProgressoPage({ searchParams }: { searchParams: { c?: string } }) {
  try {
    const admin = createAdminClient();
    const [{ data: courses }, { data: lessons }, { data: prog }] = await Promise.all([
      admin.from("courses").select("id, title, published").order("position"),
      admin.from("lessons").select("id, course_id"),
      admin.from("lesson_progress").select("user_id, course_id, updated_at").eq("completed", true),
    ]);

    const lessonsPer: Record<string, number> = {};
    for (const l of lessons ?? []) lessonsPer[l.course_id] = (lessonsPer[l.course_id] || 0) + 1;

    // done[course][user] = nº de aulas concluídas ; lastByCourse ; lastByCourseUser
    const done: Record<string, Record<string, number>> = {};
    const lastByCourse: Record<string, string> = {};
    const lastByCU: Record<string, Record<string, string>> = {};
    const now = Date.now();
    const active7 = new Set<string>();
    const active30 = new Set<string>();
    let done7 = 0;
    for (const p of prog ?? []) {
      (done[p.course_id] ||= {})[p.user_id] = ((done[p.course_id]?.[p.user_id]) || 0) + 1;
      const t = p.updated_at || "";
      if (t > (lastByCourse[p.course_id] || "")) lastByCourse[p.course_id] = t;
      (lastByCU[p.course_id] ||= {});
      if (t > (lastByCU[p.course_id][p.user_id] || "")) lastByCU[p.course_id][p.user_id] = t;
      const age = t ? now - new Date(t).getTime() : Infinity;
      if (age <= 7 * 864e5) { active7.add(p.user_id); done7++; }
      if (age <= 30 * 864e5) active30.add(p.user_id);
    }

    // métricas por curso
    const rows = (courses ?? []).map((c: any) => {
      const total = lessonsPer[c.id] || 0;
      const users = done[c.id] || {};
      const started = Object.keys(users).length;
      const completed = total ? Object.values(users).filter((d) => d >= total).length : 0;
      const inProgress = started - completed;
      const avg = started && total
        ? Math.round((Object.values(users).reduce((s, d) => s + Math.min(d / total, 1), 0) / started) * 100)
        : 0;
      return { ...c, total, started, completed, inProgress, avg, last: lastByCourse[c.id] || null, rate: started ? Math.round((completed / started) * 100) : 0 };
    });

    const totalStarted = rows.reduce((s, r) => s + r.started, 0);
    const totalCompleted = rows.reduce((s, r) => s + r.completed, 0);
    const totalLessonsDone = (prog ?? []).length;

    const kpis = [
      { label: "Ativos (7 dias)", value: active7.size },
      { label: "Ativos (30 dias)", value: active30.size },
      { label: "Aulas concluídas (7d)", value: done7 },
      { label: "Aulas concluídas (total)", value: totalLessonsDone },
      { label: "Começaram (curso·aluno)", value: totalStarted },
      { label: "Concluíram", value: totalCompleted },
    ];

    // Drilldown: alunos de um curso selecionado
    const selected = searchParams?.c && (courses ?? []).find((c: any) => c.id === searchParams.c);
    let studentRows: any[] = [];
    let nameById: Record<string, string> = {};
    if (selected) {
      const total = lessonsPer[selected.id] || 0;
      const users = done[selected.id] || {};
      const uids = Object.keys(users);
      nameById = (await loadProfiles(admin, uids)).nameById;
      studentRows = uids
        .map((uid) => {
          const d = users[uid];
          const pct = total ? Math.round(Math.min(d / total, 1) * 100) : 0;
          return { uid, d, total, pct, last: lastByCU[selected.id]?.[uid] || null, complete: total > 0 && d >= total };
        })
        .sort((a, b) => b.pct - a.pct || (b.last || "").localeCompare(a.last || ""));
    }

    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Progresso dos treinamentos</h1>
        <p className="mt-1 text-sm text-slate-400">Quem está fazendo, quanto avançou e quem concluiu. Clique num curso para ver aluno por aluno.</p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {kpis.map((k) => (
            <div key={k.label} className="glass rounded-2xl border border-white/8 p-4">
              <p className="font-display text-2xl font-bold text-white">{k.value}</p>
              <p className="text-xs text-slate-400">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Por curso */}
        <h2 className="mt-8 font-display text-lg font-bold text-white">Por treinamento</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/8">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Treinamento</th>
                <th className="px-4 py-3 text-center">Aulas</th>
                <th className="px-4 py-3 text-center">Começaram</th>
                <th className="px-4 py-3 text-center">Em andamento</th>
                <th className="px-4 py-3 text-center">Concluíram</th>
                <th className="px-4 py-3">Progresso médio</th>
                <th className="px-4 py-3">Última atividade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">Nenhum curso ainda.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id} className={`text-slate-200 ${selected && selected.id === r.id ? "bg-white/[0.04]" : ""}`}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/progresso?c=${r.id}`} className="font-medium text-white hover:text-brand-green">{r.title}</Link>
                    {!r.published && <span className="ml-2 rounded-full bg-white/5 px-2 py-0.5 text-[0.6rem] uppercase text-slate-400">rascunho</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-400">{r.total}</td>
                  <td className="px-4 py-3 text-center text-slate-300">{r.started}</td>
                  <td className="px-4 py-3 text-center text-amber-300/90">{r.inProgress}</td>
                  <td className="px-4 py-3 text-center text-brand-green">{r.completed} <span className="text-xs text-slate-500">({r.rate}%)</span></td>
                  <td className="px-4 py-3"><Bar pct={r.avg} /></td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-400">{fmt(r.last)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Drilldown por aluno */}
        {selected && (
          <>
            <div className="mt-8 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">Alunos em “{selected.title}”</h2>
              <Link href="/admin/progresso" className="text-xs text-slate-400 hover:text-white">Limpar seleção</Link>
            </div>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/8">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
                  <tr><th className="px-4 py-3">Aluno</th><th className="px-4 py-3">Progresso</th><th className="px-4 py-3 text-center">Aulas</th><th className="px-4 py-3">Última atividade</th><th className="px-4 py-3 text-right">Ação</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {studentRows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Ninguém começou este treinamento ainda.</td></tr>}
                  {studentRows.map((s) => (
                    <tr key={s.uid} className="text-slate-200">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={displayName(nameById, s.uid)} size="xs" />
                          <span className="font-medium text-white">{displayName(nameById, s.uid)}</span>
                          {s.complete && <span className="rounded-full bg-brand-green/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-brand-green">concluiu</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3"><Bar pct={s.pct} /></td>
                      <td className="px-4 py-3 text-center text-slate-400">{s.d}/{s.total}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-400">{fmt(s.last)}</td>
                      <td className="px-4 py-3 text-right"><Link href={`/admin/alunos/${s.uid}`} className="text-xs text-brand-green hover:underline">Ver aluno</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="mt-6 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-xs text-slate-400">
          "Começaram" = concluiu ao menos 1 aula. "Progresso médio" e "Última atividade" usam as aulas marcadas como concluídas (inclui o automático do vídeo).
        </div>
      </div>
    );
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Progresso dos treinamentos</h1>
        <div className="mt-6"><AdminError message={e instanceof Error ? e.message : "Erro ao carregar."} /></div>
      </div>
    );
  }
}
