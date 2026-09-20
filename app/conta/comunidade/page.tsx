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
      <div className="rounded-3xl border border-white/10 bg-white/[0.02] px-6 py-20 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-green to-brand-blue text-ink-900">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h1 className="font-display text-2xl font-bold text-white">{tr("Comunidade")}</h1>
        <p className="mt-2 text-slate-400">{tr("A comunidade é exclusiva para alunos com acesso ativo.")}</p>
        <Link href="/matricula" className="mt-6 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">{tr("Garantir meu acesso")}</Link>
      </div>
    );
  }

  const { data: channels } = await admin.from("forum_channels").select("slug").order("position").limit(1);
  const first = channels?.[0]?.slug || "geral";
  redirect(`/conta/comunidade/${first}`);
}
