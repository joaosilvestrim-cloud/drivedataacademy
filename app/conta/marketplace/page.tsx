import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity } from "@/lib/community";
import FunilForm from "../_funis/FunilForm";
import { FUNIL } from "../_funis/definicoes";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const admin = createAdminClient();
  if (!(await canUseCommunity(admin, user.id, user.email))) redirect("/conta");

  const form = FUNIL.marketplace;

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-brand-green">Marketplace</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-white">{form.title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">{form.desc}</p>

      <div className="mt-8 max-w-2xl">
        <FunilForm form={form} cabecalho={false} />
      </div>
    </div>
  );
}
