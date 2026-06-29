import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import SignOutButton from "./SignOutButton";

const NAV = [
  { label: "Visão geral", href: "/admin" },
  { label: "Lista de espera", href: "/admin/waitlist" },
  { label: "Leads empresas", href: "/admin/leads" },
  { label: "Materiais", href: "/admin/materiais" },
  { label: "Blog", href: "/admin/posts" },
  { label: "Configurações", href: "/admin/settings" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-display text-lg font-bold text-white">
              Portal <span className="text-gradient">DriveData</span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-lg px-3 py-1.5 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 sm:block">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto px-6 pb-2 md:hidden">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
