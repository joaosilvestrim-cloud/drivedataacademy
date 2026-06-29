"use client";

import Reveal from "./Reveal";
import { useT } from "@/lib/i18n/LanguageProvider";

// Números fixos; rótulos vêm do dicionário (instructor.statLabels).
const STAT_VALUES = ["+15 anos", "+350", "+1.000"];

// Dados fixos do fundador (nome/foto); cargo e bio vêm do dicionário.
const FOUNDER_META = [
  { name: "Tamires Cavani", initials: "TC", photo: "/tamires-cavani.png", objectPosition: "30% 18%" },
  { name: "Reed Lopes", initials: "RL", photo: "/reed-lopes.jpg", objectPosition: "50% 25%" },
];

export default function InstructorSection() {
  const t = useT();
  const stats = STAT_VALUES.map((v, i) => ({ v, l: t.instructor.statLabels[i] }));
  const founders = FOUNDER_META.map((f, i) => ({
    ...f,
    role: t.instructor.roles[i],
    bio: t.instructor.bios[i],
  }));

  return (
    <section id="instrutora" className="relative mx-auto max-w-7xl px-6 py-24 scroll-mt-24">
      <Reveal>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-green">{t.instructor.eyebrow}</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">
            {t.instructor.titlePre} <span className="text-gradient">{t.instructor.titleGrad}</span>
          </h2>
          <p className="mt-5 text-slate-300/90">{t.instructor.intro}</p>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mx-auto mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.l} className="glass rounded-2xl border border-white/8 px-4 py-5 text-center">
              <p className="font-display text-2xl font-bold text-gradient-blue">{s.v}</p>
              <p className="mt-1 text-xs text-slate-400">{s.l}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Fundadores */}
      <div className="mt-20">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-green">
              {t.instructor.foundersEyebrow}
            </p>
            <h3 className="mt-3 font-display text-2xl font-bold sm:text-4xl">
              {t.instructor.foundersTitle}
            </h3>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {founders.map((f, i) => (
            <Reveal key={f.name} delay={i * 0.1}>
              <article className="glass card-hover flex h-full flex-col gap-5 rounded-3xl border border-white/8 p-7 sm:flex-row sm:items-start">
                <div className="relative mx-auto shrink-0 sm:mx-0">
                  <div className="pointer-events-none absolute -inset-2 rounded-2xl bg-gradient-to-br from-brand-green/30 to-brand-blue/30 blur-xl" />
                  {f.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.photo}
                      alt={f.name}
                      style={{ objectPosition: f.objectPosition ?? "center" }}
                      className="relative aspect-[3/4] w-28 rounded-2xl border border-white/10 object-cover"
                    />
                  ) : (
                    <div className="relative grid aspect-[3/4] w-28 place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-brand-green to-brand-blue font-display text-3xl font-bold text-ink-900">
                      {f.initials}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-display text-xl font-bold text-white">{f.name}</p>
                  <p className="mt-1 text-sm font-medium text-brand-green">{f.role}</p>
                  <p className="mt-3 text-sm text-slate-300/90">{f.bio}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.15}>
          <p className="mx-auto mt-10 max-w-2xl text-center text-slate-300/90">
            {t.instructor.teamNote}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
