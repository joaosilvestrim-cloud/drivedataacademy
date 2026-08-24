"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "./SignOutButton";

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
  support: "M18 10a6 6 0 10-12 0v4a2 2 0 002 2h1v-6H6M18 10v4a2 2 0 01-2 2h-1v-6h3M12 20a4 4 0 004-4",
  cohort: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
};

const GROUPS: { title: string | null; items: { label: string; href: string; icon: string }[] }[] = [
  { title: null, items: [{ label: "Visão geral", href: "/admin", icon: "overview" }] },
  {
    title: "Ensino",
    items: [
      { label: "Cursos", href: "/admin/cursos", icon: "courses" },
      { label: "Alunos", href: "/admin/alunos", icon: "students" },
      { label: "Comunidade", href: "/admin/comunidade", icon: "community" },
      { label: "Lives", href: "/admin/lives", icon: "live" },
    ],
  },
  {
    title: "Vendas",
    items: [
      { label: "Turmas", href: "/admin/turmas", icon: "cohort" },
      { label: "Acessos", href: "/admin/acessos", icon: "access" },
      { label: "Matrícula", href: "/admin/turma", icon: "launch" },
    ],
  },
  {
    title: "Marketing",
    items: [
      { label: "Lista de espera", href: "/admin/waitlist", icon: "waitlist" },
      { label: "Leads empresas", href: "/admin/leads", icon: "leads" },
      { label: "Materiais", href: "/admin/materiais", icon: "materials" },
      { label: "Blog", href: "/admin/posts", icon: "blog" },
    ],
  },
  {
    title: "Suporte",
    items: [{ label: "Chamados", href: "/admin/suporte", icon: "support" }],
  },
  { title: "Sistema", items: [{ label: "Configurações", href: "/admin/settings", icon: "settings" }] },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <nav className="space-y-6">
      {GROUPS.map((group, gi) => (
        <div key={gi}>
          {group.title && (
            <p className="mb-2 px-3 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">{group.title}</p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((it) => {
              const active = isActive(it.href);
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      active ? "bg-white/10 font-medium text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
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

export default function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Barra superior (mobile) */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-ink-900/80 px-4 py-3 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Menu" className="grid h-9 w-9 place-items-center rounded-lg border border-white/10">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" /></svg>
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
            <NavList onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-white/10 bg-white/[0.02] p-4 lg:flex">
        <Link href="/admin" className="mb-8 block px-2 font-display text-lg font-bold text-white">
          Portal <span className="text-gradient">DriveData</span>
        </Link>
        <div className="flex-1 overflow-y-auto">
          <NavList />
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
    </div>
  );
}
