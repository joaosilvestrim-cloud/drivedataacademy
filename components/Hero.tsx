"use client";

import { motion } from "framer-motion";
import WaitlistForm from "./WaitlistForm";
import { useT } from "@/lib/i18n/LanguageProvider";

export default function Hero() {
  const t = useT();
  return (
    <section id="inicio" className="relative mx-auto max-w-7xl px-6 pb-16 pt-36 sm:pt-44">
      <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left — copy + CTA */}
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="mt-6 font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl"
          >
            {t.hero.title1}
            <br />
            {t.hero.title2pre}{" "}
            <span className="text-gradient">{t.hero.title2grad}</span>.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12 }}
            className="mt-6 max-w-xl text-lg text-slate-300/90"
          >
            {t.hero.p1}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-4 max-w-xl text-lg text-slate-300/90"
          >
            {t.hero.p2pre} <strong className="text-white">{t.hero.p2strong}</strong>{" "}
            {t.hero.p2post}
          </motion.p>

          {/* Benefit bullets — destaque */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-8 rounded-2xl border border-brand-green/25 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-5 shadow-[0_0_50px_-22px_rgba(52,232,160,0.55)]"
          >
            <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {t.hero.benefits.map((b, i) => (
                <motion.li
                  key={b}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.35 + i * 0.13, ease: "easeOut" }}
                  className="group flex items-center gap-3 text-sm font-semibold text-slate-100"
                >
                  <motion.span
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 15, delay: 0.42 + i * 0.13 }}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-green to-brand-blue text-ink-900 shadow-[0_0_18px_-4px_rgba(52,232,160,0.7)] transition-transform duration-300 group-hover:scale-110"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.span>
                  {b}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.21 }}
            className="mt-6 max-w-xl text-base font-medium text-white"
          >
            {t.hero.closing}
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
                <p className="text-sm font-semibold text-brand-green">{t.hero.waitlistEyebrow}</p>
                <h2 className="mt-2 font-display text-2xl font-bold leading-snug">
                  {t.hero.waitlistTitle}
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  {t.hero.waitlistText}
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
