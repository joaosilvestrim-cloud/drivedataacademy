"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "./SignOutButton";
import FeedbackSalvamento from "./FeedbackSalvamento";

const ICONS: Record<string, string> = {
  overview: "M3 11l9-8 9 8M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10",
  courses: "M22 10L12 5 2 10l10 5 10-5zM6 12v5c0 1 3 2 6 2s6-1 6-2v-5",
  students: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM3 21v-2a6 6 0 016-6h6a6 6 0 016 6v2",
  waitlist: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  leads: "M3 21h18M5 21V7l8-4v18M19 21V11l-6-3",
  materials: "M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2",
  blog: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  settings: "M10.3 3.2a1 1 0 013.4 0l.2.8a1 1 0 001.4.7l.7-.3a1 1 0 011.3 1.3l-.3.7a1 1 0 00.7 1.4l.8.2a1 1 0 010 3.4l-.8.2a1 1 0 00-.7 1.4l.3.7a1 1 0 01-1.3 1.3l-.7-.3a1 1 0 00-1.4.7l-.2.8a1 1 0 01-3.4 0l-.2-.8a1 1 0 00-1.4-.7l-.7.3a1 1 0 01-1.3-1.3l.3-.7a1 1 0 00-.7-1.4l-.8-.2a1 1 0 010-3.4l.8-.2a1 1 0 00.7-1.4l-.3-.7a1 1 0 011.3-1.3l.7.3a1 1 0 001.4-.7l.2-.8zM12 15a3 3 0 100-6 3 3 0 000 6z",
  access: "M12 1l9 4v6c0 5-3.8 9-9 11-5.2-2-9-6-9-11V5l9-4zM9.5 12l1.8 1.8L15 10",
  launch: "M4 13c3-7 8-10 15-10 0 7-3 12-10 15l-3-2-2-3zM9 15l-4 4M14 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  community: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  live: "M23 7l-7 5 7 5V7zM1 5h15v14H1zM6 9.5v5l4-2.5-4-2.5z",
  cert: "M12 2l9 5-9 5-9-5 9-5zM7 10v5c0 1 2.2 2 5 2s5-1 5-2v-5",
  support: "M18 10a6 6 0 10-12 0v4a2 2 0 002 2h1v-6H6M18 10v4a2 2 0 01-2 2h-1v-6h3M12 20a4 4 0 004-4",
  cohort: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  analytics: "M3 3v18h18M7 14l4-4 3 3 5-6",
  billing: "M2 7h20v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7zM2 10h20M6 15h4",
  tool: "M4 5h16v10H4zM2 19h20M9 9l2 2 4-4",
  universe: "M12 3a9 9 0 100 18 9 9 0 000-18M3 12h18M12 3c4 4 4 14 0 18-4-4-4-14 0-18",
  system: "M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01M12 7h4M12 17h4",
  vitrine: "M4 7h16v13H4zM9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M4 12h16",
};

/* O menu é organizado pela tarefa, não pela tabela do banco.

   Cada grupo responde a uma pergunta de quem administra: quem são os alunos,
   o que eles recebem, o que está acontecendo na comunidade, quem pediu ajuda,
   como estão os números, o que está vendendo, como atrair gente e se o sistema
   está de pé. Com quase 40 telas, os grupos abrem e fecham: fica aberto o da
   tela atual e o que tem pendência, o resto recolhe. A busca no topo acha
   qualquer tela pelo nome, inclusive por um apelido ("pix", "qr", "nota"). */

type Item = { label: string; href: string; icon: string; busca?: string };
type Grupo = { id: string; title: string | null; items: Item[] };

const GROUPS: Grupo[] = [
  { id: "inicio", title: null, items: [{ label: "Visão geral", href: "/admin", icon: "overview" }] },
  {
    id: "alunos",
    title: "Alunos e acesso",
    items: [
      { label: "Alunos", href: "/admin/alunos", icon: "students" },
      { label: "Acessos e demonstrações", href: "/admin/acessos", icon: "access", busca: "liberar cortesia demo criar aluno" },
      { label: "Turmas e lotes", href: "/admin/turmas", icon: "cohort" },
      { label: "Liberação de downloads", href: "/admin/downloads", icon: "materials" },
      { label: "Certificados", href: "/admin/certificados", icon: "cert" },
    ],
  },
  {
    id: "conteudo",
    title: "Conteúdo",
    items: [
      { label: "Cursos", href: "/admin/cursos", icon: "courses", busca: "aulas modulos video" },
      { label: "Lives e gravações", href: "/admin/lives", icon: "live", busca: "agenda mentoria panda" },
      { label: "Presenças", href: "/admin/presencas", icon: "live", busca: "qr code palavra-chave" },
      { label: "Desafios", href: "/admin/desafios", icon: "courses" },
      { label: "DriveCanvas", href: "/admin/ferramenta", icon: "tool", busca: "ferramenta de visuais" },
      { label: "Knowledge Universe 4D", href: "/admin/universo", icon: "universe" },
      { label: "Nomes das ferramentas", href: "/admin/nomes-ferramentas", icon: "tool", busca: "renomear" },
    ],
  },
  {
    id: "comunidade",
    title: "Comunidade",
    items: [
      { label: "Comunidade", href: "/admin/comunidade", icon: "community", busca: "chat moderacao" },
      { label: "Comentários das aulas", href: "/admin/comentarios", icon: "blog" },
      { label: "Votações", href: "/admin/votacoes", icon: "analytics", busca: "enquete" },
      { label: "Portfólio dos alunos", href: "/admin/portfolio", icon: "vitrine", busca: "projetos vitrine" },
    ],
  },
  {
    id: "atendimento",
    title: "Atendimento",
    items: [
      { label: "Chamados", href: "/admin/suporte", icon: "support", busca: "suporte ajuda" },
      { label: "Parceria & Negócios", href: "/admin/representacao", icon: "leads", busca: "portal bi mentoria candidatura" },
    ],
  },
  {
    id: "indicadores",
    title: "Indicadores",
    items: [
      { label: "Analytics de alunos", href: "/admin/analytics", icon: "analytics", busca: "retencao video horario recorrencia churn" },
      { label: "Uso da plataforma", href: "/admin/uso", icon: "analytics", busca: "ferramentas mais usadas" },
      { label: "Progresso nos cursos", href: "/admin/progresso", icon: "analytics" },
      { label: "Painel de ensino", href: "/admin/ensino", icon: "overview", busca: "ranking pontos premio" },
      { label: "Analytics de leads", href: "/admin/leads-analytics", icon: "analytics", busca: "marketing funil" },
    ],
  },
  {
    id: "vendas",
    title: "Vendas",
    items: [
      { label: "Pagamentos e e-mails", href: "/admin/operacao", icon: "billing", busca: "asaas pix boleto cobranca pedido" },
      { label: "Assinatura e planos", href: "/admin/turma", icon: "launch", busca: "preco mensal anual" },
      { label: "Cupons", href: "/admin/cupons", icon: "billing", busca: "desconto" },
      { label: "Cancelamentos", href: "/admin/cancelamentos", icon: "billing", busca: "churn cancelar assinatura motivo saida" },
      { label: "Workshops", href: "/admin/workshops", icon: "live" },
    ],
  },
  {
    id: "marketing",
    title: "Marketing",
    items: [
      { label: "Leads de empresas", href: "/admin/leads", icon: "leads" },
      { label: "Lista de espera", href: "/admin/waitlist", icon: "waitlist" },
      { label: "Materiais gratuitos", href: "/admin/materiais", icon: "materials", busca: "isca ebook" },
      { label: "Blog", href: "/admin/posts", icon: "blog", busca: "posts artigos" },
    ],
  },
  {
    id: "sistema",
    title: "Sistema",
    items: [
      { label: "Saúde do sistema", href: "/admin/sistema", icon: "system", busca: "visao integracoes status" },
      { label: "Assistente IA", href: "/admin/ia", icon: "community", busca: "mascote chat" },
      { label: "Traduções", href: "/admin/traducoes", icon: "system", busca: "idioma ingles espanhol i18n traduzir" },
      { label: "Notificações", href: "/admin/notificacoes", icon: "support", busca: "email aviso" },
      { label: "Configurações", href: "/admin/settings", icon: "settings" },
    ],
  },
];

type Badges = Record<string, number>;

const semAcento = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const CHAVE_ABERTOS = "admin:menu:abertos";

function ItemMenu({ it, active, qtd, onNavigate, grupo }: { it: Item; active: boolean; qtd: number; onNavigate?: () => void; grupo?: string | null }) {
  const pend = qtd > 0;
  return (
    <li>
      <Link
        href={it.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={`relative flex items-center gap-3 overflow-hidden rounded-lg px-3 py-2 text-sm transition-colors ${
          active ? "bg-white/10 font-medium text-white" : pend ? "font-medium text-amber-100 hover:bg-white/5" : "text-slate-300 hover:bg-white/5 hover:text-white"
        }`}
      >
        {/* Pendência: o fundo pulsa até alguém atuar. */}
        {pend && !active && <span aria-hidden="true" className="pointer-events-none absolute inset-0 animate-pulse rounded-lg bg-amber-400/15 ring-1 ring-inset ring-amber-400/40" />}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={`shrink-0 ${active ? "text-brand-green" : "text-slate-500"}`}>
          <path d={ICONS[it.icon]} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="min-w-0">
          <span className="block truncate">{it.label}</span>
          {grupo && <span className="block truncate text-[0.65rem] font-normal text-slate-500">{grupo}</span>}
        </span>
        {pend && (
          <span className="relative ml-auto flex">
            <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-amber-400 opacity-60" />
            <span className="relative grid min-w-5 place-items-center rounded-full bg-amber-400 px-1.5 text-[0.65rem] font-bold text-ink-900">
              {qtd}
              <span className="sr-only"> pendente{qtd === 1 ? "" : "s"}</span>
            </span>
          </span>
        )}
      </Link>
    </li>
  );
}

function NavList({ onNavigate, badges }: { onNavigate?: () => void; badges?: Badges }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/"));
  const [busca, setBusca] = useState("");
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});

  // O que o admin abriu ou fechou à mão fica lembrado neste navegador.
  useEffect(() => {
    try { setAbertos(JSON.parse(localStorage.getItem(CHAVE_ABERTOS) || "{}")); } catch {}
  }, []);
  const alternar = (id: string, agora: boolean) => {
    const novo = { ...abertos, [id]: !agora };
    setAbertos(novo);
    try { localStorage.setItem(CHAVE_ABERTOS, JSON.stringify(novo)); } catch {}
  };

  const q = semAcento(busca.trim());
  const achados = q
    ? GROUPS.flatMap((g) => g.items.map((it) => ({ it, grupo: g.title })).filter(({ it, grupo }) => semAcento(`${it.label} ${grupo ?? ""} ${it.busca ?? ""}`).includes(q)))
    : [];

  return (
    <nav className="space-y-4">
      <div className="relative">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true">
          <path d="M21 21l-4.3-4.3M11 19a8 8 0 100-16 8 8 0 000 16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") setBusca(""); }}
          placeholder="Buscar tela..."
          aria-label="Buscar tela no menu"
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-8 pr-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/50"
        />
      </div>

      {q ? (
        <ul className="space-y-0.5">
          {achados.map(({ it, grupo }) => (
            <ItemMenu key={it.href} it={it} grupo={grupo} active={isActive(it.href)} qtd={badges?.[it.href] ?? 0} onNavigate={() => { setBusca(""); onNavigate?.(); }} />
          ))}
          {!achados.length && <li className="px-3 py-2 text-sm text-slate-500">Nenhuma tela com esse nome.</li>}
        </ul>
      ) : (
        GROUPS.map((group) => {
          const pendGrupo = group.items.reduce((t, it) => t + (badges?.[it.href] ?? 0), 0);
          const temAtivo = group.items.some((it) => isActive(it.href));
          // Grupo da tela atual e grupo com pendência abrem sozinhos; o resto obedece ao que o admin escolheu.
          const aberto = !group.title || temAtivo || pendGrupo > 0 || !!abertos[group.id];
          return (
            <div key={group.id}>
              {group.title && (
                <button
                  type="button"
                  onClick={() => alternar(group.id, aberto)}
                  aria-expanded={aberto}
                  className="mb-1 flex w-full items-center gap-2 rounded-md px-3 py-1 text-left text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500 transition-colors hover:text-slate-300"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`transition-transform ${aberto ? "rotate-90" : ""}`}>
                    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {group.title}
                  {!aberto && pendGrupo > 0 && (
                    <span className="ml-auto rounded-full bg-amber-400 px-1.5 text-[0.6rem] font-bold text-ink-900">{pendGrupo}</span>
                  )}
                </button>
              )}
              {aberto && (
                <ul className="space-y-0.5">
                  {group.items.map((it) => (
                    <ItemMenu key={it.href} it={it} active={isActive(it.href)} qtd={badges?.[it.href] ?? 0} onNavigate={onNavigate} />
                  ))}
                </ul>
              )}
            </div>
          );
        })
      )}
    </nav>
  );
}

// A cada 45 s o menu pergunta ao servidor o que está pendente. Também
// atualiza ao trocar de tela, para o badge sumir logo depois de atuar.
const INTERVALO_MS = 45_000;

export default function AdminShell({ email, children, badges: inicial }: { email: string; children: React.ReactNode; badges?: Badges }) {
  const [open, setOpen] = useState(false);
  const [badges, setBadges] = useState<Badges>(inicial ?? {});
  const pathname = usePathname();

  useEffect(() => { setBadges(inicial ?? {}); }, [inicial]);

  useEffect(() => {
    let vivo = true;
    async function atualizar() {
      if (document.hidden) return;
      try {
        const r = await fetch(`/api/admin/pendencias?em=${encodeURIComponent(pathname)}`, { cache: "no-store" });
        if (r.ok && vivo) setBadges(await r.json());
      } catch { /* sem rede: mantém o último valor */ }
    }
    atualizar();
    const id = setInterval(atualizar, INTERVALO_MS);
    const aoVoltar = () => { if (!document.hidden) atualizar(); };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => { vivo = false; clearInterval(id); document.removeEventListener("visibilitychange", aoVoltar); };
  }, [pathname]);

  const total = Object.values(badges).reduce((t, n) => t + (n || 0), 0);

  // Total no título da aba: dá para ver de outra aba que chegou algo.
  useEffect(() => {
    const limpo = document.title.replace(/^\(\d+\) /, "");
    document.title = total > 0 ? `(${total}) ${limpo}` : limpo;
  }, [total, pathname]);

  return (
    <div className="min-h-screen">
      {/* Barra superior (mobile) */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-ink-900/80 px-4 py-3 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} aria-label={total > 0 ? `Menu, ${total} pendência${total === 1 ? "" : "s"}` : "Menu"} className="relative grid h-9 w-9 place-items-center rounded-lg border border-white/10">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" /></svg>
          {total > 0 && (
            <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-400" />
            </span>
          )}
        </button>
        <span className="font-display text-sm font-bold text-white">Portal <span className="text-gradient">DriveData</span></span>
        <SignOutButton />
      </header>

      {/* Drawer (mobile) */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] overflow-y-auto border-r border-white/10 bg-ink-900 p-4">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-display text-lg font-bold text-white">Portal <span className="text-gradient">DriveData</span></span>
              <button onClick={() => setOpen(false)} aria-label="Fechar" className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-400">✕</button>
            </div>
            <NavList onNavigate={() => setOpen(false)} badges={badges} />
          </div>
        </div>
      )}

      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-white/10 bg-white/[0.02] p-4 lg:flex">
        <Link href="/admin" className="mb-8 block px-2 font-display text-lg font-bold text-white">
          Portal <span className="text-gradient">DriveData</span>
        </Link>
        <div className="flex-1 overflow-y-auto">
          <NavList badges={badges} />
        </div>
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="truncate px-2 text-xs text-slate-500">{email}</p>
          <div className="mt-2 px-2">
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="lg:pl-60">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>

      {/* Retorno de salvamento de todos os formulários do admin. */}
      <FeedbackSalvamento />
    </div>
  );
}
