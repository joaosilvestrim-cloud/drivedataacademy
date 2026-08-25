import { createAdminClient } from "@/lib/supabase/admin";
import AdminError from "../AdminError";
import { createProduct, saveProduct, deleteProduct } from "./actions";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";
const flabel = "block text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500";

const METHOD_META: Record<string, { label: string; d: string }> = {
  pix: { label: "PIX", d: "M12 2l4 4-4 4-4-4 4-4zM2 12l4-4 4 4-4 4-4-4zM22 12l-4-4-4 4 4 4 4-4zM12 14l4 4-4 4-4-4 4-4z" },
  card: { label: "Cartão", d: "M2 7h20v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7zM2 10h20" },
  boleto: { label: "Boleto", d: "M4 5v14M8 5v14M11 5v14M14 5v14M18 5v14M21 5v14" },
};

function MethodBadges({ methods }: { methods: string }) {
  const set = (methods || "").split(",").map((s) => s.trim()).filter(Boolean);
  return (
    <div className="flex flex-wrap gap-1.5">
      {set.map((m) => {
        const meta = METHOD_META[m];
        if (!meta) return null;
        return (
          <span key={m} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.65rem] font-medium text-slate-300">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d={meta.d} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}

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
        <div className="mt-6"><AdminError message={(e instanceof Error ? e.message : "Erro.") + " — rode o SQL de cobrança no Supabase."} /></div>
      </div>
    );
  }

  // Modelo em uso na matrícula: primeiro "acesso full" ativo
  const inUseId = products.find((p) => p.active && p.kind === "full_access")?.id;

  const methodChecks = (methods: string) => {
    const set = new Set((methods || "").split(","));
    return (
      <div className="flex flex-wrap gap-4 text-xs text-slate-300">
        <label className="flex items-center gap-1.5"><input type="checkbox" name="m_pix" defaultChecked={set.has("pix")} className="h-4 w-4 accent-emerald-400" /> PIX</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" name="m_card" defaultChecked={set.has("card")} className="h-4 w-4 accent-emerald-400" /> Cartão</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" name="m_boleto" defaultChecked={set.has("boleto")} className="h-4 w-4 accent-emerald-400" /> Boleto</label>
      </div>
    );
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Cobrança</h1>
      <p className="mt-1 text-sm text-slate-400">Preços e formas de pagamento ficam aqui — nada é configurado direto no Asaas. O Asaas só processa.</p>

      {searchParams?.ok && <div className="mt-4 rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm text-brand-green">{searchParams.ok}</div>}

      <div className={`mt-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${asaasOn ? "border-brand-green/30 bg-brand-green/10 text-brand-green" : "border-amber-400/30 bg-amber-400/10 text-amber-200"}`}>
        <span className={`h-2 w-2 rounded-full ${asaasOn ? "bg-brand-green" : "bg-amber-400"}`} />
        {asaasOn ? "Asaas conectado — os modelos geram cobrança automática na matrícula." : "Asaas ainda não conectado — o checkout automático entra quando a chave for adicionada."}
      </div>

      {/* Novo modelo */}
      <div className="mt-6 rounded-2xl border border-dashed border-white/12 p-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-brand-green to-brand-blue text-ink-900">+</span>
          Novo modelo de pagamento
        </p>
        <form action={createProduct} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2"><label className={flabel}>Nome</label><input name="name" required placeholder="Ex.: Acesso Full - Turma Setembro" className={field} /></div>
          <div className="space-y-1.5"><label className={flabel}>Preço (R$)</label><input name="price" placeholder="1600" className={field} /></div>
          <div className="space-y-1.5"><label className={flabel}>Tipo</label>
            <select name="kind" defaultValue="full_access" className={`${field} [&>option]:bg-ink-900`}><option value="full_access">Acesso full</option><option value="course">Curso avulso</option></select>
          </div>
          <div className="space-y-1.5"><label className={flabel}>Dias de acesso</label><input name="access_days" type="number" placeholder="365" className={field} /></div>
          <div className="space-y-1.5"><label className={flabel}>Máx. parcelas (cartão)</label><input name="max_installments" type="number" placeholder="12" className={field} /></div>
          <div className="flex items-end sm:col-span-2"><button className="rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2 text-sm font-semibold text-ink-900">Criar modelo</button></div>
        </form>
      </div>

      {/* Lista */}
      <h2 className="mt-8 font-display text-lg font-bold text-white">Modelos</h2>
      <div className="mt-4 space-y-3">
        {products.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-green to-brand-blue text-ink-900"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M2 7h20v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7zM2 10h20M6 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
            <p className="font-medium text-white">Nenhum modelo de pagamento ainda.</p>
            <p className="mt-1 text-sm text-slate-400">Crie o primeiro acima (ex.: Acesso Full).</p>
          </div>
        )}
        {products.map((p) => (
          <details key={p.id} className={`glass overflow-hidden rounded-2xl border ${p.id === inUseId ? "border-brand-green/30" : "border-white/8"}`}>
            <summary className="flex cursor-pointer flex-wrap items-center gap-3 p-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-base font-bold text-white">{p.name}</span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-slate-400">{p.kind === "course" ? "Curso" : "Acesso full"}</span>
                  {!p.active && <span className="rounded-full bg-white/5 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-slate-400">inativo</span>}
                  {p.id === inUseId && <span className="rounded-full bg-brand-green/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-brand-green">em uso na matrícula</span>}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <MethodBadges methods={p.methods} />
                  {p.max_installments > 1 && <span className="text-xs text-slate-500">até {p.max_installments}x</span>}
                  {p.access_days && <span className="text-xs text-slate-500">{p.access_days} dias de acesso</span>}
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl font-bold text-white">R$ {Number(p.price).toFixed(2)}</p>
                {p.max_installments > 1 && <p className="text-[0.7rem] text-brand-teal">ou {p.max_installments}x de R$ {(Number(p.price) / p.max_installments).toFixed(2)}</p>}
              </div>
            </summary>

            <form action={saveProduct} className="grid gap-4 border-t border-white/8 p-5 sm:grid-cols-2">
              <input type="hidden" name="id" value={p.id} />
              <div className="space-y-1.5 sm:col-span-2"><label className={flabel}>Nome</label><input name="name" defaultValue={p.name} className={field} /></div>
              <div className="space-y-1.5 sm:col-span-2"><label className={flabel}>Descrição (aparece na matrícula)</label><input name="description" defaultValue={p.description ?? ""} className={field} /></div>
              <div className="space-y-1.5"><label className={flabel}>Preço (R$)</label><input name="price" defaultValue={p.price} className={field} /></div>
              <div className="space-y-1.5"><label className={flabel}>Tipo</label>
                <select name="kind" defaultValue={p.kind} className={`${field} [&>option]:bg-ink-900`}><option value="full_access">Acesso full</option><option value="course">Curso avulso</option></select>
              </div>
              <div className="space-y-1.5"><label className={flabel}>Curso (se avulso)</label>
                <select name="course_id" defaultValue={p.course_id ?? ""} className={`${field} [&>option]:bg-ink-900`}>
                  <option value="">—</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div className="space-y-1.5"><label className={flabel}>Dias de acesso (full)</label><input name="access_days" type="number" defaultValue={p.access_days ?? ""} className={field} /></div>
              <div className="space-y-1.5"><label className={flabel}>Máx. parcelas (cartão)</label><input name="max_installments" type="number" defaultValue={p.max_installments} className={field} /></div>
              <div className="space-y-1.5"><label className={flabel}>Formas de pagamento</label>{methodChecks(p.methods)}</div>
              <label className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5 text-sm text-slate-200 sm:col-span-2"><input type="checkbox" name="active" defaultChecked={p.active} className="h-4 w-4 accent-emerald-400" /> Modelo ativo</label>
              <div className="flex items-center gap-2 border-t border-white/8 pt-3 sm:col-span-2">
                <button className="rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2 text-xs font-semibold text-ink-900">Salvar</button>
                <button formAction={deleteProduct} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 hover:border-red-400/40 hover:text-red-400">Excluir</button>
              </div>
            </form>
          </details>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-xs text-slate-400">
        <span className="text-slate-300">Parcelas do cartão:</span> o número aqui aparece na matrícula ("em até Nx") e o aluno escolhe na hora de pagar. O limite real é um ajuste único na conta Asaas (Configurações → Parcelamento) — deixe igual a este número.
      </div>
    </div>
  );
}
