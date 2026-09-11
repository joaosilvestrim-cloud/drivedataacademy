import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadProfiles, displayName } from "@/lib/community";
import Avatar from "@/components/Avatar";
import { Status, ICON } from "@/components/ui/primitives";
import { DataTable, SortTh, Tr, Cell } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/layout";
import AdminError from "../AdminError";

export const dynamic = "force-dynamic";

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}
/* Barra de progresso local. Continua sendo a mesma leitura de antes; o que
   ganhou foi nome, valor e limites anunciáveis. O número ao lado nunca sai,
   então a informação não depende da barra nem da cor. */
function Bar({ pct, nome }: { pct: number; nome: string }) {
  return (
    <span className="flex items-center gap-2">
      <span
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={nome}
        className="block h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-ds-line"
      >
        <span className="block h-full rounded-full bg-ds-accent" style={{ width: `${pct}%` }} />
      </span>
      <span className="font-mono text-caption tabular-nums text-ds-text-2">{pct}%</span>
    </span>
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

        {/* Relatório por treinamento. Comparar cursos é o trabalho aqui, então
            a tabela fica no tablet e no desktop, e o celular vira lista. */}
        <section className="mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-ds-line pb-2.5">
            <h2 className="font-display text-section font-semibold text-ds-text">Por treinamento</h2>
            <span className="text-meta uppercase text-ds-text-3">
              {rows.length} {rows.length === 1 ? "treinamento" : "treinamentos"}
            </span>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              title="Nenhum curso ainda"
              description="Crie um treinamento para começar a acompanhar o progresso dos alunos."
            />
          ) : (
            <>
              <div className="mt-4 hidden tablet:block">
                <DataTable caption="Progresso por treinamento: aulas, alunos que começaram, em andamento, concluíram e progresso médio">
                  <thead>
                    <tr>
                      <SortTh className="w-full">Treinamento</SortTh>
                      <SortTh numeric>Aulas</SortTh>
                      <SortTh numeric>Começaram</SortTh>
                      <SortTh numeric className="hidden lg:table-cell">Em andamento</SortTh>
                      <SortTh numeric>Concluíram</SortTh>
                      <SortTh>Progresso médio</SortTh>
                      <SortTh>Última atividade</SortTh>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <Tr key={r.id} className={selected && selected.id === r.id ? "bg-ds-raised/60" : undefined}>
                        <Cell className="max-w-0">
                          <span className="flex min-w-0 items-center gap-2">
                            <Link
                              href={`/admin/progresso?c=${r.id}`}
                              aria-current={selected && selected.id === r.id ? "true" : undefined}
                              className="min-w-0 truncate font-medium text-ds-text underline decoration-transparent underline-offset-4 transition-colors duration-fast ease-ds hover:decoration-ds-line"
                            >
                              {r.title}
                            </Link>
                            {!r.published && <Status>Rascunho</Status>}
                          </span>
                        </Cell>
                        <Cell numeric muted>{r.total}</Cell>
                        <Cell numeric>{r.started}</Cell>
                        <Cell numeric muted className="hidden lg:table-cell">{r.inProgress}</Cell>
                        <Cell numeric className="whitespace-nowrap">
                          {r.completed} <span className="text-caption text-ds-text-3">({r.rate}%)</span>
                        </Cell>
                        <Cell><Bar pct={r.avg} nome={`Progresso médio em ${r.title}`} /></Cell>
                        <Cell muted className="whitespace-nowrap">{fmt(r.last)}</Cell>
                      </Tr>
                    ))}
                  </tbody>
                </DataTable>
              </div>

              <ul className="mt-2 flex flex-col tablet:hidden">
                {rows.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/admin/progresso?c=${r.id}`}
                      className="flex items-center gap-3 border-b border-ds-line-soft py-3.5 transition-colors duration-fast ease-ds hover:bg-ds-raised/50"
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-body-sm font-medium text-ds-text">{r.title}</span>
                          {!r.published && <Status>Rascunho</Status>}
                        </span>
                        <Bar pct={r.avg} nome={`Progresso médio em ${r.title}`} />
                        <span className="text-caption text-ds-text-3">
                          <span className="font-mono tabular-nums">{r.total}</span> aulas ·{" "}
                          <span className="font-mono tabular-nums">{r.started}</span> começaram ·{" "}
                          <span className="font-mono tabular-nums">{r.inProgress}</span> em andamento ·{" "}
                          <span className="font-mono tabular-nums">{r.completed}</span> concluíram ({r.rate}%)
                        </span>
                        <span className="text-caption text-ds-text-3">Última atividade: {fmt(r.last)}</span>
                      </span>
                      <ChevronRight size={ICON.md} strokeWidth={ICON.stroke} aria-hidden="true" className="shrink-0 text-ds-text-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* Recorte por aluno do treinamento escolhido. O parâmetro c não
            filtra a tabela acima: ele abre esta segunda leitura. */}
        {selected && (
          <section className="mt-10">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-ds-line pb-2.5">
              <h2 className="font-display text-section font-semibold text-ds-text">Alunos em “{selected.title}”</h2>
              <Link href="/admin/progresso" className="text-label text-ds-text-3 underline decoration-ds-line underline-offset-4 transition-colors duration-fast ease-ds hover:text-ds-text-2">
                Limpar seleção
              </Link>
            </div>

            {studentRows.length === 0 ? (
              <EmptyState
                title="Ninguém começou este treinamento ainda"
                description="A lista aparece assim que o primeiro aluno concluir uma aula."
              />
            ) : (
              <>
                <div className="mt-4 hidden tablet:block">
                  <DataTable caption={`Alunos em ${selected.title}, com progresso, aulas concluídas e última atividade`}>
                    <thead>
                      <tr>
                        <SortTh className="w-full">Aluno</SortTh>
                        <SortTh>Progresso</SortTh>
                        <SortTh numeric>Aulas</SortTh>
                        <SortTh>Última atividade</SortTh>
                        <SortTh className="text-right">Ação</SortTh>
                      </tr>
                    </thead>
                    <tbody>
                      {studentRows.map((st) => (
                        <Tr key={st.uid}>
                          <Cell className="max-w-0">
                            <span className="flex min-w-0 items-center gap-2.5">
                              <Avatar name={displayName(nameById, st.uid)} size="xs" />
                              <span className="min-w-0 truncate font-medium text-ds-text">{displayName(nameById, st.uid)}</span>
                              {st.complete && <Status tone="accent">Concluiu</Status>}
                            </span>
                          </Cell>
                          <Cell><Bar pct={st.pct} nome={`Progresso de ${displayName(nameById, st.uid)}`} /></Cell>
                          <Cell numeric muted className="whitespace-nowrap">{st.d}/{st.total}</Cell>
                          <Cell muted className="whitespace-nowrap">{fmt(st.last)}</Cell>
                          <Cell className="whitespace-nowrap text-right">
                            <Link href={`/admin/alunos/${st.uid}`} className="text-caption text-ds-info underline decoration-ds-line underline-offset-4 hover:decoration-ds-info">
                              Ver aluno<span className="sr-only"> {displayName(nameById, st.uid)}</span>
                            </Link>
                          </Cell>
                        </Tr>
                      ))}
                    </tbody>
                  </DataTable>
                </div>

                <ul className="mt-2 flex flex-col tablet:hidden">
                  {studentRows.map((st) => (
                    <li key={st.uid}>
                      <Link
                        href={`/admin/alunos/${st.uid}`}
                        className="flex items-center gap-3 border-b border-ds-line-soft py-3.5 transition-colors duration-fast ease-ds hover:bg-ds-raised/50"
                      >
                        <Avatar name={displayName(nameById, st.uid)} size="xs" />
                        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-body-sm font-medium text-ds-text">{displayName(nameById, st.uid)}</span>
                            {st.complete && <Status tone="accent">Concluiu</Status>}
                          </span>
                          <Bar pct={st.pct} nome={`Progresso de ${displayName(nameById, st.uid)}`} />
                          <span className="text-caption text-ds-text-3">
                            <span className="font-mono tabular-nums">{st.d}/{st.total}</span> aulas · {fmt(st.last)}
                          </span>
                        </span>
                        <ChevronRight size={ICON.md} strokeWidth={ICON.stroke} aria-hidden="true" className="shrink-0 text-ds-text-3" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
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
