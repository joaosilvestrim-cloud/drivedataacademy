"use client";

import { useT } from "@/lib/i18n/LanguageProvider";

/* "Sobre": a faixa Fog depois da abertura branca. Título em Inter 700 à
   esquerda, os benefícios à direita como linhas separadas por fio, sem
   cartão de checks. */
export default function Hero() {
  const t = useT();
  return (
    <section id="sobre" className="scroll-mt-28 bg-fog">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-6 py-20 lg:grid-cols-[1.1fr_1fr] lg:py-24">
        <div>
          <h2 className="text-[2.25rem] font-bold leading-[1.1] tracking-[-0.02em] text-obsidian sm:text-[2.8rem]">
            {t.hero.title1}
            <br />
            {t.hero.title2pre} <span className="text-marca-azul">{t.hero.title2grad}</span>.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-charcoal">{t.hero.p1}</p>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-charcoal">
            {t.hero.p2pre} <strong className="font-semibold text-obsidian">{t.hero.p2strong}</strong> {t.hero.p2post}
          </p>
          <p className="mt-6 max-w-xl text-base font-semibold text-marca">{t.hero.closing}</p>
        </div>

        <ul className="self-end border-b border-obsidian/15">
          {t.hero.benefits.map((b) => (
            <li key={b} className="border-t border-obsidian/15 py-5 text-xl font-semibold tracking-tight text-obsidian">
              {b}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
