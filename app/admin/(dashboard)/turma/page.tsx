import { createAdminClient } from "@/lib/supabase/admin";
import AdminError from "../AdminError";
import TurmaForm from "./TurmaForm";

const TURMA_KEYS = ["full_access_price", "turma_nome", "turma_data", "turma_descricao", "sales_open", "checkout_whatsapp"];

export const dynamic = "force-dynamic";

export default async function TurmaPage({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  let initial: Record<string, string> = {};
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("site_settings").select("key, value").in("key", TURMA_KEYS);
    if (error) throw new Error(error.message);
    initial = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Turma & acesso full</h1>
        <div className="mt-6"><AdminError message={e instanceof Error ? e.message : "Erro."} /></div>
      </div>
    );
  }

  const asaasOn = !!process.env.ASAAS_API_KEY;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Turma & acesso full</h1>
      <p className="mt-1 text-sm text-slate-400">Configura o lançamento e a página de matrícula pública.</p>

      {searchParams?.ok && (
        <div className="mt-5 rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm text-brand-green">Salvo! A página de matrícula atualiza em até 1 minuto.</div>
      )}
      {searchParams?.error && (
        <div className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{searchParams.error}</div>
      )}

      <div className={`mt-5 rounded-xl border px-4 py-3 text-sm ${asaasOn ? "border-brand-green/30 bg-brand-green/10 text-brand-green" : "border-amber-400/30 bg-amber-400/10 text-amber-200"}`}>
        {asaasOn
          ? "Pagamento automático (Asaas) ligado — a matrícula gera cobrança e o acesso é liberado sozinho."
          : "Pagamento automático desligado — a matrícula registra o pedido e orienta o aluno pelo WhatsApp. Libere o acesso na aba Acessos após confirmar o pagamento."}
      </div>

      <div className="mt-6">
        <TurmaForm initial={initial} />
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Página pública: <a href="/matricula" target="_blank" className="text-brand-teal hover:underline">/matricula</a>
      </p>
    </div>
  );
}
