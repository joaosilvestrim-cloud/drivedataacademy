"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { submitDiagnostic } from "./actions";

type Question = { id: string; prompt: string; options: string[]; competencyName: string };

export default function DiagnosticForm({ questions }: { questions: Question[] }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirming, setConfirming] = useState(false);

  const respondidas = Object.keys(answers).length;
  const faltam = questions.length - respondidas;

  async function send() {
    setBusy(true); setErr("");
    const res = await submitDiagnostic(answers);
    setBusy(false);
    if (!res.ok) { setErr(res.error); setConfirming(false); return; }
    router.refresh();
  }

  return (
    <div className="mt-8">
      <div className="sticky top-0 z-10 -mx-1 mb-5 rounded-xl bg-ink-900/90 px-1 py-3 backdrop-blur">
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-brand-green to-brand-blue transition-all duration-300" style={{ width: `${(respondidas / questions.length) * 100}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-slate-400">{respondidas} de {questions.length} respondidas</p>
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <div key={q.id} className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-brand-teal">{q.competencyName}</p>
            <p className="mt-1.5 font-medium text-white">{i + 1}. {q.prompt}</p>
            <div className="mt-3 space-y-2">
              {q.options.map((opt, idx) => {
                const marcado = answers[q.id] === idx;
                return (
                  <label key={idx} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-2.5 text-sm transition-colors ${marcado ? "border-brand-green/50 bg-brand-green/10 text-white" : "border-white/8 text-slate-300 hover:border-white/20"}`}>
                    <input
                      type="radio"
                      name={q.id}
                      checked={marcado}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: idx }))}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-400"
                    />
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
        {confirming ? (
          <>
            <p className="text-sm font-medium text-white">Enviar o diagnóstico?</p>
            <p className="mt-1 text-sm text-slate-400">
              {faltam > 0 ? `Ainda faltam ${faltam} perguntas. ` : ""}Você responde uma vez só, então não dá para refazer depois.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button onClick={send} disabled={busy} className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 disabled:opacity-60">
                {busy ? "Enviando..." : "Confirmar envio"}
              </button>
              <button onClick={() => setConfirming(false)} disabled={busy} className="text-sm text-slate-400 hover:text-white">Voltar</button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => setConfirming(true)} disabled={respondidas === 0} className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900 disabled:opacity-40">
              Enviar diagnóstico
            </button>
            {faltam > 0 && <span className="text-sm text-slate-400">Faltam {faltam}.</span>}
          </div>
        )}
        {err && <p className="mt-3 text-sm text-red-300">{err}</p>}
      </div>
    </div>
  );
}
