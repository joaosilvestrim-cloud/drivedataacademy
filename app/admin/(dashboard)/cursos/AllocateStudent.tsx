"use client";

import { useMemo, useRef, useState } from "react";
import { enrollInCourse } from "./actions";

type Student = { id: string; name: string; email: string };

export default function AllocateStudent({ courseId, students }: { courseId: string; students: Student[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Student | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = term ? students.filter((s) => s.name.toLowerCase().includes(term) || s.email.toLowerCase().includes(term)) : students;
    return base.slice(0, 8);
  }, [q, students]);

  function pick(s: Student) {
    setPicked(s);
    setQ(s.name ? `${s.name} · ${s.email}` : s.email);
    setOpen(false);
  }

  return (
    <form ref={formRef} action={enrollInCourse} className="mt-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <input type="hidden" name="course_id" value={courseId} />
      <input type="hidden" name="user_id" value={picked?.id ?? ""} />
      <p className="mb-2 text-sm font-semibold text-white">Alocar aluno neste curso</p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[260px] flex-1">
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPicked(null); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={students.length ? "Buscar aluno por nome ou e-mail..." : "Nenhum aluno disponível"}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60"
          />
          {open && results.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-white/10 bg-ink-800 shadow-xl">
              {results.map((s) => (
                <li key={s.id}>
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); pick(s); }} className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-white/5">
                    <span className="text-sm text-white">{s.name || "(sem nome)"}</span>
                    <span className="text-xs text-slate-400">{s.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {open && q.trim() && results.length === 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-xl border border-white/10 bg-ink-800 px-3 py-2 text-xs text-slate-400 shadow-xl">Nenhum aluno encontrado. Crie a conta em Acessos.</div>
          )}
        </div>
        <button disabled={!picked} className="rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2 text-sm font-semibold text-ink-900 disabled:opacity-50">Alocar</button>
      </div>
      <p className="mt-2 text-xs text-slate-500">Selecione um aluno da lista. Só aparecem alunos que ainda não estão neste curso.</p>
    </form>
  );
}
