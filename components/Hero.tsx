"use client";

import { motion } from "framer-motion";
import CountUp from "./CountUp";
import WaitlistForm from "./WaitlistForm";

const STACK = ["Power BI", "Análise de Dados", "IA aplicada", "DAX", "Power Query", "Storytelling"];

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
            Pare de decidir no{" "}
            <span className="text-slate-400 line-through decoration-brand-blue/50">achismo</span>.
            <br />
            Aprenda a decidir com{" "}
            <span className="text-gradient">dados e IA</span>.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12 }}
            className="mt-6 max-w-xl text-lg text-slate-300/90"
          >
            Formação prática em <strong className="text-white">Power BI, Análise de Dados
            e Inteligência Artificial</strong> aplicada a negócios. Do zero ao dashboard
            que gera decisão — com a metodologia de quem vive dados todos os dias.
          </motion.p>

          {/* Stack chips */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.18 }}
            className="mt-7 flex flex-wrap gap-2"
          >
            {STACK.map((s) => (
              <span
                key={s}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-300"
              >
                {s}
              </span>
            ))}
          </motion.div>

          {/* Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24 }}
            className="mt-9 grid max-w-lg grid-cols-3 gap-4"
          >
            {[
              { v: <CountUp to={3500} suffix="+" />, l: "Alunos formados" },
              { v: <CountUp to={40} suffix="h" />, l: "De conteúdo prático" },
              { v: <><CountUp to={92} suffix="%" /></>, l: "Recomendam a formação" },
            ].map((m, i) => (
              <div key={i}>
                <div className="font-display text-2xl font-bold text-white sm:text-3xl">{m.v}</div>
                <div className="mt-1 text-xs text-slate-400">{m.l}</div>
              </div>
            ))}
          </motion.div>
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
