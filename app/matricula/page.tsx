import Link from "next/link";
import Background from "@/components/Background";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createAdminClient } from "@/lib/supabase/admin";
import MatriculaForm from "./MatriculaForm";

export const dynamic = "force-dynamic";

const TURMA_KEYS = ["full_access_price", "turma_nome", "turma_data", "turma_descricao", "sales_open"];

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

export default async function MatriculaPage() {
  let cfg: Record<string, string> = {};
  let product: any = null;
  try {
    const admin = createAdminClient();
    const [{ data }, { data: prod }] = await Promise.all([
      admin.from("site_settings").select("key, value").in("key", TURMA_KEYS),
      admin.from("turmas").select("name, description, price, max_installments, methods, starts_at").eq("status", "open").eq("online_sale", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    cfg = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
    product = prod;
  } catch {
    cfg = {};
  }

  const open = cfg.sales_open === "1" || !!product;
  const nome = product?.name || cfg.turma_nome || "Acesso Full DriveData Academy";
  const data = (product?.starts_at ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(new Date(product.starts_at + "T00:00:00")) : cfg.turma_data) || "";
  const descricao = product?.description || cfg.turma_descricao || "Acesso a todos os cursos, avaliações e certificados.";
  const price = product ? Number(product.price) : Number(cfg.full_access_price || "0") || 0;
  const maxInst = Number(product?.max_installments || 1);
  const allowsCard = (product?.methods || "pix,card,boleto").includes("card");
  const installmentHint = allowsCard && maxInst > 1 ? `em até ${maxInst}x no cartão · R$ ${(price / maxInst).toFixed(2)}/mês` : null;

  const beneficios = [
    "Todos os cursos da plataforma, sem limite",
    "Avaliações e certificados de conclusão",
    "Novas turmas e conteúdos incluídos",
    "Suporte e comunidade DriveData",
  ];

  return (
    <div className="relative min-h-screen bg-ink-900">
      <Background />
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-28">
        {!open ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-16 text-center">
            <p className="text-sm font-medium uppercase tracking-wide text-brand-green">Matrículas</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-white">Inscrições fechadas no momento</h1>
            <p className="mt-3 text-slate-300">Estamos entre turmas. Entre na lista de espera e avisamos assim que abrir a próxima.</p>
            <Link href="/#lista" className="mt-6 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900">Entrar na lista de espera</Link>
          </div>
        ) : (
          <div className="grid items-start gap-10 lg:grid-cols-2">
            {/* Oferta */}
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-brand-green">Matrícula</p>
              <h1 className="mt-2 font-display text-4xl font-bold text-white">{nome}</h1>
              {data && <p className="mt-2 text-brand-teal">Início: {data}</p>}
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
                    <span className="block text-xs uppercase tracking-wide text-slate-400">Acesso full</span>
                    <span className="font-display text-3xl font-bold text-white">{brl(price)}</span>
                    {installmentHint && <span className="mt-0.5 block text-xs text-brand-teal">{installmentHint}</span>}
                  </div>
                  <span className="rounded-full bg-brand-green/15 px-3 py-1 text-xs font-semibold text-brand-green">Vagas limitadas</span>
                </div>
              )}
            </div>

            {/* Form */}
            <div className="glow-border rounded-2xl">
              <div className="glass rounded-2xl p-6 sm:p-8">
                <h2 className="font-display text-xl font-bold text-white">Garanta sua vaga</h2>
                <p className="mt-1 text-sm text-slate-400">Preencha e a gente cuida do resto.</p>
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
