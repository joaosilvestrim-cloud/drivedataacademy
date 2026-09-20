"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n/LanguageProvider";
import LangSwitcher from "./LangSwitcher";
import AccountNav from "./AccountNav";
import { useAssinaturaAberta } from "./useMenuPublico";

// Âncoras fixas; os rótulos vêm do dicionário (nav.links), na mesma ordem.
export const NAV_HREFS = ["/cursos", "#metodo", "#empresas", "#blog", "#instrutora"];

// Item do menu que ganha destaque visual: a página da assinatura. Enquanto não
// for liberado em Admin > Vendas > Assinatura, aparece sem link, como "em breve".
const DESTAQUE = "/cursos";
const EM_BREVE: Record<string, string> = { Assinatura: "em breve", Membership: "soon", "Membresía": "pronto" };

/* As âncoras só existem na home. Em /cursos, /matricula e nas outras páginas
   que montam o mesmo cabeçalho, clicar em "#metodo" não fazia nada, porque a
   seção não está naquele documento. Fora da home o link passa a apontar para a
   home mais a âncora, e o navegador rola sozinho ao chegar. */
export function resolverAncora(href: string, pathname: string | null) {
  if (!href.startsWith("#")) return href;
  return pathname === "/" ? href : `/${href}`;
}

export default function Navbar() {
  const tr = usarTraducao();
  const t = useT();
  const pathname = usePathname();
  const assinaturaAberta = useAssinaturaAberta();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = NAV_HREFS.map((href, i) => ({ href: resolverAncora(href, pathname), label: t.nav.links[i] }));

  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav
        className={`glass flex w-full max-w-6xl items-center justify-between rounded-full px-4 py-2.5 transition-all duration-500 sm:px-6 ${
          scrolled ? "shadow-[0_8px_40px_-12px_rgba(52,232,160,0.25)]" : ""
        }`}
      >
        <a href={resolverAncora("#inicio", pathname)} className="transition-transform hover:scale-[1.03]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt={tr("Drive Data Academy")} className="h-12 w-auto sm:h-14" />
        </a>

        <ul className="hidden items-center gap-0.5 lg:flex">
          {links.map((l) => (
            <li key={l.href}>
              {l.href === DESTAQUE ? (
                <a
                  href={assinaturaAberta ? l.href : undefined}
                  aria-disabled={assinaturaAberta ? undefined : true}
                  title={assinaturaAberta ? undefined : tr("Liberamos nos próximos dias")}
                  className={`relative inline-flex items-baseline gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-semibold transition-colors after:absolute after:inset-x-3 after:bottom-1 after:h-[2px] after:rounded-full ${
                    pathname === DESTAQUE ? "after:bg-brand-green" : "after:bg-transparent"
                  } ${assinaturaAberta ? "text-white hover:text-brand-green" : "cursor-default text-white/80"}`}
                >
                  {l.label}
                  {!assinaturaAberta && <span className="text-[0.7rem] font-normal text-slate-400">{EM_BREVE[l.label] || tr("em breve")}</span>}
                </a>
              ) : (
                <a
                  href={l.href}
                  className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-brand-green"
                >
                  {l.label}
                </a>
              )}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <AccountNav />
          <LangSwitcher className="hidden sm:flex" />
          <a
            href={resolverAncora("#ao-vivo", pathname)}
            className="rounded-full bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 shadow-[0_0_24px_-4px_rgba(52,232,160,0.6)] transition-transform hover:scale-[1.03]"
          >
            {t.nav.cta}
          </a>
          <button
            onClick={() => setOpen((o) => !o)}
            className="ml-1 grid h-9 w-9 place-items-center rounded-full border border-white/10 lg:hidden"
            aria-label={tr("Menu")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div className="glass absolute top-20 w-[92%] max-w-6xl rounded-2xl p-3 lg:hidden">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href === DESTAQUE && !assinaturaAberta ? undefined : l.href}
              aria-disabled={l.href === DESTAQUE && !assinaturaAberta ? true : undefined}
              onClick={() => setOpen(false)}
              className={
                l.href === DESTAQUE
                  ? "block rounded-xl px-4 py-3 font-semibold text-white hover:bg-white/5"
                  : "block rounded-xl px-4 py-3 text-slate-200 hover:bg-white/5"
              }
            >
              {l.href === DESTAQUE ? (
                <>
                  <span className={`border-b-2 pb-0.5 ${assinaturaAberta ? "border-brand-green" : "border-brand-green/40"}`}>{l.label}</span>
                  {!assinaturaAberta && <span className="ml-2 text-xs font-normal text-slate-400">{EM_BREVE[l.label] || tr("em breve")}</span>}
                </>
              ) : (
                l.label
              )}
            </a>
          ))}
          <div className="mt-2 border-t border-white/10 px-2 pt-3 sm:hidden">
            <LangSwitcher />
          </div>
        </div>
      )}
    </header>
  );
}
