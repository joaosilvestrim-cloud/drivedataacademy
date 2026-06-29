"use client";

import Reveal from "./Reveal";
import { useT } from "@/lib/i18n/LanguageProvider";

// Layout fixo por card (link/destaque); textos vêm do dicionário (courses.cards).
const CARD_META = [
  { href: "#lista", featured: false },
  { href: "#lista", featured: true },
  { href: "#empresas", featured: false },
];

export default function CoursesSection() {
  const t = useT();
  const cards = t.courses.cards.map((c, i) => ({ ...c, ...CARD_META[i] }));

  return (
    <section id="cursos" className="relative mx-auto max-w-7xl px-6 py-24 scroll-mt-24">
      <span id="marketplace" className="absolute -top-24" aria-hidden />
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-green">{t.courses.eyebrow}</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">
            {t.courses.titlePre} <span className="text-gradient">{t.courses.titleGrad}</span>
          </h2>
          <p className="mt-4 text-slate-300/90">{t.courses.subtitle}</p>
        </div>
      </Reveal>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {cards.map((c, i) => (
          <Reveal key={c.tag} delay={i * 0.08}>
            <article
              className={`card-hover relative flex h-full flex-col rounded-3xl border p-7 ${
                c.featured ? "glass-strong border-brand-green/30" : "glass border-white/8"
              }`}
            >
              {c.featured && (
                <span className="absolute -top-3 left-7 rounded-full bg-gradient-to-r from-brand-green to-brand-blue px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-ink-900">
                  {t.courses.featured}
                </span>
              )}
              <span className="w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-brand-teal">
                {c.tag}
              </span>

              <h3 className="mt-5 font-display text-xl font-bold leading-snug text-white">
                {c.headline}
              </h3>
              <p className="mt-3 text-sm text-slate-300/90">{c.desc}</p>

              <ul className="mt-5 space-y-2.5">
                {c.topics.map((topic) => (
                  <li key={topic} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <svg className="mt-0.5 shrink-0 text-brand-green" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {topic}
                  </li>
                ))}
              </ul>

              <a
                href={c.href}
                className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-brand-green/50 hover:text-brand-green"
              >
                {c.cta}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
