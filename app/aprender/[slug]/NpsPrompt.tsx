"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";

import { useState } from "react";
import { submitNps } from "./actions";

export default function NpsPrompt({ courseId, slug }: { courseId: string; slug: string }) {
  const tr = usarTraducao();
  const [score, setScore] = useState<number | null>(null);

  const color = (n: number) =>
    n <= 6 ? "border-red-400/40 bg-red-400/10 text-red-300" : n <= 8 ? "border-amber-400/40 bg-amber-400/10 text-amber-300" : "border-acento/40 bg-brand-green/10 text-acento";

  return (
    <div className="rounded-2xl border border-tinta/10 bg-tinta/[0.03] p-5">
      <p className="text-sm font-semibold text-tinta">{tr("De 0 a 10, o quanto você recomendaria este curso?")}</p>
      <p className="mt-1 text-xs text-slate-400">{tr("Sua nota nos ajuda a melhorar os treinamentos.")}</p>

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
              className={`h-9 w-9 rounded-lg border text-sm font-semibold transition-colors ${score === n ? color(n) + " ring-2 ring-tinta/20" : "border-tinta/10 text-slate-300 hover:border-tinta/30"}`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[0.65rem] text-slate-500"><span>{tr("Não recomendaria")}</span><span>{tr("Recomendaria muito")}</span></div>

        {score !== null && (
          <div className="mt-4 space-y-3">
            <textarea name="comment" rows={2} placeholder={tr("Quer deixar um comentário? (opcional)")} className="w-full rounded-xl border border-tinta/10 bg-tinta/5 px-4 py-2.5 text-sm text-tinta placeholder:text-slate-500 outline-none focus:border-acento/60" />
            <button className="rounded-xl bg-marca-verde px-5 py-2.5 text-sm font-semibold text-sobre-acento transition-transform hover:scale-[1.02]">{tr("Enviar avaliação")}</button>
          </div>
        )}
      </form>
    </div>
  );
}
