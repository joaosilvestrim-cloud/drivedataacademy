"use client";

import Reveal from "./Reveal";

const POSTS = [
  {
    cat: "Inteligência Artificial",
    title: "Política de uso de IA: 12 elementos para uma governança efetiva",
    excerpt: "O que separa um documento que realmente governa o uso de IA de um que só decora a apresentação.",
    date: "10 jun 2026",
  },
  {
    cat: "Dados & IA",
    title: "Ferramentas de IA para criar dashboards: qual escolher?",
    excerpt: "Comparativo honesto entre Claude, ChatGPT, Copilot e Gemini para acelerar análises de verdade.",
    date: "03 jun 2026",
  },
  {
    cat: "Power BI",
    title: "Formatação condicional no Power BI que comunica",
    excerpt: "Como transformar tabelas cruas em visuais que contam uma história e guiam a decisão.",
    date: "28 mai 2026",
  },
];

export default function BlogSection() {
  return (
    <section id="blog" className="relative mx-auto max-w-7xl px-6 py-24 scroll-mt-24">
      <Reveal>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-green">Blog & conteúdo</p>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">
              Conhecimento que <span className="text-gradient-blue">circula</span>
            </h2>
          </div>
          <a
            href="#lista"
            className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-brand-green/50 hover:text-brand-green"
          >
            Ver todos os artigos
          </a>
        </div>
      </Reveal>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {POSTS.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.08}>
            <article className="card-hover glass group flex h-full flex-col overflow-hidden rounded-3xl border border-white/8">
              {/* Cover */}
              <div className="relative aspect-[16/9] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-green/20 via-ink-700 to-brand-blue/20" />
                <div className="absolute inset-0 grid-bg opacity-50" />
                <span className="absolute left-4 top-4 rounded-full bg-ink-900/80 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-brand-teal backdrop-blur">
                  {p.cat}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-display text-lg font-bold leading-snug text-white transition-colors group-hover:text-brand-green">
                  {p.title}
                </h3>
                <p className="mt-2 flex-1 text-sm text-slate-400">{p.excerpt}</p>
                <p className="mt-5 text-xs text-slate-500">{p.date}</p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
