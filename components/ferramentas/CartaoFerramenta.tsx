"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";

import { useRef, useState } from "react";

/* Cartão das ferramentas, com os efeitos que o mouse pede.

   Três camadas, todas na cor da própria ferramenta, nenhuma inventada:

   - o foco de luz, que segue o ponteiro dentro do cartão;
   - a borda em degradê, que acende no hover e some quando o mouse sai;
   - a inclinação, de no máximo seis graus, o suficiente para o cartão parecer
     um objeto e não um retângulo.

   Quem liga "reduzir movimento" no sistema recebe o mesmo cartão sem a
   inclinação e sem o brilho pulsante: a informação não depende do efeito. */

export type Ferramenta = {
  key: string;
  name: string;
  /** Selo do canto: "Novo", "Em breve", "4D". É recado, não categoria. */
  tag: string;
  /** Categoria que alimenta o filtro da grade. */
  categoria: string;
  desc: string;
  href?: string;
  icon: string;
  from: string;
  to: string;
  available: boolean;
  sameTab?: boolean;
  novo?: boolean;
  cta: string;
};

export default function CartaoFerramenta({ t, ordem }: { t: Ferramenta; ordem: number }) {
  const tr = usarTraducao();
  const ref = useRef<HTMLDivElement>(null);
  const [luz, setLuz] = useState({ x: 50, y: 50, dentro: false });
  const usavel = t.available && !!t.href;

  function mover(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setLuz({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, dentro: true });
  }

  // A inclinação sai do centro: -1 a 1 em cada eixo, virando graus.
  const inclinaX = luz.dentro ? ((50 - luz.y) / 50) * 5 : 0;
  const inclinaY = luz.dentro ? ((luz.x - 50) / 50) * 5 : 0;

  const conteudo = (
    <>
      {/* Foco de luz que segue o ponteiro. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:hidden"
        style={{ background: `radial-gradient(28rem circle at ${luz.x}% ${luz.y}%, ${t.from}22, transparent 45%)` }}
      />

      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <span
            className="relative grid h-12 w-12 place-items-center rounded-2xl text-ink-900 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-105"
            style={{ backgroundImage: `linear-gradient(135deg, ${t.from}, ${t.to})`, boxShadow: `0 12px 30px -12px ${t.from}` }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d={t.icon} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {/* Halo que respira, só na ferramenta nova. */}
            {t.novo && (
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 animate-ping rounded-2xl opacity-40 motion-reduce:animate-none"
                style={{ backgroundImage: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
              />
            )}
          </span>

          {t.novo ? (
            <span className="relative overflow-hidden rounded-full px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-ink-900" style={{ backgroundImage: `linear-gradient(135deg, ${t.from}, ${t.to})` }}>
              {tr(t.tag)}
              {/* Brilho que atravessa o selo de tempos em tempos. */}
              <span aria-hidden="true" className="absolute inset-0 -translate-x-full animate-brilho bg-gradient-to-r from-transparent via-white/70 to-transparent motion-reduce:hidden" />
            </span>
          ) : (
            <span className={`rounded-full px-2.5 py-0.5 text-[0.6rem] font-semibold uppercase ${t.available ? "bg-brand-green/15 text-brand-green" : "bg-white/5 text-slate-400"}`}>{tr(t.tag)}</span>
          )}
        </div>

        <h2 className="mt-4 font-display text-lg font-bold text-white">{tr(t.name)}</h2>
        <p className="mt-1 flex-1 text-sm text-slate-400">{tr(t.desc)}</p>

        {usavel ? (
          <span
            className="mt-4 inline-flex w-fit items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-ink-900 transition-all duration-300 group-hover:gap-3"
            style={{ backgroundImage: `linear-gradient(135deg, ${t.from}, ${t.to})`, boxShadow: `0 14px 34px -18px ${t.from}` }}
          >
            {t.cta}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="transition-transform duration-300 group-hover:translate-x-0.5">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        ) : (
          <span className="mt-4 inline-flex w-fit items-center rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-500">{tr("Em breve")}</span>
        )}
      </div>
    </>
  );

  const corpo = (
    <div
      ref={ref}
      onMouseMove={usavel ? mover : undefined}
      onMouseLeave={() => setLuz((l) => ({ ...l, dentro: false }))}
      style={{
        transform: usavel ? `perspective(900px) rotateX(${inclinaX}deg) rotateY(${inclinaY}deg)` : undefined,
        animationDelay: `${ordem * 70}ms`,
        // A borda é um degradê por baixo, que aparece pela margem do miolo.
        backgroundImage: luz.dentro ? `linear-gradient(135deg, ${t.from}, ${t.to})` : undefined,
      }}
      className={`group relative h-full animate-sobe rounded-3xl p-px transition-[transform,box-shadow] duration-200 ease-out motion-reduce:!transform-none ${
        usavel ? "hover:shadow-[0_30px_70px_-40px_rgba(0,0,0,0.9)]" : "opacity-70"
      }`}
    >
      <div className="relative h-full overflow-hidden rounded-[calc(1.5rem-1px)] border border-white/8 bg-ink-900/85 p-6">
        {conteudo}
      </div>
    </div>
  );

  if (!usavel) return corpo;

  return (
    <a
      href={t.href}
      {...(t.sameTab ? {} : { target: "_blank", rel: "noreferrer" })}
      className="block h-full rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-brand-green/70"
    >
      {corpo}
    </a>
  );
}
