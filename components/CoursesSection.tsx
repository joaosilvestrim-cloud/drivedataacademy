"use client";

import Reveal from "./Reveal";

type Course = {
  tag: string;
  level: string;
  title: string;
  desc: string;
  topics: string[];
  duration: string;
  featured?: boolean;
};

const COURSES: Course[] = [
  {
    tag: "Power BI",
    level: "Iniciante → Intermediário",
    title: "Power BI do Zero ao Dashboard",
    desc: "Conecte dados, modele em estrela e construa relatórios que comunicam. A base de todo analista de dados moderno.",
    topics: ["Power Query & ETL", "Modelagem estrela", "Visuais que comunicam", "Publicação no Service"],
    duration: "16h",
  },
  {
    tag: "Análise de Dados",
    level: "Intermediário → Avançado",
    title: "DAX & Análise Avançada",
    desc: "Domine a linguagem que move o Power BI: contexto de filtro, time intelligence e medidas que respondem perguntas de negócio.",
    topics: ["Contexto de avaliação", "Time Intelligence", "CALCULATE na prática", "Performance & Vertipaq"],
    duration: "14h",
    featured: true,
  },
  {
    tag: "Inteligência Artificial",
    level: "Todos os níveis",
    title: "IA Aplicada a Negócios",
    desc: "Use IA generativa para acelerar análises, gerar DAX, documentar modelos e transformar dados em narrativa — com governança.",
    topics: ["Claude & ChatGPT para dados", "Geração de DAX", "Automação de relatórios", "Governança de IA"],
    duration: "10h",
  },
];

export default function CoursesSection() {
  return (
    <section id="cursos" className="relative mx-auto max-w-7xl px-6 py-24 scroll-mt-24">
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-green">Trilhas de formação</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">
            Uma jornada completa, <span className="text-gradient">do dado à decisão</span>
          </h2>
          <p className="mt-4 text-slate-300/90">
            Cursos modulares e práticos. Comece pela base e avance até a inteligência
            artificial aplicada — no seu ritmo, com projetos reais.
          </p>
        </div>
      </Reveal>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {COURSES.map((c, i) => (
          <Reveal key={c.title} delay={i * 0.08}>
            <article
              className={`card-hover relative flex h-full flex-col rounded-3xl border p-7 ${
                c.featured
                  ? "glass-strong border-brand-green/30"
                  : "glass border-white/8"
              }`}
            >
              {c.featured && (
                <span className="absolute -top-3 left-7 rounded-full bg-gradient-to-r from-brand-green to-brand-blue px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-ink-900">
                  Mais procurado
                </span>
              )}
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-brand-teal">
                  {c.tag}
                </span>
                <span className="text-xs text-slate-500">{c.duration}</span>
              </div>

              <h3 className="mt-5 font-display text-xl font-bold leading-snug text-white">
                {c.title}
              </h3>
              <p className="mt-1 text-xs font-medium text-slate-400">{c.level}</p>
              <p className="mt-3 text-sm text-slate-300/90">{c.desc}</p>

              <ul className="mt-5 space-y-2.5">
                {c.topics.map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <svg className="mt-0.5 shrink-0 text-brand-green" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {t}
                  </li>
                ))}
              </ul>

              <a
                href="#lista"
                className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-brand-green/50 hover:text-brand-green"
              >
                Entrar na lista de espera
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
