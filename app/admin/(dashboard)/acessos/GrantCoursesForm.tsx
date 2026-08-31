"use client";

import { grantCourses } from "./actions";

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";

export default function GrantCoursesForm({ courses }: { courses: { id: string; title: string }[] }) {
  return (
    <form action={grantCourses} className="glass rounded-2xl border border-white/8 p-5">
      <p className="text-sm font-semibold text-white">Liberar treinamentos específicos</p>
      <p className="mt-1 text-xs text-slate-400">Matricula o aluno só nos treinamentos marcados, na hora. O aluno precisa já ter conta.</p>
      <input name="email" type="email" required placeholder="email@aluno.com" className={`${field} mt-4`} />

      {courses.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">Nenhum curso cadastrado ainda.</p>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {courses.map((c) => (
            <label key={c.id} className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-sm text-slate-200">
              <input type="checkbox" name="course_ids" value={c.id} className="h-4 w-4 accent-emerald-400" />
              {c.title}
            </label>
          ))}
        </div>
      )}

      <button className="mt-4 rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
        Liberar treinamentos
      </button>
    </form>
  );
}
