import { tr } from "@/lib/i18n/traduzir-servidor";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity } from "@/lib/community";
import RepClient from "./RepClient";
import { usuarioAtual } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function RepresentacaoPage() {
  const user = await usuarioAtual();
  if (!user) redirect("/entrar");
  const admin = createAdminClient();
  if (!(await canUseCommunity(admin, user.id, user.email))) redirect("/conta");

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-brand-green">{tr("Parceria & Negócios")}</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-white">{tr("Cresça com a gente")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">{tr("Revenda o Portal BI, traga projetos ou candidate-se ao time. Escolha um caminho e registre seu interesse. Agendar mentoria agora tem item próprio no menu.")}</p>

      <div className="mt-8">
        <RepClient />
      </div>
    </div>
  );
}
