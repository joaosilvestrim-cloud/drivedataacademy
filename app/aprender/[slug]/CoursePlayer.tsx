"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import PandaPlayer from "./PandaPlayer";
import ProtectedPlayer from "./ProtectedPlayer";
import { markLessonDone, addComment } from "./actions";

type Lesson = { id: string; title: string; duration: string | null; type: string; video_provider: string | null; video_id: string | null; yt: string | null; content: string | null; materials: { title: string; url: string }[] };
type SideLesson = { id: string; title: string; duration: string | null };
type Module = { id: string; title: string; locked: boolean; releaseLabel: string | null; lessons: SideLesson[] };
type Comment = { id: string; user_id: string; body: string; status: string; admin_reply: string | null };

export default function CoursePlayer({
  slug, courseId, pandaHost, modules, lessonsById, flatIds, initialId, doneIds, quiz, commentsByLesson, commentNames,
}: {
  slug: string;
  courseId: string;
  pandaHost: string | null;
  modules: Module[];
  lessonsById: Record<string, Lesson>;
  flatIds: string[];
  initialId: string;
  doneIds: string[];
  quiz: { title: string } | null;
  commentsByLesson: Record<string, Comment[]>;
  commentNames: Record<string, string>;
}) {
  const [activeId, setActiveId] = useState(initialId);
  const [done, setDone] = useState<Set<string>>(new Set(doneIds));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pending, start] = useTransition();

  const current = lessonsById[activeId];
  const idx = flatIds.indexOf(activeId);
  const prevId = idx > 0 ? flatIds[idx - 1] : null;
  const nextId = idx >= 0 && idx < flatIds.length - 1 ? flatIds[idx + 1] : null;

  // mantém a URL em sincronia (?l=) sem recarregar, para links/refresh caírem na aula certa
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("l", activeId);
      window.history.replaceState(null, "", u.toString());
    } catch { /* ignora */ }
  }, [activeId]);

  function select(id: string) {
    setActiveId(id);
    setMobileOpen(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function complete() {
    if (!current) return;
    setDone((d) => new Set(d).add(current.id));
    start(() => { markLessonDone(current.id, courseId, slug); });
    if (nextId) select(nextId);
  }

  const comments = commentsByLesson[activeId] || [];
  const materials = current?.materials || [];

  const Sidebar = useMemo(() => (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02]">
      {modules.map((m) => {
        const total = m.lessons.length;
        const completed = m.lessons.filter((l) => done.has(l.id)).length;
        return (
          <div key={m.id} className="border-b border-white/5 last:border-0">
            <div className="flex items-center justify-between gap-2 px-4 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{m.title}</p>
              {m.locked ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-[0.7rem] text-amber-300/80">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M6 10V8a6 6 0 1112 0v2M5 10h14v10H5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {m.releaseLabel}
                </span>
              ) : (
                <span className="shrink-0 text-[0.7rem] text-slate-500">{completed}/{total}</span>
              )}
            </div>
            <ul className="p-2">
              {m.lessons.map((l, li) => {
                const active = l.id === activeId;
                const isDone = done.has(l.id);
                if (m.locked) {
                  return (
                    <li key={l.id}>
                      <div className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-500">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-white/15 text-slate-600">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M6 10V8a6 6 0 1112 0v2M5 10h14v10H5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </span>
                        <span className="flex-1 truncate">{l.title}</span>
                      </div>
                    </li>
                  );
                }
                return (
                  <li key={l.id}>
                    <button
                      onClick={() => select(l.id)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${active ? "bg-white/10 font-medium text-white" : "text-slate-300 hover:bg-white/5"}`}
                    >
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[0.65rem] ${isDone ? "border-brand-green bg-brand-green text-ink-900" : active ? "border-brand-green/60 text-brand-green" : "border-white/20 text-slate-500"}`}>
                        {isDone ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg> : li + 1}
                      </span>
                      <span className="flex-1 truncate">{l.title}</span>
                      {l.duration && <span className="shrink-0 text-xs text-slate-500">{l.duration}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      {quiz && (
        <div className="border-t border-white/5 p-2">
          <Link href={`/aprender/${slug}/avaliacao`} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-brand-green hover:bg-white/5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {quiz.title}
          </Link>
        </div>
      )}
    </div>
  ), [modules, done, activeId, quiz, slug]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0">
        {!current ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-6 py-20 text-center text-slate-400">Este curso ainda não tem aulas publicadas.</div>
        ) : (
          <>
            {current.video_provider === "panda" && current.video_id ? (
              <ProtectedPlayer>
                <PandaPlayer key={current.id} videoId={current.video_id} host={pandaHost} lessonId={current.id} courseId={courseId} slug={slug} />
              </ProtectedPlayer>
            ) : current.yt ? (
              <ProtectedPlayer>
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                  <div className="relative aspect-video">
                    <iframe key={current.id} className="absolute inset-0 h-full w-full" src={`https://www.youtube.com/embed/${current.yt}?rel=0&modestbranding=1`} title={current.title} allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
                  </div>
                </div>
              </ProtectedPlayer>
            ) : current.type === "text" ? (
              <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
                <div className="whitespace-pre-line text-[0.95rem] leading-relaxed text-slate-200">{current.content || "—"}</div>
              </article>
            ) : (
              <div className="grid aspect-video place-items-center rounded-2xl border border-white/10 bg-white/[0.02] text-slate-500">Aula em preparação.</div>
            )}

            <p className="mt-5 text-xs font-medium uppercase tracking-wide text-brand-green">Aula {idx + 1} de {flatIds.length}</p>
            <h1 className="mt-1 font-display text-2xl font-bold text-white">{current.title}</h1>

            {materials.length > 0 && (
              <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                <p className="text-sm font-semibold text-white">Materiais de apoio</p>
                <ul className="mt-3 space-y-2">
                  {materials.map((mat, i) => (
                    <li key={i}>
                      <a href={mat.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-brand-teal hover:underline">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        {mat.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              {prevId ? <button onClick={() => select(prevId)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-white/30 hover:text-white">← Aula anterior</button> : <span />}
              <div className="flex items-center gap-2">
                {nextId && <button onClick={() => select(nextId)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-white/30 hover:text-white">Próxima aula →</button>}
                <button onClick={complete} disabled={pending} className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02] disabled:opacity-70">
                  {done.has(current.id) ? (nextId ? "Concluída · avançar" : "Concluída") : nextId ? "Concluir e avançar" : "Marcar como concluída"}
                </button>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="font-display text-lg font-bold text-white">Comentários</h2>
              <form action={addComment} className="mt-3 space-y-2">
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="lesson_id" value={current.id} />
                <input type="hidden" name="course_id" value={courseId} />
                <textarea name="body" required rows={2} placeholder="Comente ou tire uma dúvida sobre esta aula..." className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60" />
                <div className="flex items-center gap-3">
                  <button className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2 text-sm font-semibold text-ink-900">Comentar</button>
                  <span className="text-xs text-slate-500">Comentários passam por aprovação antes de aparecer.</span>
                </div>
              </form>

              <div className="mt-5 space-y-3">
                {comments.length === 0 && <p className="text-sm text-slate-500">Seja o primeiro a comentar.</p>}
                {comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                    <Avatar name={commentNames[c.user_id] || "Aluno"} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-500">
                        {commentNames[c.user_id] || "Aluno"}
                        {c.status === "pending" && <span className="ml-2 rounded-full bg-amber-400/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-amber-300">em análise</span>}
                      </p>
                      <p className="mt-1 whitespace-pre-line text-sm text-slate-200">{c.body}</p>
                      {c.admin_reply && (
                        <div className="mt-2 rounded-xl border border-brand-blue/25 bg-brand-blue/[0.06] p-3">
                          <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-brand-teal">Resposta da equipe DriveData</p>
                          <p className="mt-1 whitespace-pre-line text-sm text-slate-200">{c.admin_reply}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Sidebar */}
      <div>
        <div className="lg:hidden">
          <button onClick={() => setMobileOpen((o) => !o)} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white">
            Conteúdo do curso
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={`transition-transform ${mobileOpen ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          {mobileOpen && <div className="mt-3">{Sidebar}</div>}
        </div>
        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">{Sidebar}</aside>
      </div>
    </div>
  );
}
