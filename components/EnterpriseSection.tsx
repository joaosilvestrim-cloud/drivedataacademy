"use client";

import Reveal from "./Reveal";

const PERKS = [
  {
    icon: "M3 21h18M5 21V7l8-4v18M19 21V11l-6-3",
    title: "Trilhas sob medida",
    desc: "Capacitação alinhada às ferramentas e desafios reais do seu time.",
  },
  {
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM2 21v-2a6 6 0 016-6h4a6 6 0 016 6v2",
    title: "A partir de 3 acessos",
    desc: "Condições especiais para CNPJ, com gestão de turmas e acompanhamento.",
  },
  {
    icon: "M9 19V6l12-3v13M9 19a3 3 0 11-6 0 3 3 0 016 0zM21 16a3 3 0 11-6 0 3 3 0 016 0z",
    title: "Foco em produtividade",
    desc: "Menos achismo, mais decisões inteligentes — impacto medível no dia a dia.",
  },
];

export default function EnterpriseSection() {
  return (
    <section id="empresas" className="relative mx-auto max-w-7xl px-6 py-24 scroll-mt-24">
      <Reveal>
        <div className="glow-border overflow-hidden rounded-[2.5rem]">
          <div className="glass-strong relative grid gap-10 rounded-[2.5rem] p-8 sm:p-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-blue/15 blur-[110px]" />
            <div className="relative">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-green">Para Empresas</p>
              <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
                Capacite seu time em <span className="text-gradient">dados e IA</span>
              </h2>
              <p className="mt-4 max-w-lg text-slate-300/90">
                Formação corporativa em Power BI, Análise de Dados e Inteligência Artificial
                para times que querem produtividade real e decisões mais inteligentes.
                Preencha os dados e nossa equipe entra em contato.
              </p>

              <div className="mt-8 space-y-4">
                {PERKS.map((p) => (
                  <div key={p.title} className="flex items-start gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-brand-green">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d={p.icon} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <div>
                      <p className="font-semibold text-white">{p.title}</p>
                      <p className="text-sm text-slate-400">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Enterprise form */}
            <div className="relative rounded-3xl border border-white/8 bg-white/[0.03] p-6 sm:p-7">
              <h3 className="font-display text-lg font-bold text-white">Fale com nossa equipe</h3>
              <p className="mt-1 text-sm text-slate-400">Resposta em até 1 dia útil.</p>
              <EnterpriseForm />
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function EnterpriseForm() {
  return (
    <form onSubmit={(e) => e.preventDefault()} className="mt-5 space-y-3">
      <input
        required
        placeholder="Nome"
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          required
          type="email"
          placeholder="E-mail corporativo"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60"
        />
        <input
          required
          type="tel"
          placeholder="Telefone / WhatsApp"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60"
        />
      </div>
      <textarea
        rows={3}
        placeholder="Empresa, nº de pessoas e área de interesse (Power BI, IA, outros)…"
        className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60"
      />
      <button
        type="submit"
        className="w-full rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3.5 text-sm font-semibold text-ink-900 shadow-[0_0_30px_-6px_rgba(52,232,160,0.6)] transition-transform hover:scale-[1.02]"
      >
        Enviar
      </button>
    </form>
  );
}
