import Link from "next/link";
import { redirect } from "next/navigation";
import Background from "@/components/Background";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./SignOutButton";

const NAV = [
  { label: "Meus cursos", href: "/conta" },
  { label: "Certificados", href: "/conta/certificados" },
  { label: "Perfil", href: "/conta/perfil" },
];

export default async function ContaLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  return (
    <>
      <Background />
      <div className="relative min-h-screen">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-900/70 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
            <div className="flex items-center gap-6">
              <Link href="/">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Drive Data Academy" className="h-9 w-auto" />
              </Link>
              <nav className="hidden items-center gap-1 sm:flex">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className="rounded-lg px-3 py-1.5 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
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
          <nav className="flex items-center gap-1 px-6 pb-2 sm:hidden">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
                {n.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
      </div>
    </>
  );
}
