"use client";

import Logo from "./Logo";

const COLS = [
  {
    title: "Cursos",
    links: ["Power BI do Zero", "DAX & Análise Avançada", "IA Aplicada a Negócios", "Para Empresas"],
  },
  {
    title: "Academy",
    links: ["Método", "Instrutora", "Blog", "Lista de espera"],
  },
  {
    title: "DriveData",
    links: ["Site institucional", "Soluções", "Clientes", "Fale conosco"],
  },
];

export default function Footer() {
  return (
    <footer className="relative mt-12 border-t border-white/8">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-xs text-sm text-slate-400">
              A escola de dados da DriveData. Formação prática em Power BI, Análise de
              Dados e Inteligência Artificial para quem decide com dados.
            </p>
            <div className="mt-6 flex gap-3">
              {["Instagram", "LinkedIn", "YouTube", "TikTok"].map((s) => (
                <a
                  key={s}
                  href="#"
                  aria-label={s}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-colors hover:border-brand-green/50 hover:text-brand-green"
                >
                  <span className="text-[0.6rem] font-bold">{s.slice(0, 2)}</span>
                </a>
              ))}
            </div>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-slate-400 transition-colors hover:text-brand-green">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/8 pt-7 text-xs text-slate-500 sm:flex-row">
          <p>© 2026 Drive Data Academy — uma iniciativa DriveData. Todos os direitos reservados.</p>
          <div className="flex gap-5">
            <a href="#" className="hover:text-slate-300">Política de Privacidade</a>
            <a href="#" className="hover:text-slate-300">Termos de uso</a>
            <a href="#" className="hover:text-slate-300">Política de IA</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
