"use client";

import Reveal from "./Reveal";
import { useT } from "@/lib/i18n/LanguageProvider";

export default function MethodSection() {
  const t = useT();
  const steps = t.method.steps.map((s, i) => ({ ...s, n: String(i + 1).padStart(2, "0") }));

  return (
    <section id="metodo" className="relative mx-auto max-w-7xl px-6 py-24 scroll-mt-24">
      <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <Reveal>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-green">{t.method.eyebrow}</p>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">
              {t.method.titlePre} <span className="text-gradient-blue">{t.method.titleGrad}</span>
            </h2>
            <p className="mt-5 text-slate-300/90">{t.method.text}</p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              {t.method.badges.map((b) => (
                <div key={b.k} className="glass rounded-2xl border border-white/8 px-4 py-4">
                  <p className="font-display text-base font-bold text-white">{b.k}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{b.v}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <div className="relative">
          <div className="absolute left-[27px] top-4 bottom-4 w-px bg-gradient-to-b from-brand-green/60 via-brand-teal/30 to-brand-blue/60" />
          <div className="space-y-5">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.1}>
                <div className="glass card-hover relative flex gap-5 rounded-2xl border border-white/8 p-5">
                  <span className="z-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-green to-brand-blue font-display text-lg font-bold text-ink-900">
                    {s.n}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold text-white">{s.title}</h3>
                    <p className="mt-1 text-sm text-slate-300/90">{s.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
