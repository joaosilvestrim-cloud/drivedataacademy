import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasToolAccess } from "@/lib/tool";
import AssinarForm from "./AssinarForm";

export const dynamic = "force-dynamic";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function AssinarFerramentaPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?next=/ferramenta/assinar");

  const admin = createAdminClient();
  // já assina? vai direto pra ferramenta
  if (await hasToolAccess(admin, user.id, user.email)) redirect("/ferramenta");

  const { data: cfg } = await admin.from("site_settings").select("value").eq("key", "tool_price").maybeSingle();
  const price = Number(cfg?.value || "19.90") || 19.9;

  const beneficios = [
    "Gera cards em HTML e SVG para o Power BI",
    "Medida DAX pronta para copiar, sem escrever código",
    "Dezenas de templates e componentes",
    "Salve seus visuais e reaproveite",
  ];

  return (
    <main className="relative min-h-screen bg-ink-900 px-6 py-16">
      <div className="mx-auto grid max-w-4xl items-start gap-10 lg:grid-cols-2">
        <div>
          <Link href="/conta" className="text-sm text-slate-400 hover:text-white">← Voltar ao portal</Link>
          <p className="mt-4 text-sm font-medium uppercase tracking-wide text-brand-green">Ferramenta de Visuais</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-white">Crie visuais de Power BI sem código</h1>
          <p className="mt-4 text-lg text-slate-300">Monte cards em HTML/SVG e leve a medida DAX pronta pro seu relatório.</p>
          <ul className="mt-8 space-y-3">
            {beneficios.map((b) => (
              <li key={b} className="flex items-start gap-3 text-slate-200">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-brand-green"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {b}
              </li>
            ))}
          </ul>
        </div>

        <div className="glow-border rounded-2xl">
          <div className="glass rounded-2xl p-6 sm:p-8">
            <div className="flex items-end gap-2">
              <span className="font-display text-4xl font-bold text-white">{brl(price)}</span>
              <span className="pb-1 text-sm text-slate-400">/mês</span>
            </div>
            <p className="mt-1 text-sm text-slate-400">Assinatura mensal, cancele quando quiser.</p>
            <div className="mt-6">
              <AssinarForm />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
