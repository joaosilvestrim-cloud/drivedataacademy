"use client";

import Reveal from "./Reveal";
import { useT } from "@/lib/i18n/LanguageProvider";

// Dados fixos do fundador (nome/foto); cargo e bio vêm do dicionário.
const FOUNDER_META = [
  { name: "Tamires Cavani", initials: "TC", photo: "/tamires-cavani.png", objectPosition: "30% 18%" },
  { name: "Reed Lopes", initials: "RL", photo: "/reed-lopes.jpg", objectPosition: "50% 25%" },
];

export default function InstructorSection() {
  const t = useT();
  const stats = t.instructor.statValues.map((v, i) => ({ v, l: t.instructor.statLabels[i] }));
  const founders = FOUNDER_META.map((f, i) => ({
    ...f,
    role: t.instructor.roles[i],
    bio: t.instructor.bios[i],
  }));

  return (
    <section id="instrutora" className="relative mx-auto max-w-[1200px] scroll-mt-24 px-6 py-24">
      <Reveal>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold text-marca">{t.instructor.eyebrow}</p>
          <h2 className="mt-3 text-[2.25rem] font-bold leading-[1.1] text-obsidian sm:text-[2.8rem]">
            {t.instructor.titlePre} <span className="text-marca-azul">{t.instructor.titleGrad}</span>
          </h2>
          <p className="mt-5 text-lg text-charcoal">{t.instructor.intro}</p>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mx-auto mt-12 grid max-w-3xl gap-8 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.l} className="border-t-2 border-marca pt-4 text-center">
              <p className="grito text-[3.2rem] text-obsidian">{s.v}</p>
              <p className="mt-2 text-sm text-charcoal">{s.l}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Fundadores */}
      <div className="mt-20">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-marca">
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
              <article className="flex h-full flex-col gap-6 rounded-grande bg-fog p-8 sm:flex-row sm:items-start">
                <div className="relative mx-auto shrink-0 sm:mx-0">
                  {f.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.photo}
                      alt={f.name}
                      style={{ objectPosition: f.objectPosition ?? "center" }}
                      className="relative aspect-[3/4] w-32 rounded-srf object-cover"
                    />
                  ) : (
                    <div className="relative grid aspect-[3/4] w-28 place-items-center rounded-2xl border border-tinta/10 bg-marca-verde font-display text-3xl font-bold text-sobre-acento">
                      {f.initials}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-display text-xl font-bold text-tinta">{f.name}</p>
                  <p className="mt-1 text-sm font-semibold text-marca">{f.role}</p>
                  <p className="mt-3 text-[15px] leading-relaxed text-charcoal">{f.bio}</p>
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
