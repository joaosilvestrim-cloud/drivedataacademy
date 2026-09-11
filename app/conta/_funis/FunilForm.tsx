"use client";

import { useMemo, useState } from "react";
import { submitRepRequest } from "../representacao/actions";
import type { Form } from "./definicoes";

/* Um funil, um formulário.

   Saiu de dentro do RepClient quando Mentoria e Marketplace ganharam rota
   própria. O markup é o mesmo de antes, incluindo o simulador do Portal, que
   continua aparecendo só no funil "portal". */

const field = "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function FunilForm({ form, cabecalho = true }: { form: Form; cabecalho?: boolean }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (name: string, v: string) => setValues((s) => ({ ...s, [name]: v }));

  // simulador do portal
  const sim = useMemo(() => {
    const c = Number(values.clientes || 0);
    const m = Number(values.mensalidade || 0);
    const receita = c * m;
    return { receita, recorrencia: Math.round(receita * 0.3) }; // exemplo 30%
  }, [values.clientes, values.mensalidade]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await submitRepRequest(form.key, JSON.stringify(values));
    setLoading(false);
    if (res.ok) { setSent(true); setValues({}); }
  }

  return (
    <div className="glass rounded-3xl border border-white/8 p-6 sm:p-8">
      {cabecalho && (
        <>
          <h2 className="font-display text-xl font-bold text-white">{form.title}</h2>
          <p className="mt-1 text-sm text-slate-400">{form.desc}</p>
        </>
      )}

      {sent ? (
        <div className={`${cabecalho ? "mt-6" : ""} rounded-2xl border border-brand-green/30 bg-brand-green/10 p-6 text-center`}>
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-green/20 text-brand-green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <p className="text-lg font-semibold text-white">Recebemos! 🎉</p>
          <p className="mt-1 text-sm text-slate-300">Nosso time vai analisar e entrar em contato. Você pode enviar outra solicitação quando quiser.</p>
          <button onClick={() => setSent(false)} className="mt-4 rounded-xl border border-white/10 px-5 py-2 text-sm text-slate-300 hover:border-white/30 hover:text-white">Enviar outra</button>
        </div>
      ) : (
        <form onSubmit={submit} className={`${cabecalho ? "mt-6" : ""} space-y-4`}>
          {form.fields.map((f) => {
            const id = `${form.key}-${f.name}`;
            return (
              <div key={f.name} className="space-y-1.5">
                <label htmlFor={id} className="block text-sm font-medium text-slate-300">{f.label}</label>
                {f.type === "textarea" ? (
                  <textarea id={id} value={values[f.name] || ""} onChange={(e) => set(f.name, e.target.value)} rows={3} placeholder={f.ph} className={`${field} resize-y`} />
                ) : f.type === "select" ? (
                  <select id={id} value={values[f.name] || ""} onChange={(e) => set(f.name, e.target.value)} required className={`${field} [&>option]:bg-ink-900`}>
                    <option value="">Selecione...</option>
                    {f.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input id={id} type={f.type} inputMode={f.type === "number" ? "numeric" : undefined} value={values[f.name] || ""} onChange={(e) => set(f.name, e.target.value)} placeholder={f.ph} className={field} />
                )}
              </div>
            );
          })}

          {form.key === "portal" && Number(values.clientes) > 0 && Number(values.mensalidade) > 0 && (
            <div className="rounded-2xl border border-brand-blue/25 bg-brand-blue/[0.06] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal">Simulação</p>
              <div className="mt-2 flex flex-wrap gap-6">
                <div><p className="text-xs text-slate-400">Receita mensal dos clientes</p><p className="font-display text-xl font-bold text-white">{brl(sim.receita)}</p></div>
                <div><p className="text-xs text-slate-400">Sua recorrência (exemplo)</p><p className="font-display text-xl font-bold text-brand-green">{brl(sim.recorrencia)}/mês</p></div>
              </div>
              <p className="mt-2 text-[0.7rem] text-slate-500">Exemplo ilustrativo. Os percentuais reais são combinados na parceria.</p>
            </div>
          )}

          <button disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.01] disabled:opacity-60 sm:w-auto sm:px-10">
            {loading ? "Enviando..." : form.cta}
          </button>
        </form>
      )}
    </div>
  );
}
