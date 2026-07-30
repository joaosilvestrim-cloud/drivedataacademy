import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ContaHome() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .maybeSingle();

  const firstName = (profile?.full_name || "").split(" ")[0];

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-white">
        Olá{firstName ? `, ${firstName}` : ""}! 👋
      </h1>
      <p className="mt-1 text-slate-400">Bem-vindo à sua área de aluno.</p>

      <div className="mt-8">
        <h2 className="font-display text-lg font-bold text-white">Meus cursos</h2>

        {/* Empty state — os cursos chegam na próxima fase */}
        <div className="mt-4 rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/5 text-brand-green">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M4 19V6a2 2 0 012-2h9l5 5v10a2 2 0 01-2 2H6a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          <p className="mt-4 font-medium text-white">Você ainda não tem cursos.</p>
          <p className="mt-1 text-sm text-slate-400">
            Os cursos da DriveData Academy chegam em breve. Fique de olho!
          </p>
          <Link href="/#cursos" className="mt-5 inline-block rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:border-brand-green/50 hover:text-brand-green">
            Ver o que vem por aí
          </Link>
        </div>
      </div>
    </div>
  );
}
