"use client";

import Reveal from "./Reveal";
import { useT } from "@/lib/i18n/LanguageProvider";

export default function MethodSection() {
  const t = useT();
  const steps = t.method.steps.map((s, i) => ({ ...s, n: String(i + 1).padStart(2, "0") }));

  return (
    <section id="metodo" className="escuro scroll-mt-24 bg-marca">
      <div className="mx-auto grid max-w-[1200px] gap-14 px-6 py-24 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal>
          <div>
            <p className="text-sm font-semibold text-slate-300">{t.method.eyebrow}</p>
            <h2 className="grito mt-4 text-[2.8rem] text-marca-verde sm:text-[4rem]">
              {t.method.titlePre} {t.method.titleGrad}
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-200">{t.method.text}</p>
            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6">
              {t.method.badges.map((b) => (
                <div key={b.k} className="border-t border-white/15 pt-4">
                  <dt className="text-lg font-bold text-white">{b.k}</dt>
                  <dd className="mt-1 text-sm text-slate-300">{b.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>

        {/* O método é uma sequência de verdade: o número diz a ordem. */}
        <ol className="self-center border-b border-white/15">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08}>
              <li className="flex gap-6 border-t border-white/15 py-6">
                <span className="w-12 shrink-0 font-mono text-2xl font-medium tabular-nums text-marca-verde">{s.n}</span>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-white">{s.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-slate-300">{s.desc}</p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
