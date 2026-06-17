"use client";

import Reveal from "./Reveal";
import { LogoMark } from "./Logo";

export default function InstructorSection() {
  return (
    <section id="instrutora" className="relative mx-auto max-w-7xl px-6 py-24 scroll-mt-24">
      <Reveal>
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          {/* Visual / avatar placeholder */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-brand-green/25 to-brand-blue/25 blur-2xl" />
            <div className="glass-strong relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-white/10">
              {/* Decorative branded backdrop (swap for a real photo in /public later) */}
              <div className="absolute inset-0 grid-bg opacity-40" />
              <div className="absolute inset-0 grid place-items-center">
                <LogoMark size={120} glow />
              </div>
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/10 bg-ink-900/70 px-4 py-3 backdrop-blur">
                <p className="font-display text-lg font-bold text-white">Especialista DriveData</p>
                <p className="text-xs text-slate-400">Power BI · Análise de Dados · IA</p>
              </div>
              {/* MVP-style badge */}
              <div className="absolute right-4 top-4 rounded-lg bg-white px-3 py-2 text-center shadow-lg">
                <p className="text-[0.7rem] font-black leading-none text-black">MVP</p>
                <p className="mt-0.5 text-[0.5rem] font-medium leading-tight text-black/70">Microsoft</p>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-green">Quem ensina</p>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">
              Aprenda com quem <span className="text-gradient">vive de dados</span>
            </h2>
            <p className="mt-5 text-slate-300/90">
              A Drive Data Academy nasce da experiência de consultoria da DriveData: anos
              transformando o caos de planilhas e sistemas desconexos em decisões de
              negócio. Quem ensina está no campo — não só na teoria.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { v: "+8 anos", l: "Em projetos de dados" },
                { v: "+120", l: "Empresas atendidas" },
                { v: "MVP", l: "Reconhecimento Microsoft" },
              ].map((s) => (
                <div key={s.l} className="glass rounded-2xl border border-white/8 px-4 py-5 text-center">
                  <p className="font-display text-2xl font-bold text-gradient-blue">{s.v}</p>
                  <p className="mt-1 text-xs text-slate-400">{s.l}</p>
                </div>
              ))}
            </div>

            <blockquote className="mt-8 border-l-2 border-brand-green/60 pl-5 text-lg italic text-slate-200">
              “Dado não é sobre ferramenta. É sobre a decisão que ele te permite tomar
              com confiança.”
            </blockquote>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
