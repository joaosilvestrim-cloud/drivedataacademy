"use client";

import Reveal from "./Reveal";
import { useT } from "@/lib/i18n/LanguageProvider";

// Layout fixo por card (link/destaque); textos vêm do dicionário (courses.cards).
const CARD_META = [
  { href: "#ao-vivo", featured: false },
  { href: "#ao-vivo", featured: true },
  { href: "#empresas", featured: false },
];

export default function CoursesSection() {
  const t = useT();
  const cards = t.courses.cards.map((c, i) => ({ ...c, ...CARD_META[i] }));

  return (
    <section id="cursos" className="relative mx-auto max-w-[1200px] scroll-mt-24 px-6 py-24">
      <span id="marketplace" className="absolute -top-24" aria-hidden />
      <Reveal>
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-marca">{t.courses.eyebrow}</p>
          <h2 className="mt-3 text-[2.25rem] font-bold leading-[1.1] text-obsidian sm:text-[2.8rem]">
            {t.courses.titlePre} <span className="text-marca-azul">{t.courses.titleGrad}</span>
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-charcoal">{t.courses.subtitle}</p>
        </div>
      </Reveal>

      {/* Três cartões; o do meio é a faixa escura, o destaque do sistema. */}
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {cards.map((c, i) => (
          <Reveal key={c.tag} delay={i * 0.08}>
            <article
              className={`card-hover relative flex h-full flex-col rounded-grande p-8 ${
                c.featured ? "escuro bg-noite" : "bg-fog"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${c.featured ? "bg-marca-verde text-sobre-acento" : "bg-papel text-marca"}`}>
                  {c.tag}
                </span>
                {c.featured && <span className="text-xs font-medium text-slate-300">{t.courses.featured}</span>}
              </div>

              <h3 className={`mt-6 text-2xl font-bold leading-snug tracking-tight ${c.featured ? "text-marca-verde" : "text-obsidian"}`}>
                {c.headline}
              </h3>
              <p className={`mt-3 text-[15px] leading-relaxed ${c.featured ? "text-slate-200" : "text-charcoal"}`}>{c.desc}</p>

              <ul className={`mt-6 border-b ${c.featured ? "border-white/15" : "border-obsidian/10"}`}>
                {c.topics.map((topic) => (
                  <li key={topic} className={`border-t py-2.5 text-sm font-medium ${c.featured ? "border-white/15 text-white" : "border-obsidian/10 text-obsidian"}`}>
                    {topic}
                  </li>
                ))}
              </ul>

              <a
                href={c.href}
                className={`mt-8 inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                  c.featured ? "bg-marca-verde text-sobre-acento hover:brightness-95" : "border border-marca text-sobre-acento hover:bg-papel"
                }`}
              >
                {c.cta}
                <span aria-hidden>→</span>
              </a>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
