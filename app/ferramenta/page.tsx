import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasToolAccess } from "@/lib/tool";
import EditorClient from "@/components/editor/EditorClient";

export const dynamic = "force-dynamic";

export default async function FerramentaPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?next=/ferramenta");

  const admin = createAdminClient();
  const liberado = await hasToolAccess(admin, user.id, user.email);

  if (!liberado) {
    const { data: cfg } = await admin.from("site_settings").select("value").eq("key", "tool_price").maybeSingle();
    const price = (Number(cfg?.value || "19.90") || 19.9).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    return (
      <main className="grid min-h-screen place-items-center bg-ink-900 px-6">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-green to-brand-blue text-ink-900">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v10H4zM2 19h20M9 9l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Ferramenta de Visuais</h1>
          <p className="mt-2 text-slate-300">Crie cards em HTML/SVG para o Power BI e gere a medida DAX pronta, sem escrever código.</p>
          <p className="mt-3 text-sm text-slate-400">Assinatura mensal de <span className="font-semibold text-white">{price}</span>. Cancele quando quiser.</p>
          <Link href="/ferramenta/assinar" className="mt-6 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">Assinar a ferramenta</Link>
          <Link href="/conta" className="mt-3 block text-sm text-slate-400 hover:text-white">Voltar ao portal</Link>
        </div>
      </main>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Barra superior (52px = 3.25rem, alinha com o h-[calc(100vh-3.25rem)] do editor) */}
      <header className="flex h-[3.25rem] shrink-0 items-center justify-between border-b border-border bg-surface px-4">
        <div className="flex items-center gap-3">
          <Link href="/conta" className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted hover:text-foreground">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Portal
          </Link>
          <span className="font-display text-sm font-bold text-foreground">Ferramenta de <span className="text-viz-dark">Visuais</span></span>
        </div>
        <span className="hidden text-xs text-muted sm:block">Power BI · cards HTML/SVG + DAX</span>
      </header>

      <div className="min-h-0 flex-1">
        <EditorClient inicial={null} auth={{ logado: true, premium: false, admin: false }} />
      </div>
    </div>
  );
}
