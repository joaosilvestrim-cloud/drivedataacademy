"use client";

import { useState } from "react";
import Link from "next/link";
import FaixaEventos from "@/components/FaixaEventos";
import type { EventoFaixa } from "@/lib/sessao";
import { usePathname } from "next/navigation";
import SignOutButton from "./SignOutButton";
import PaletaDeComandos, { type Destino } from "@/components/conta/PaletaDeComandos";
import { COMMUNITY_WHATSAPP_URL } from "@/lib/links";

function WhatsAppGroupLink({ onNavigate }: { onNavigate?: () => void }) {
  if (!COMMUNITY_WHATSAPP_URL) return null;
  return (
    <a
      href={COMMUNITY_WHATSAPP_URL}
      target="_blank"
      rel="noreferrer"
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-lg border border-[#25D366]/30 bg-[#25D366]/[0.08] px-3 py-2 text-sm text-white transition-colors hover:border-[#25D366]/50 hover:bg-[#25D366]/[0.14]"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-[#25D366]"><path d="M12 2a10 10 0 00-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1012 2zm0 2a8 8 0 11-4.2 14.8l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 0112 4zm-3.5 4c-.2 0-.5 0-.7.4-.2.4-.9.9-.9 2.2s.9 2.5 1 2.7c.2.2 1.9 3 4.7 4.1 2.3.9 2.8.7 3.3.7.5-.1 1.6-.7 1.9-1.3.2-.6.2-1.2.1-1.3l-.6-.3s-1.5-.7-1.7-.8c-.2-.1-.4-.1-.6.1l-.8 1c-.2.2-.3.2-.5.1-.3-.1-1.2-.4-2.2-1.4-.8-.7-1.4-1.6-1.5-1.9-.1-.2 0-.4.1-.5l.4-.5.3-.5c.1-.2 0-.3 0-.5l-.8-1.9c-.2-.4-.4-.4-.6-.4h-.4z"/></svg>
      <span className="leading-tight">Grupo de avisos<span className="block text-[0.65rem] text-slate-400">no WhatsApp</span></span>
    </a>
  );
}

const ICONS: Record<string, string> = {
  universe: "M12 3a9 9 0 100 18 9 9 0 000-18M3 12h18M12 3c4 4 4 14 0 18-4-4-4-14 0-18",
  courses: "M22 10L12 5 2 10l10 5 10-5zM6 12v5c0 1 3 2 6 2s6-1 6-2v-5",
  cardapio: "M4 4h16v16H4zM8 8h8M8 12h8M8 16h5",
  tool: "M4 5h16v10H4zM2 19h20M9 9l2 2 4-4",
  community: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  rep: "M3 21h18M5 21V7l8-4v18M19 21V11l-6-3",
  agenda: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  ranking: "M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0zM7 4H4v2a3 3 0 003 3M17 4h3v2a3 3 0 01-3 3",
  challenge: "M13 2L4.5 12.5h6L9 22l8.5-10.5h-6z",
  diagnostic: "M9 11l2 2 4-4M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z",
  vitrine: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z",
  cert: "M12 2l9 5-9 5-9-5 9-5zM7 10v5c0 1 2.2 2 5 2s5-1 5-2v-5",
  help: "M9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h.01M12 22a10 10 0 100-20 10 10 0 000 20z",
  profile: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM3 21v-2a6 6 0 016-6h6a6 6 0 016 6v2",
  mentoria: "M12 14l9-5-9-5-9 5 9 5zM12 14v7M5 11v4c0 1 3 2 7 2s7-1 7-2v-4",
  materiais: "M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2",
  marketplace: "M3 3h18v4H3zM5 7v13h14V7M9 11h6",
  votacao: "M6 20V11M12 20V4M18 20v-7M3 20h18",
  gravacoes: "M23 7l-7 5 7 5V7zM1 5h15v14H1zM6 9.5v5l4-2.5-4-2.5z",
  sugestao: "M12 3a6 6 0 00-4 10.5V16h8v-2.5A6 6 0 0012 3zM9 19h6M10 22h4",
  biblioteca: "M4 5a2 2 0 012-2h6v18H6a2 2 0 01-2-2zM12 3h6a2 2 0 012 2v14a2 2 0 01-2 2h-6M7 7h2M7 11h2",
  portfolio: "M4 7h16v13H4zM9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M4 12h16",
};

/* O menu segue o que o aluno quer fazer, não o que o sistema tem:
   assistir, praticar, conviver e resolver a própria conta. "busca" são os
   apelidos que a pessoa digita na busca rápida (Ctrl+K) e que não estão no
   rótulo, como "dax" para a Biblioteca. */
type ItemMenu = { label: string; href: string; icon: string; exact?: boolean; emBreve?: boolean; busca?: string };

const GROUPS: { title: string | null; items: ItemMenu[] }[] = [
  { title: null, items: [{ label: "Meus cursos", href: "/conta", icon: "courses", exact: true, busca: "inicio home painel" }] },
  {
    title: "Assistir",
    items: [
      { label: "Cursos", href: "/conta/cursos", icon: "cardapio", busca: "treinamentos catalogo comprar" },
      { label: "Agenda", href: "/conta/agenda", icon: "agenda", busca: "lives mentorias proximos encontros" },
      { label: "Gravações", href: "/conta/gravacoes", icon: "gravacoes", busca: "replay assistir depois" },
      { label: "Certificados", href: "/conta/certificados", icon: "cert", busca: "diploma comprovante" },
    ],
  },
  {
    title: "Praticar",
    items: [
      { label: "Ferramentas", href: "/conta/ferramentas", icon: "tool", busca: "raio-x forja arena caixa-preta drivecanvas treino dojo biblioteca universo" },
      { label: "Novidades", href: "/conta/novidades", icon: "challenge", busca: "o que mudou changelog" },
    ],
  },
  {
    title: "Conviver",
    items: [
      { label: "Comunidade", href: "/conta/comunidade", icon: "community", busca: "chat duvidas conversa" },
      { label: "Portfólio", href: "/conta/portfolio", icon: "portfolio", busca: "projetos vitrine trabalho" },
      { label: "Ranking", href: "/conta/ranking", icon: "ranking", busca: "pontos medalhas" },
      { label: "Vitrine", href: "/conta/vitrine", icon: "vitrine", busca: "alunos perfis rede" },
      { label: "Enquete", href: "/votacao", icon: "votacao", busca: "votacao" },
      { label: "Sugestões", href: "/conta/sugestoes", icon: "sugestao", busca: "ideia pedido melhoria" },
    ],
  },
  {
    title: "Minha conta",
    items: [
      { label: "Perfil", href: "/conta/perfil", icon: "profile", busca: "foto linkedin dados senha" },
      { label: "Parceria & Negócios", href: "/conta/representacao", icon: "rep", busca: "portal bi revenda indicar" },
      { label: "Ajuda", href: "/conta/ajuda", icon: "help", busca: "suporte chamado problema" },
      // Mentoria individual ainda não abriu. Fica visível, para a turma saber
      // que vem, mas sem link: clicar em uma tela vazia frustra mais do que espera.
      { label: "Agendar mentoria", href: "/conta/mentoria", icon: "mentoria", emBreve: true },
    ],
  },
];

/* Ferramenta não ocupa linha no menu, mas continua a uma tecla de distância:
   a busca rápida conhece cada uma pelo nome e pelo apelido. */
const FERRAMENTAS_NA_BUSCA: Destino[] = [
  { label: "Biblioteca de referência", href: "/conta/ferramentas/biblioteca", grupo: "Ferramentas", busca: "dax sql power query oracle protheus codigo verbete" },
  { label: "Treino de DAX e Excel", href: "/conta/ferramentas/dojo", grupo: "Ferramentas", busca: "dojo exercicio formula planilha" },
  { label: "Raio-X do Dashboard", href: "/conta/ferramentas/raio-x", grupo: "Ferramentas", busca: "pbix revisao relatorio" },
  { label: "Arena SQL", href: "/conta/ferramentas/arena", grupo: "Ferramentas", busca: "sql consulta desafio" },
  { label: "Forja DAX", href: "/conta/ferramentas/forja", grupo: "Ferramentas", busca: "calendario medidas tempo" },
  { label: "O número não bate", href: "/conta/ferramentas/conciliacao", grupo: "Ferramentas", busca: "conciliacao divergencia" },
  { label: "Caixa-Preta", href: "/conta/ferramentas/caixa-preta", grupo: "Ferramentas", busca: "ia modelo token" },
  { label: "DriveCanvas", href: "/ferramenta", grupo: "Ferramentas", busca: "visuais html svg cards" },
  { label: "Knowledge Universe 4D", href: "/conta/universo", grupo: "Ferramentas", busca: "universo competencias 3d" },
];

/** A mesma lista, achatada, mais as ferramentas, para a busca rápida do Ctrl+K. */
const DESTINOS: Destino[] = [
  ...GROUPS.flatMap((g) => g.items.filter((i) => !i.emBreve).map((i) => ({ label: i.label, href: i.href, grupo: g.title ?? "Início", busca: i.busca }))),
  ...FERRAMENTAS_NA_BUSCA,
];

type Aviso = { n: number; urgente: boolean };

/* No celular, menu que só abre por gaveta faz a pessoa parar de navegar. A
   barra de baixo deixa os cinco destinos principais a um toque, com o aviso da
   comunidade junto. */
const BARRA: { label: string; href: string; icon: string; exact?: boolean }[] = [
  { label: "Início", href: "/conta", icon: "courses", exact: true },
  { label: "Cursos", href: "/conta/cursos", icon: "cardapio" },
  { label: "Comunidade", href: "/conta/comunidade", icon: "community" },
  { label: "Ferramentas", href: "/conta/ferramentas", icon: "tool" },
  { label: "Perfil", href: "/conta/perfil", icon: "profile" },
];

function BarraInferior({ avisoComunidade }: { avisoComunidade?: Aviso }) {
  const pathname = usePathname();
  const ativo = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));
  return (
    <nav
      aria-label="Atalhos"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/10 bg-ink-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {BARRA.map((it) => {
        const on = ativo(it.href, it.exact);
        const aviso = it.href === "/conta/comunidade" && avisoComunidade && avisoComunidade.n > 0;
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={on ? "page" : undefined}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.62rem] transition-colors ${on ? "text-brand-green" : "text-slate-400"}`}
          >
            <span className="relative">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d={ICONS[it.icon]} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {aviso && (
                <span className={`absolute -right-1.5 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full px-1 text-[0.55rem] font-bold ${avisoComunidade!.urgente ? "bg-red-500 text-white" : "bg-brand-green text-ink-900"}`}>
                  {avisoComunidade!.n > 9 ? "9+" : avisoComunidade!.n}
                </span>
              )}
            </span>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

function NavList({ onNavigate, cursosAVenda = 0, avisoComunidade }: { onNavigate?: () => void; cursosAVenda?: number; avisoComunidade?: Aviso }) {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/") || pathname === href);

  return (
    <nav className="space-y-5">
      {/* Atalho para quem já sabe aonde vai. O mesmo botão serve de dica do Ctrl+K. */}
      <button
        onClick={() => window.dispatchEvent(new Event("abrir-paleta"))}
        className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-sm text-slate-400 transition-colors hover:border-brand-green/40 hover:text-white"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M21 21l-4.3-4.3M11 19a8 8 0 100-16 8 8 0 000 16z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
        Buscar tela
        <kbd className="ml-auto rounded border border-white/10 px-1.5 text-[0.62rem] text-slate-500">Ctrl K</kbd>
      </button>

      {GROUPS.map((group, gi) => (
        <div key={gi}>
          {group.title && <p className="mb-2 px-3 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">{group.title}</p>}
          <ul className="space-y-0.5">
            {group.items.map((it) => {
              const active = isActive(it.href, it.exact);
              const icone = (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={active && !it.emBreve ? "text-brand-green" : "text-slate-500"}>
                  <path d={ICONS[it.icon]} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              );
              return (
                <li key={it.href}>
                  {it.emBreve ? (
                    <span
                      aria-disabled="true"
                      className="flex cursor-default items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500"
                    >
                      {icone}
                      {it.label}
                      <span className="ml-auto text-[0.65rem] text-slate-600">em breve</span>
                    </span>
                  ) : (
                    <Link
                      href={it.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${active ? "bg-white/10 font-medium text-white" : "text-slate-300 hover:bg-white/5 hover:pl-3.5 hover:text-white"}`}
                    >
                      {/* Trilho do item aberto: diz onde você está sem depender só do fundo. */}
                      {active && <span aria-hidden="true" className="absolute -left-1 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-brand-green" />}
                      {icone}
                      {it.label}
                      {/* Treinamento aberto para compra: o número chama, o
                          aluno decide. Some sozinho quando não há nenhum. */}
                      {it.href === "/conta/comunidade" && avisoComunidade && avisoComunidade.n > 0 && !active && (
                        <span
                          className={`ml-auto rounded-full px-2 py-0.5 font-mono text-[0.65rem] font-bold tabular-nums ${avisoComunidade.urgente ? "bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,.5)]" : "bg-brand-green text-ink-900"}`}
                          title={avisoComunidade.urgente ? `${avisoComunidade.n} mensagens de alunos aguardam resposta` : `${avisoComunidade.n} mensagens novas que você ainda não viu`}
                        >
                          {avisoComunidade.n > 99 ? "99+" : avisoComunidade.n}
                        </span>
                      )}
                      {it.href === "/conta/cursos" && cursosAVenda > 0 && (
                        <span className="ml-auto rounded-full bg-brand-green/15 px-2 py-0.5 font-mono text-[0.65rem] font-bold tabular-nums text-brand-green" title={`${cursosAVenda} ${cursosAVenda === 1 ? "treinamento à venda" : "treinamentos à venda"}`}>
                          {cursosAVenda}
                        </span>
                      )}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default function ContaShell({ email, children, cursosAVenda = 0, eventos = [], avisoComunidade }: { email: string; children: React.ReactNode; cursosAVenda?: number; eventos?: EventoFaixa[]; avisoComunidade?: Aviso }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const largura = pathname.startsWith("/conta/comunidade")
    ? "mx-auto w-full max-w-[120rem] px-2 py-3 sm:px-4 sm:py-4"
    : "mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8";

  return (
    <div className="relative min-h-screen">
      {/* Topo (mobile) */}
      <header data-demo-nav className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-ink-900/80 px-4 py-3 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Menu" className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" /></svg>
        </button>
        <Link href="/"><img src="/logo.png" alt="Drive Data Academy" className="h-8 w-auto" /></Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new Event("abrir-paleta"))}
            aria-label="Buscar tela"
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-300"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M21 21l-4.3-4.3M11 19a8 8 0 100-16 8 8 0 000 16z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </button>
          <SignOutButton />
        </div>
      </header>

      {/* Drawer (mobile) */}
      {open && (
        <div data-demo-nav className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col overflow-y-auto border-r border-white/10 bg-ink-900 p-4">
            <div className="mb-6 flex items-center justify-between">
              <Link href="/" onClick={() => setOpen(false)}><img src="/logo.png" alt="Drive Data Academy" className="h-9 w-auto" /></Link>
              <button onClick={() => setOpen(false)} aria-label="Fechar" className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-400">✕</button>
            </div>
            <NavList onNavigate={() => setOpen(false)} cursosAVenda={cursosAVenda} avisoComunidade={avisoComunidade} />
            <div className="mt-6 border-t border-white/10 pt-4">
              <WhatsAppGroupLink onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Sidebar (desktop) */}
      <aside data-demo-nav className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/10 bg-ink-900/70 p-4 backdrop-blur lg:flex">
        <Link href="/" className="mb-8 block px-2">
          <img src="/logo.png" alt="Drive Data Academy" className="h-9 w-auto" />
        </Link>
        <div className="flex-1 overflow-y-auto">
          <NavList cursosAVenda={cursosAVenda} avisoComunidade={avisoComunidade} />
        </div>
        <div className="mt-4 border-t border-white/10 pt-4">
          <WhatsAppGroupLink />
        </div>
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="truncate px-2 text-xs text-slate-500">{email}</p>
          <div className="mt-2 px-2"><SignOutButton /></div>
        </div>
      </aside>

      {/* Conteúdo

          A comunidade é a única tela que ganha com largura: é conversa, lista
          de canais e lista de gente ao mesmo tempo. O resto continua na coluna
          de leitura, que é onde texto longo se lê melhor. */}
      <PaletaDeComandos destinos={DESTINOS} />
      <BarraInferior avisoComunidade={avisoComunidade} />

      <main className="pb-16 lg:pb-0 lg:pl-60" style={eventos.length ? ({ "--faixa": "36px" } as React.CSSProperties) : undefined}>
        {/* Abaixo do cabeçalho no celular, colada no topo no desktop. */}
        <div className="sticky top-[61px] z-30 lg:top-0">
          <FaixaEventos eventos={eventos} />
        </div>
        <div className={largura}>{children}</div>
      </main>
    </div>
  );
}
