import Link from "next/link";
import Background from "@/components/Background";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createAdminClient } from "@/lib/supabase/admin";
import MatriculaForm from "./MatriculaForm";
import { SUB_INCLUDES, parseIncludes } from "@/lib/subscription";

export const dynamic = "force-dynamic";

const KEYS = ["sub_price", "full_access_price", "turma_nome", "turma_descricao", "sales_open", "sub_includes"];

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function MatriculaPage() {
  let cfg: Record<string, string> = {};
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("site_settings").select("key, value").in("key", KEYS);
    cfg = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
  } catch {
    cfg = {};
  }

  const open = cfg.sales_open === "1";
  const nome = cfg.turma_nome || "DriveData Academy";
  const descricao = cfg.turma_descricao || "Acesso a todos os cursos, avaliações e certificados enquanto sua assinatura estiver ativa.";
  const price = Number(cfg.sub_price || cfg.full_access_price || "0") || 0;

  const picked = parseIncludes(cfg.sub_includes);
  const beneficios = SUB_INCLUDES.filter((i) => picked.includes(i.key)).map((i) => i.label);

  return (
    <div className="relative min-h-screen bg-ink-900">
      <Background />
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-28">
        {!open ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-16 text-center">
            <p className="text-sm font-medium uppercase tracking-wide text-brand-green">Matrículas</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-white">Inscrições fechadas no momento</h1>
            <p className="mt-3 text-slate-300">Entre na lista de espera e avisamos assim que abrir.</p>
            <Link href="/#lista" className="mt-6 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900">Entrar na lista de espera</Link>
          </div>
        ) : (
          <div className="grid items-start gap-10 lg:grid-cols-2">
            {/* Oferta */}
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-brand-green">Assinatura</p>
              <h1 className="mt-2 font-display text-4xl font-bold text-white">{nome}</h1>
              <p className="mt-4 text-lg text-slate-300">{descricao}</p>

              <ul className="mt-8 space-y-3">
                {beneficios.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-slate-200">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-brand-green"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    {b}
                  </li>
                ))}
              </ul>

              {price > 0 && (
                <div className="mt-8 flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-brand-green/[0.08] to-transparent px-5 py-4">
                  <div>
                    <span className="block text-xs uppercase tracking-wide text-slate-400">Assinatura mensal</span>
                    <span className="font-display text-3xl font-bold text-white">{brl(price)}<span className="text-base font-normal text-slate-400">/mês</span></span>
                    <span className="mt-0.5 block text-xs text-brand-teal">no cartão de crédito · cancele quando quiser</span>
                  </div>
                  <span className="rounded-full bg-brand-green/15 px-3 py-1 text-xs font-semibold text-brand-green">Acesso full</span>
                </div>
              )}
            </div>

            {/* Form */}
            <div className="glow-border rounded-2xl">
              <div className="glass rounded-2xl p-6 sm:p-8">
                <h2 className="font-display text-xl font-bold text-white">Assine agora</h2>
                <p className="mt-1 text-sm text-slate-400">Preencha, pague no cartão e sua conta é criada na hora da confirmação.</p>
                <div className="mt-6">
                  <MatriculaForm turmaNome={nome} />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
