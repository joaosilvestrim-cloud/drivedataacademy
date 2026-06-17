"use client";

import Reveal from "./Reveal";

const STEPS = [
  {
    n: "01",
    title: "Fundamentos sólidos",
    desc: "Você entende o dado antes da ferramenta: modelagem, fontes e a lógica por trás de uma boa análise.",
  },
  {
    n: "02",
    title: "Mão na massa",
    desc: "Projetos reais a cada módulo. Você sai com dashboards de portfólio, não só teoria.",
  },
  {
    n: "03",
    title: "IA como copiloto",
    desc: "Aprenda a usar IA para acelerar DAX, documentação e insights — sem perder o controle do que entrega.",
  },
  {
    n: "04",
    title: "Decisão de verdade",
    desc: "O destino final: transformar relatórios em recomendações que o negócio entende e age.",
  },
];

export default function MethodSection() {
  return (
    <section id="metodo" className="relative mx-auto max-w-7xl px-6 py-24 scroll-mt-24">
      <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <Reveal>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-green">Método DriveData</p>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">
              Aprender dados <span className="text-gradient-blue">com propósito</span>
            </h2>
            <p className="mt-5 text-slate-300/90">
              Nosso método não forma quem decora cliques — forma profissionais que sabem
              transformar caos em clareza. Cada etapa conecta técnica e contexto de negócio.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                { k: "100% prático", v: "Projetos reais" },
                { k: "Ao vivo + gravado", v: "Estude no seu tempo" },
                { k: "Comunidade", v: "Tire dúvidas sempre" },
                { k: "Certificado", v: "Comprove na carreira" },
              ].map((b) => (
                <div key={b.k} className="glass rounded-2xl border border-white/8 px-4 py-4">
                  <p className="font-display text-base font-bold text-white">{b.k}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{b.v}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <div className="relative">
          <div className="absolute left-[27px] top-4 bottom-4 w-px bg-gradient-to-b from-brand-green/60 via-brand-teal/30 to-brand-blue/60" />
          <div className="space-y-5">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.1}>
                <div className="glass card-hover relative flex gap-5 rounded-2xl border border-white/8 p-5">
                  <span className="z-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-green to-brand-blue font-display text-lg font-bold text-ink-900">
                    {s.n}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold text-white">{s.title}</h3>
                    <p className="mt-1 text-sm text-slate-300/90">{s.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
