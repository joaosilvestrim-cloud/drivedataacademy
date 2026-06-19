"use client";

import Reveal from "./Reveal";

const STATS = [
  { v: "+15 anos", l: "De experiência em dados" },
  { v: "+350", l: "Empresas atendidas" },
  { v: "+1.000", l: "Projetos entregues" },
];

type Founder = {
  name: string;
  role: string;
  initials: string;
  // Troque por uma foto real adicionando o arquivo em /public e definindo `photo`.
  photo?: string;
  objectPosition?: string;
  bio: string;
};

const FOUNDERS: Founder[] = [
  {
    name: "Tamires Cavani",
    role: "Co-Founder & Head de Negócios da DriveData Academy",
    initials: "TC",
    photo: "/tamires-cavani.png",
    objectPosition: "30% 18%",
    bio: "Especialista em Analytics, Business Intelligence e Inteligência Artificial, lidera iniciativas de transformação orientada por dados e projetos que impactaram centenas de empresas na DriveData. Sua missão é aproximar tecnologia e estratégia para gerar decisões mais inteligentes e resultados mensuráveis.",
  },
  {
    name: "Reed Lopes",
    role: "Co-Founder & Head de Dados e IA da DriveData Academy",
    initials: "RL",
    photo: "/reed-lopes.jpg",
    objectPosition: "50% 25%",
    bio: "Especialista em Power BI, Engenharia de Dados, Automação e Inteligência Artificial, com ampla experiência na construção de soluções analíticas, visualizações avançadas e aplicações corporativas baseadas em dados. Responsável por transformar conhecimento técnico em aplicações práticas de mercado.",
  },
];

export default function InstructorSection() {
  return (
    <section id="instrutora" className="relative mx-auto max-w-7xl px-6 py-24 scroll-mt-24">
      <Reveal>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-green">Quem ensina</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">
            Aprenda com quem <span className="text-gradient">vive de dados</span>
          </h2>
          <p className="mt-5 text-slate-300/90">
            A Drive Data Academy nasce da experiência de consultoria da DriveData: anos
            transformando o caos de planilhas e sistemas desconexos em decisões de
            negócio. Quem ensina está no campo — não só na teoria.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mx-auto mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
          {STATS.map((s) => (
            <div key={s.l} className="glass rounded-2xl border border-white/8 px-4 py-5 text-center">
              <p className="font-display text-2xl font-bold text-gradient-blue">{s.v}</p>
              <p className="mt-1 text-xs text-slate-400">{s.l}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Fundadores */}
      <div className="mt-20">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-green">
              Fundadores
            </p>
            <h3 className="mt-3 font-display text-2xl font-bold sm:text-4xl">
              Fundadores DriveData Academy
            </h3>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {FOUNDERS.map((f, i) => (
            <Reveal key={f.name} delay={i * 0.1}>
              <article className="glass card-hover flex h-full flex-col gap-5 rounded-3xl border border-white/8 p-7 sm:flex-row sm:items-start">
                {/* Foto — para adicionar a do Reed, coloque o arquivo em /public e preencha `photo` no array FOUNDERS */}
                <div className="relative mx-auto shrink-0 sm:mx-0">
                  <div className="pointer-events-none absolute -inset-2 rounded-2xl bg-gradient-to-br from-brand-green/30 to-brand-blue/30 blur-xl" />
                  {f.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.photo}
                      alt={f.name}
                      style={{ objectPosition: f.objectPosition ?? "center" }}
                      className="relative aspect-[3/4] w-28 rounded-2xl border border-white/10 object-cover"
                    />
                  ) : (
                    <div className="relative grid aspect-[3/4] w-28 place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-brand-green to-brand-blue font-display text-3xl font-bold text-ink-900">
                      {f.initials}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-display text-xl font-bold text-white">{f.name}</p>
                  <p className="mt-1 text-sm font-medium text-brand-green">{f.role}</p>
                  <p className="mt-3 text-sm text-slate-300/90">{f.bio}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.15}>
          <p className="mx-auto mt-10 max-w-2xl text-center text-slate-300/90">
            A formação contempla também todo o time DriveData — especialistas que constroem
            soluções de dados e IA para empresas todos os dias.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
