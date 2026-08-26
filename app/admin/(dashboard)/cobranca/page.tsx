import { createAdminClient } from "@/lib/supabase/admin";
import AdminError from "../AdminError";
import ProductForm from "./ProductForm";

export const dynamic = "force-dynamic";

const METHOD_META: Record<string, string> = { pix: "PIX", card: "Cartão", boleto: "Boleto" };
const KIND_LABEL: Record<string, string> = { full_access: "Acesso Full", bundle: "Pacote", course: "Curso avulso" };

export default async function CobrancaPage({ searchParams }: { searchParams: { ok?: string } }) {
  let products: any[] = [], courses: any[] = [];
  const asaasOn = !!process.env.ASAAS_API_KEY;
  try {
    const admin = createAdminClient();
    const [{ data: p, error }, { data: c }] = await Promise.all([
      admin.from("payment_products").select("*").order("position").order("created_at"),
      admin.from("courses").select("id, title").order("title"),
    ]);
    if (error) throw new Error(error.message);
    products = p ?? []; courses = c ?? [];
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Cobrança</h1>
        <div className="mt-6"><AdminError message={(e instanceof Error ? e.message : "Erro.") + " — rode o SQL de cobrança/course_ids no Supabase."} /></div>
      </div>
    );
  }

  const titleById: Record<string, string> = {};
  for (const c of courses) titleById[c.id] = c.title;
  const inUseId = products.find((p) => p.active && p.kind === "full_access")?.id;

  function coursesSummary(p: any): string {
    if (p.kind === "full_access") return "Todos os cursos";
    if (p.kind === "course") return titleById[p.course_id] || "—";
    const ids = (p.course_ids || "").split(",").filter(Boolean);
    return ids.length ? ids.map((i: string) => titleById[i] || "?").join(", ") : "Nenhum curso selecionado";
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Cobrança</h1>
      <p className="mt-1 text-sm text-slate-400">Aqui você define <span className="text-slate-200">o que vende e por quanto</span>. O Asaas só processa o pagamento.</p>

      {searchParams?.ok && <div className="mt-4 rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm text-brand-green">{searchParams.ok}</div>}

      {/* Explicação dos tipos */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { t: "Curso avulso", d: "Vende 1 treinamento específico. O aluno é matriculado só nele." },
          { t: "Pacote", d: "Você escolhe quais treinamentos entram. O aluno é matriculado nos escolhidos." },
          { t: "Acesso Full", d: "Libera todos os treinamentos (inclusive futuros). É o usado na página de matrícula." },
        ].map((x) => (
          <div key={x.t} className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <p className="text-sm font-semibold text-white">{x.t}</p>
            <p className="mt-1 text-xs leading-snug text-slate-400">{x.d}</p>
          </div>
        ))}
      </div>

      <div className={`mt-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${asaasOn ? "border-brand-green/30 bg-brand-green/10 text-brand-green" : "border-amber-400/30 bg-amber-400/10 text-amber-200"}`}>
        <span className={`h-2 w-2 rounded-full ${asaasOn ? "bg-brand-green" : "bg-amber-400"}`} />
        {asaasOn ? "Asaas conectado — os produtos geram cobrança automática." : "Asaas não conectado — o checkout automático entra quando a chave for adicionada."}
      </div>

      {/* Novo produto */}
      <details className="mt-6 glass rounded-2xl border border-dashed border-white/12 p-5" open={products.length === 0}>
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-white">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-brand-green to-brand-blue text-ink-900">+</span>
          Novo produto de venda
        </summary>
        <div className="mt-4">
          <ProductForm courses={courses} />
        </div>
      </details>

      {/* Lista */}
      <h2 className="mt-8 font-display text-lg font-bold text-white">Produtos</h2>
      <div className="mt-4 space-y-3">
        {products.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 px-4 py-12 text-center text-slate-500">Nenhum produto ainda. Crie o primeiro acima.</p>}
        {products.map((p) => (
          <details key={p.id} className={`glass overflow-hidden rounded-2xl border ${p.id === inUseId ? "border-brand-green/30" : "border-white/8"}`}>
            <summary className="flex cursor-pointer flex-wrap items-center gap-3 p-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-base font-bold text-white">{p.name}</span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-slate-400">{KIND_LABEL[p.kind] || p.kind}</span>
                  {!p.active && <span className="rounded-full bg-white/5 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-slate-400">inativo</span>}
                  {p.id === inUseId && <span className="rounded-full bg-brand-green/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-brand-green">em uso na matrícula</span>}
                </div>
                <p className="mt-1.5 truncate text-xs text-slate-500">Inclui: {coursesSummary(p)} · {(p.methods || "").split(",").map((m: string) => METHOD_META[m]).filter(Boolean).join(" / ")}{p.max_installments > 1 ? ` · até ${p.max_installments}x` : ""}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl font-bold text-white">R$ {Number(p.price).toFixed(2)}</p>
              </div>
            </summary>
            <div className="border-t border-white/8 p-5">
              <ProductForm product={p} courses={courses} />
            </div>
          </details>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-xs text-slate-400">
        <span className="text-slate-300">Como isso se conecta:</span> a página <b className="text-slate-200">/matrícula</b> vende o produto <b className="text-slate-200">Acesso Full</b> ativo. Em <b className="text-slate-200">Turmas</b> você libera acesso em lote escolhendo qualquer produto (Full, Pacote ou Avulso). Parcelas do cartão: o limite real é um ajuste único na conta Asaas.
      </div>
    </div>
  );
}
