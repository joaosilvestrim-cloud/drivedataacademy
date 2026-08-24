"use client";

import { useState } from "react";
import { submitNps } from "./actions";

export default function NpsPrompt({ courseId, slug }: { courseId: string; slug: string }) {
  const [score, setScore] = useState<number | null>(null);

  const color = (n: number) =>
    n <= 6 ? "border-red-400/40 bg-red-400/10 text-red-300" : n <= 8 ? "border-amber-400/40 bg-amber-400/10 text-amber-300" : "border-brand-green/40 bg-brand-green/10 text-brand-green";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-sm font-semibold text-white">De 0 a 10, o quanto você recomendaria este curso?</p>
      <p className="mt-1 text-xs text-slate-400">Sua nota nos ajuda a melhorar os treinamentos.</p>

      <form action={submitNps} className="mt-4">
        <input type="hidden" name="course_id" value={courseId} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="score" value={score ?? ""} />

        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 11 }, (_, n) => (
            <button
              key={n}
              type="button"
              onClick={() => setScore(n)}
              className={`h-9 w-9 rounded-lg border text-sm font-semibold transition-colors ${score === n ? color(n) + " ring-2 ring-white/20" : "border-white/10 text-slate-300 hover:border-white/30"}`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[0.65rem] text-slate-500"><span>Não recomendaria</span><span>Recomendaria muito</span></div>

        {score !== null && (
          <div className="mt-4 space-y-3">
            <textarea name="comment" rows={2} placeholder="Quer deixar um comentário? (opcional)" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60" />
            <button className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">Enviar avaliação</button>
          </div>
        )}
      </form>
    </div>
  );
}
