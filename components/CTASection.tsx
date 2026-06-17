"use client";

import Reveal from "./Reveal";
import WaitlistForm from "./WaitlistForm";

export default function CTASection() {
  return (
    <section className="relative mx-auto max-w-5xl px-6 py-24">
      <Reveal>
        <div className="glow-border relative overflow-hidden rounded-[2.5rem]">
          <div className="glass-strong relative grid gap-10 rounded-[2.5rem] px-8 py-14 sm:px-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-brand-green/20 blur-[100px]" />
            <div className="relative">
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                Próxima turma a caminho.
                <br />
                <span className="text-gradient">Garanta seu lugar.</span>
              </h2>
              <p className="mt-4 max-w-md text-slate-300/90">
                Entre na lista de espera e seja o primeiro a saber da abertura das novas
                turmas de Power BI, Análise de Dados e IA — com condições exclusivas de
                pré-lançamento.
              </p>
            </div>
            <div className="relative">
              <WaitlistForm />
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
