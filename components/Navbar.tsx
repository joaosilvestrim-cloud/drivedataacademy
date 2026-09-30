"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n/LanguageProvider";
import LangSwitcher from "./LangSwitcher";
import AlternarTema from "./tema/AlternarTema";
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
    <header
      className={`fixed inset-x-0 top-0 z-50 flex justify-center border-b bg-papel/95 px-4 backdrop-blur transition-colors duration-300 ${
        scrolled ? "border-tinta/10" : "border-transparent"
      }`}
    >
      <nav className="flex h-[72px] w-full max-w-[1200px] items-center justify-between">
        <a href={resolverAncora("#inicio", pathname)} className="transition-transform hover:scale-[1.03]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-claro.png" alt={tr("Drive Data Academy")} className="h-8 w-auto sm:h-11" />
        </a>

        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <li key={l.href}>
              {l.href === DESTAQUE ? (
                <a
                  href={assinaturaAberta ? l.href : undefined}
                  aria-disabled={assinaturaAberta ? undefined : true}
                  title={assinaturaAberta ? undefined : tr("Liberamos nos próximos dias")}
                  className={`inline-flex items-baseline gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-[15px] font-semibold transition-colors ${
                    pathname === DESTAQUE ? "bg-noite text-white" : assinaturaAberta ? "text-marca hover:bg-marca-nevoa" : "cursor-default text-marca/70"
                  }`}
                >
                  {l.label}
                  {!assinaturaAberta && <span className="text-[0.7rem] font-normal opacity-70">{EM_BREVE[l.label] || tr("em breve")}</span>}
                </a>
              ) : (
                <a
                  href={l.href}
                  className="whitespace-nowrap rounded-full px-4 py-2 text-[15px] font-medium text-marca transition-colors hover:bg-marca-nevoa"
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
          <AlternarTema className="hidden sm:inline-flex" />
          <a
            href={resolverAncora("#ao-vivo", pathname)}
            className="whitespace-nowrap rounded-full bg-marca-verde px-4 py-2 text-sm font-semibold text-sobre-acento transition-[filter] hover:brightness-95 sm:px-5 sm:py-2.5 sm:text-[15px]"
          >
            {t.nav.cta}
          </a>
          <button
            onClick={() => setOpen((o) => !o)}
            className="ml-1 grid h-9 w-9 place-items-center rounded-full border border-tinta/10 lg:hidden"
            aria-label={tr("Menu")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div className="absolute top-[76px] w-[92%] max-w-6xl rounded-srf bg-papel p-3 shadow-overlay lg:hidden">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href === DESTAQUE && !assinaturaAberta ? undefined : l.href}
              aria-disabled={l.href === DESTAQUE && !assinaturaAberta ? true : undefined}
              onClick={() => setOpen(false)}
              className={
                l.href === DESTAQUE
                  ? "block rounded-xl px-4 py-3 font-semibold text-tinta hover:bg-tinta/5"
                  : "block rounded-xl px-4 py-3 text-slate-200 hover:bg-tinta/5"
              }
            >
              {l.href === DESTAQUE ? (
                <>
                  <span className={`border-b-2 pb-0.5 ${assinaturaAberta ? "border-acento" : "border-acento/40"}`}>{l.label}</span>
                  {!assinaturaAberta && <span className="ml-2 text-xs font-normal text-slate-400">{EM_BREVE[l.label] || tr("em breve")}</span>}
                </>
              ) : (
                l.label
              )}
            </a>
          ))}
          <div className="mt-2 border-t border-tinta/10 px-2 pt-3 sm:hidden">
            <LangSwitcher />
          </div>
        </div>
      )}
    </header>
  );
}
