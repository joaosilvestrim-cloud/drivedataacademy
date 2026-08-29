import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

// Anúncio do lançamento na home. Aparece só quando existe uma turma aberta e marcada
// para "vender na página de matrícula". Os textos vêm da própria turma (nome/descrição/data).
export default async function LaunchBanner() {
  let turma: any = null;
  let pixPct = 3.99;
  try {
    const admin = createAdminClient();
    const [{ data: t }, { data: cfg }] = await Promise.all([
      admin
        .from("turmas")
        .select("name, description, price, starts_at, max_installments, methods")
        .eq("status", "open")
        .eq("online_sale", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin.from("site_settings").select("value").eq("key", "pix_discount_pct").maybeSingle(),
    ]);
    turma = t;
    if (cfg?.value) pixPct = Number(cfg.value) || pixPct;
  } catch {
    return null;
  }

  if (!turma) return null;

  const price = Number(turma.price) || 0;
  const maxInst = Number(turma.max_installments || 1);
  const methods = turma.methods || "pix,card";
  const allowsPix = methods.includes("pix");
  const pixPrice = Math.round(price * (1 - pixPct / 100) * 100) / 100;
  const dataInicio = turma.starts_at
    ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(new Date(turma.starts_at + "T00:00:00"))
    : "";

  return (
    <section className="relative px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl border border-brand-green/25 bg-gradient-to-br from-brand-green/[0.12] via-ink-800 to-brand-blue/[0.12] p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-green/20 blur-3xl animate-pulse-glow" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-green/40 bg-brand-green/10 px-3 py-1 text-xs font-semibold text-brand-green">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-brand-green" /></span>
                Inscrições abertas{dataInicio ? ` · começa ${dataInicio}` : ""}
              </span>
              <h2 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">{turma.name}</h2>
              {turma.description && <p className="mt-2 max-w-xl text-slate-300">{turma.description}</p>}
              <p className="mt-3 text-sm text-slate-400">Vagas limitadas para esta turma. O acesso é liberado assim que o pagamento é confirmado.</p>
            </div>

            <div className="shrink-0 rounded-2xl border border-white/10 bg-ink-900/50 p-5 text-center">
              {price > 0 ? (
                <>
                  <span className="block text-xs uppercase tracking-wide text-slate-400">Investimento</span>
                  <span className="mt-1 block font-display text-3xl font-bold text-white">{brl(price)}</span>
                  {maxInst > 1 && <span className="block text-xs text-brand-teal">em até {maxInst}x no cartão</span>}
                  {allowsPix && pixPrice < price && <span className="mt-0.5 block text-xs text-brand-green">ou {brl(pixPrice)} no Pix</span>}
                </>
              ) : (
                <span className="block text-sm text-slate-300">Garanta sua vaga</span>
              )}
              <Link href="/matricula" className="mt-4 inline-block w-full rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
                Garantir minha vaga
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
