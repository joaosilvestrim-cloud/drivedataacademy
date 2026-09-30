import { tr } from "@/lib/i18n/traduzir-servidor";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity } from "@/lib/community";
import { usuarioAtual } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function ComunidadeIndex() {
  const user = await usuarioAtual();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  if (!(await canUseCommunity(admin, user.id, user.email))) {
    return (
      <div className="rounded-[20px] border border-tinta/10 bg-papel px-6 py-20 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-marca-verde text-sobre-acento">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h1 className="text-[2rem] font-bold leading-tight tracking-tight text-obsidian">{tr("Comunidade")}</h1>
        <p className="mt-2 text-slate-400">{tr("A comunidade é exclusiva para alunos com acesso ativo.")}</p>
        <Link href="/matricula" className="mt-6 inline-block rounded-full bg-marca-verde px-6 py-3 text-sm font-semibold text-sobre-acento transition-[filter] hover:brightness-95">{tr("Garantir meu acesso")}</Link>
      </div>
    );
  }

  const { data: channels } = await admin.from("forum_channels").select("slug").order("position").limit(1);
  const first = channels?.[0]?.slug || "geral";
  redirect(`/conta/comunidade/${first}`);
}
