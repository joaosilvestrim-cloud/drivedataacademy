"use client";

import { motion } from "framer-motion";
import WaitlistForm from "./WaitlistForm";

const BENEFITS = [
  "Mais de 1.000 projetos entregues",
  "Mais de 350 empresas impactadas",
  "Cases reais utilizados em aula",
  "Metodologia validada em projetos corporativos",
];

export default function Hero() {
  return (
    <section id="inicio" className="relative mx-auto max-w-7xl px-6 pb-16 pt-36 sm:pt-44">
      <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left — copy + CTA */}
        <div>
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300"
          >
            <span className="h-2 w-2 animate-pulse-glow rounded-full bg-brand-green" />
            A escola de dados da DriveData
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="mt-6 font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl"
          >
            Não ensinamos teoria.
            <br />
            Ensinamos o que{" "}
            <span className="text-gradient">aplicamos todos os dias</span>.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12 }}
            className="mt-6 max-w-xl text-lg text-slate-300/90"
          >
            A DriveData atua desde 2021 transformando dados em decisões para empresas de
            diversos segmentos. Toda a metodologia da Academy foi construída a partir de
            desafios reais, projetos entregues e resultados gerados em clientes.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-4 max-w-xl text-lg text-slate-300/90"
          >
            Formação prática em <strong className="text-white">técnicas avançadas de
            Visualização de Dados e Storytelling, IA, Automações e Engenharia de Dados</strong>{" "}
            aplicado aos negócios.
          </motion.p>

          {/* Benefit bullets */}
          <motion.ul
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.18 }}
            className="mt-7 grid gap-2.5 sm:grid-cols-2"
          >
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-slate-300">
                <svg className="mt-0.5 shrink-0 text-brand-green" width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {b}
              </li>
            ))}
          </motion.ul>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.21 }}
            className="mt-6 max-w-xl text-base font-medium text-white"
          >
            Aprenda com quem não apenas ensina dados, mas vive dados todos os dias.
          </motion.p>
        </div>

        {/* Right — waitlist card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="relative"
        >
          <div className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-brand-green/20 via-transparent to-brand-blue/20 blur-2xl" />
          <div id="lista" className="glow-border relative overflow-hidden rounded-[2rem] scroll-mt-28">
            <div className="glass-strong relative rounded-[2rem] p-7 sm:p-9">
              <div className="mb-5">
                <p className="text-sm font-semibold text-brand-green">Lista de espera · próximas turmas</p>
                <h2 className="mt-2 font-display text-2xl font-bold leading-snug">
                  Seja avisado em primeira mão
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Inscreva-se para garantir condições de pré-lançamento das próximas
                  turmas de Power BI, Análise de Dados e IA.
                </p>
              </div>
              <WaitlistForm />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
