"use client";

import { useState } from "react";
import FunilForm from "../_funis/FunilForm";
import { FUNIS_REPRESENTACAO } from "../_funis/definicoes";

/* Menu dos funis que continuam aqui. Mentoria e Marketplace saíram para rota e
   item de menu próprios, porque o aluno procurava os dois pelo menu e não por
   dentro de Representação. As definições e o formulário vivem em _funis. */

export default function RepClient() {
  const [active, setActive] = useState<string>(FUNIS_REPRESENTACAO[0].key);
  const form = FUNIS_REPRESENTACAO.find((f) => f.key === active)!;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <nav aria-label="Caminhos de representação" className="space-y-2">
        {FUNIS_REPRESENTACAO.map((f) => {
          const on = f.key === active;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setActive(f.key)}
              aria-current={on ? "true" : undefined}
              className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${on ? "border-brand-green/40 bg-brand-green/[0.07]" : "border-white/8 bg-white/[0.02] hover:border-white/20"}`}
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${on ? "bg-gradient-to-br from-brand-green to-brand-blue text-ink-900" : "bg-white/5 text-slate-300"}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={f.icon} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <span className={`text-sm font-semibold ${on ? "text-white" : "text-slate-300"}`}>{f.title}</span>
            </button>
          );
        })}
      </nav>

      {/* A troca de funil remonta o formulário do zero: `key` zera o estado e o
          aluno não encontra campo preenchido do caminho anterior. */}
      <FunilForm key={form.key} form={form} />
    </div>
  );
}
