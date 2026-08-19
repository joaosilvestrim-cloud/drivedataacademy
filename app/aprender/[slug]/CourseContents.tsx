"use client";

import { useState } from "react";
import Link from "next/link";

type Lesson = { id: string; title: string; duration: string | null };
type Module = { id: string; title: string; lessons: Lesson[]; locked?: boolean; releaseLabel?: string | null };

export default function CourseContents({
  slug,
  modules,
  doneIds,
  currentId,
  quiz,
}: {
  slug: string;
  modules: Module[];
  doneIds: string[];
  currentId?: string;
  quiz: { title: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const done = new Set(doneIds);

  const List = (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02]">
      {modules.map((m, mi) => {
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
                const active = l.id === currentId;
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
                    <Link
                      href={`/aprender/${slug}?l=${l.id}`}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${active ? "bg-white/10 font-medium text-white" : "text-slate-300 hover:bg-white/5"}`}
                    >
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[0.65rem] ${isDone ? "border-brand-green bg-brand-green text-ink-900" : active ? "border-brand-green/60 text-brand-green" : "border-white/20 text-slate-500"}`}>
                        {isDone ? (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        ) : (
                          li + 1
                        )}
                      </span>
                      <span className="flex-1 truncate">{l.title}</span>
                      {l.duration && <span className="shrink-0 text-xs text-slate-500">{l.duration}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      {quiz && (
        <div className="border-t border-white/5 p-2">
          <Link href={`/aprender/${slug}/avaliacao`} onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-brand-green hover:bg-white/5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {quiz.title}
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile: botão + painel recolhível */}
      <div className="lg:hidden">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white"
        >
          Conteúdo do curso
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={`transition-transform ${open ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        {open && <div className="mt-3">{List}</div>}
      </div>

      {/* Desktop: sempre visível */}
      <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">{List}</aside>
    </>
  );
}
