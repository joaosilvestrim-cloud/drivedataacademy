"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "./SignOutButton";

const ICONS: Record<string, string> = {
  courses: "M22 10L12 5 2 10l10 5 10-5zM6 12v5c0 1 3 2 6 2s6-1 6-2v-5",
  tool: "M4 5h16v10H4zM2 19h20M9 9l2 2 4-4",
  community: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  rep: "M3 21h18M5 21V7l8-4v18M19 21V11l-6-3",
  agenda: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  ranking: "M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0zM7 4H4v2a3 3 0 003 3M17 4h3v2a3 3 0 01-3 3",
  vitrine: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z",
  cert: "M12 2l9 5-9 5-9-5 9-5zM7 10v5c0 1 2.2 2 5 2s5-1 5-2v-5",
  help: "M9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h.01M12 22a10 10 0 100-20 10 10 0 000 20z",
  profile: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM3 21v-2a6 6 0 016-6h6a6 6 0 016 6v2",
};

const GROUPS: { title: string | null; items: { label: string; href: string; icon: string; exact?: boolean }[] }[] = [
  { title: null, items: [{ label: "Meus cursos", href: "/conta", icon: "courses", exact: true }] },
  {
    title: "Aprender",
    items: [
      { label: "Agenda", href: "/conta/agenda", icon: "agenda" },
      { label: "Ferramenta", href: "/ferramenta", icon: "tool" },
      { label: "Certificados", href: "/conta/certificados", icon: "cert" },
    ],
  },
  {
    title: "Comunidade",
    items: [
      { label: "Comunidade", href: "/conta/comunidade", icon: "community" },
      { label: "Ranking", href: "/conta/ranking", icon: "ranking" },
      { label: "Vitrine", href: "/conta/vitrine", icon: "vitrine" },
      { label: "Representação", href: "/conta/representacao", icon: "rep" },
    ],
  },
  {
    title: "Conta",
    items: [
      { label: "Perfil", href: "/conta/perfil", icon: "profile" },
      { label: "Ajuda", href: "/conta/ajuda", icon: "help" },
    ],
  },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/") || pathname === href);

  return (
    <nav className="space-y-5">
      {GROUPS.map((group, gi) => (
        <div key={gi}>
          {group.title && <p className="mb-2 px-3 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">{group.title}</p>}
          <ul className="space-y-0.5">
            {group.items.map((it) => {
              const active = isActive(it.href, it.exact);
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${active ? "bg-white/10 font-medium text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={active ? "text-brand-green" : "text-slate-500"}>
                      <path d={ICONS[it.icon]} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {it.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default function ContaShell({ email, children }: { email: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      {/* Topo (mobile) */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-ink-900/80 px-4 py-3 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Menu" className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" /></svg>
        </button>
        <Link href="/"><img src="/logo.png" alt="Drive Data Academy" className="h-8 w-auto" /></Link>
        <SignOutButton />
      </header>

      {/* Drawer (mobile) */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col overflow-y-auto border-r border-white/10 bg-ink-900 p-4">
            <div className="mb-6 flex items-center justify-between">
              <Link href="/" onClick={() => setOpen(false)}><img src="/logo.png" alt="Drive Data Academy" className="h-9 w-auto" /></Link>
              <button onClick={() => setOpen(false)} aria-label="Fechar" className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-400">✕</button>
            </div>
            <NavList onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/10 bg-ink-900/70 p-4 backdrop-blur lg:flex">
        <Link href="/" className="mb-8 block px-2">
          <img src="/logo.png" alt="Drive Data Academy" className="h-9 w-auto" />
        </Link>
        <div className="flex-1 overflow-y-auto">
          <NavList />
        </div>
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="truncate px-2 text-xs text-slate-500">{email}</p>
          <div className="mt-2 px-2"><SignOutButton /></div>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="lg:pl-60">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
