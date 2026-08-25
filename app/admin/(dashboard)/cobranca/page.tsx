import { createAdminClient } from "@/lib/supabase/admin";
import AdminError from "../AdminError";
import { createProduct, saveProduct, deleteProduct } from "./actions";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";
const flabel = "block text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500";

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

  const methodChecks = (methods: string, prefix = "") => {
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
      <p className="mt-1 text-sm text-slate-400">Você controla os preços e as formas de pagamento aqui — nada é configurado direto no Asaas. O <span className="text-slate-200">primeiro modelo de "Acesso full" ativo</span> é o que vale na página de matrícula.</p>

      {searchParams?.ok && <div className="mt-4 rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm text-brand-green">{searchParams.ok}</div>}

      <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${asaasOn ? "border-brand-green/30 bg-brand-green/10 text-brand-green" : "border-amber-400/30 bg-amber-400/10 text-amber-200"}`}>
        {asaasOn ? "Asaas ligado — os modelos abaixo geram cobrança automática." : "Asaas ainda não ligado — configure os modelos agora; o checkout automático entra quando a chave do Asaas for adicionada."}
      </div>

      {/* Novo modelo */}
      <form action={createProduct} className="mt-6 grid gap-3 rounded-2xl border border-dashed border-white/10 p-4 sm:grid-cols-[1fr_140px_160px_140px_auto]">
        <input name="name" required placeholder="Nome (ex.: Acesso Full - Turma Set)" className={field} />
        <input name="price" placeholder="Preço (R$)" className={field} />
        <select name="kind" defaultValue="full_access" className={`${field} [&>option]:bg-ink-900`}>
          <option value="full_access">Acesso full</option>
          <option value="course">Curso avulso</option>
        </select>
        <input name="access_days" type="number" placeholder="Dias acesso" className={field} />
        <button className="rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2 text-sm font-semibold text-ink-900">+ Criar</button>
      </form>

      {/* Lista */}
      <div className="mt-6 space-y-3">
        {products.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 px-4 py-12 text-center text-slate-500">Nenhum modelo de pagamento ainda.</p>}
        {products.map((p) => (
          <details key={p.id} className="glass rounded-2xl border border-white/8 p-5">
            <summary className="flex cursor-pointer items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                {!p.active && <span className="rounded-full bg-white/5 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-slate-400">inativo</span>}
                <span className="font-medium text-white">{p.name}</span>
                <span className="text-xs text-slate-400">{p.kind === "course" ? "Curso" : "Acesso full"}</span>
              </span>
              <span className="text-sm font-semibold text-brand-green">R$ {Number(p.price).toFixed(2)}</span>
            </summary>
            <form action={saveProduct} className="mt-4 grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={p.id} />
              <div className="space-y-1.5 sm:col-span-2"><label className={flabel}>Nome</label><input name="name" defaultValue={p.name} className={field} /></div>
              <div className="space-y-1.5 sm:col-span-2"><label className={flabel}>Descrição</label><input name="description" defaultValue={p.description ?? ""} className={field} /></div>
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
              <label className="flex items-center gap-2 text-sm text-slate-300 sm:col-span-2"><input type="checkbox" name="active" defaultChecked={p.active} className="h-4 w-4 accent-emerald-400" /> Ativo</label>
              <div className="flex items-center gap-2 sm:col-span-2">
                <button className="rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2 text-xs font-semibold text-ink-900">Salvar</button>
                <button formAction={deleteProduct} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 hover:border-red-400/40 hover:text-red-400">Excluir</button>
              </div>
            </form>
          </details>
        ))}
      </div>
    </div>
  );
}
