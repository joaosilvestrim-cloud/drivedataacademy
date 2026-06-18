"use client";

import { useEffect, useState } from "react";

const LINKS = [
  { label: "Conteúdo", href: "#cursos" },
  { label: "MarketPlace", href: "#marketplace" },
  { label: "Método", href: "#metodo" },
  { label: "Para Empresas", href: "#empresas" },
  { label: "Blog", href: "#blog" },
  { label: "Creators", href: "#instrutora" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav
        className={`glass flex w-full max-w-6xl items-center justify-between rounded-full px-4 py-2.5 transition-all duration-500 sm:px-6 ${
          scrolled ? "shadow-[0_8px_40px_-12px_rgba(52,232,160,0.25)]" : ""
        }`}
      >
        <a href="#inicio" className="transition-transform hover:scale-[1.03]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Drive Data Academy" className="h-12 w-auto sm:h-14" />
        </a>

        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-brand-green"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <a
            href="#lista"
            className="rounded-full bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 shadow-[0_0_24px_-4px_rgba(52,232,160,0.6)] transition-transform hover:scale-[1.03]"
          >
            Entrar na lista
          </a>
          <button
            onClick={() => setOpen((o) => !o)}
            className="ml-1 grid h-9 w-9 place-items-center rounded-full border border-white/10 lg:hidden"
            aria-label="Menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div className="glass absolute top-20 w-[92%] max-w-6xl rounded-2xl p-3 lg:hidden">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-4 py-3 text-slate-200 hover:bg-white/5"
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
