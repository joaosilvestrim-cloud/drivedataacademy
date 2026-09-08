import { createAdminClient } from "@/lib/supabase/admin";
import AdminError from "../AdminError";
import Flash from "./Flash";
import TurmaForm from "./TurmaForm";

const KEYS = ["sub_price", "full_access_price", "turma_nome", "turma_descricao", "sales_open", "checkout_whatsapp"];

export const dynamic = "force-dynamic";

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
      <p className="font-display text-2xl font-bold text-white">{value}</p>
      <p className="mt-0.5 text-xs text-slate-400">{label}</p>
    </div>
  );
}

export default async function TurmaPage({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  let initial: Record<string, string> = {};
  let activeSubs = 0;
  let paid30 = 0;
  let pending30 = 0;

  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    const orders = () => admin.from("orders").select("id", { count: "exact", head: true }).eq("product", "subscription").gte("created_at", since);

    const [cfg, subs, paid, pend] = await Promise.all([
      admin.from("site_settings").select("key, value").in("key", KEYS),
      admin.from("memberships").select("id", { count: "exact", head: true }).eq("source", "subscription").eq("status", "active"),
      orders().eq("status", "paid"),
      orders().eq("status", "pending"),
    ]);

    if (cfg.error) throw new Error(cfg.error.message);
    initial = Object.fromEntries((cfg.data ?? []).map((r: any) => [r.key, r.value]));
    activeSubs = subs.count ?? 0;
    paid30 = paid.count ?? 0;
    pending30 = pend.count ?? 0;
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Assinatura</h1>
        <div className="mt-6">
          <AdminError message={e instanceof Error ? e.message : "Erro."} />
        </div>
      </div>
    );
  }

  const asaasOn = !!process.env.ASAAS_API_KEY;
  const open = initial.sales_open === "1";
  const price = Number(initial.sub_price || initial.full_access_price || "0") || 0;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-white">Assinatura</h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                open ? "border-brand-green/40 bg-brand-green/10 text-brand-green" : "border-white/15 bg-white/5 text-slate-400"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${open ? "bg-brand-green" : "bg-slate-500"}`} />
              {open ? "Vendendo" : "Vendas fechadas"}
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            O produto público da plataforma: assinatura mensal no cartão, acesso a tudo enquanto ativa. Aqui você define preço, textos e liga ou desliga a venda.
          </p>
        </div>
        <a
          href="/matricula"
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-brand-teal/50 hover:text-white"
        >
          Ver página pública
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>

      {searchParams?.ok && <Flash kind="ok" message="Salvo. A página pública já está com os novos dados." />}
      {searchParams?.error && <Flash kind="error" message={searchParams.error} />}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat value={activeSubs} label="Assinantes ativos" />
        <Stat value={paid30} label="Assinaturas pagas (30 dias)" />
        <Stat value={pending30} label="Pedidos aguardando pagamento (30 dias)" />
      </div>

      <div className="mt-6">
        <TurmaForm initial={initial} asaasOn={asaasOn} currentPrice={price} />
      </div>
    </div>
  );
}
