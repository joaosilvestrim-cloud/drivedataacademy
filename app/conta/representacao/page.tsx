import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity } from "@/lib/community";
import RepClient from "./RepClient";

export const dynamic = "force-dynamic";

export default async function RepresentacaoPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const admin = createAdminClient();
  if (!(await canUseCommunity(admin, user.id, user.email))) redirect("/conta");

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-brand-green">Representação DriveData</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-white">Cresça com a gente</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">Revenda o Portal BI, traga projetos ou candidate-se ao time. Escolha um caminho e registre seu interesse. Mentoria e Marketplace agora têm item próprio no menu.</p>

      <div className="mt-8">
        <RepClient />
      </div>
    </div>
  );
}
