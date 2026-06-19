"use client";

import { NAV_LINKS } from "./Navbar";

const SOCIALS = [
  {
    group: "DriveData",
    items: [
      { type: "linkedin", label: "LinkedIn DriveData", href: "https://www.linkedin.com/company/drivedatabi/" },
      { type: "instagram", label: "Instagram DriveData", href: "https://www.instagram.com/_drivedata" },
    ],
  },
  {
    group: "Academy",
    items: [
      { type: "linkedin", label: "LinkedIn DriveData Academy", href: "https://www.linkedin.com/company/drivedata-academy/" },
      { type: "instagram", label: "Instagram DriveData Academy", href: "https://www.instagram.com/drivedata_academy" },
    ],
  },
];

function SocialIcon({ type }: { type: string }) {
  if (type === "linkedin") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4V24h-4V8zm7.5 0h3.8v2.2h.05c.53-1 1.83-2.2 3.77-2.2 4.03 0 4.78 2.65 4.78 6.1V24h-4v-6.8c0-1.62-.03-3.7-2.25-3.7-2.25 0-2.6 1.76-2.6 3.58V24h-4V8z" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="2" width="20" height="20" rx="5.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="relative mt-12 border-t border-white/8">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Drive Data Academy" className="h-11 w-auto" />
            <p className="mt-5 max-w-xs text-sm text-slate-400">
              A escola de dados da DriveData. Formação prática em Power BI, Análise de
              Dados e Inteligência Artificial para quem decide com dados.
            </p>

            <div className="mt-6 space-y-3">
              {SOCIALS.map((s) => (
                <div key={s.group} className="flex items-center gap-3">
                  <span className="w-20 text-xs font-medium text-slate-500">{s.group}</span>
                  <div className="flex gap-2">
                    {s.items.map((it) => (
                      <a
                        key={it.href}
                        href={it.href}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={it.label}
                        title={it.label}
                        className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-colors hover:border-brand-green/50 hover:text-brand-green"
                      >
                        <SocialIcon type={it.type} />
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Academy — espelha o menu do cabeçalho */}
          <div>
            <h4 className="font-display text-sm font-bold uppercase tracking-wider text-white">
              Academy
            </h4>
            <ul className="mt-4 space-y-2.5">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-sm text-slate-400 transition-colors hover:text-brand-green">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* DriveData */}
          <div>
            <h4 className="font-display text-sm font-bold uppercase tracking-wider text-white">
              DriveData
            </h4>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a
                  href="https://drivedata.com.br/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-slate-400 transition-colors hover:text-brand-green"
                >
                  Site institucional
                </a>
              </li>
            </ul>
          </div>
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
