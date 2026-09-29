"use client";

import { useState } from "react";
import { escreverRecomendacao } from "./actions";

const campo =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60";

export default function EscreverRecomendacao({ token, primeiroNome }: { token: string; primeiroNome: string }) {
  const [d, setD] = useState({ nome: "", cargo: "", relacao: "", email: "", texto: "" });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [feito, setFeito] = useState(false);
  const muda = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setD((x) => ({ ...x, [k]: e.target.value }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro("");
    const r = await escreverRecomendacao(token, d);
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    setFeito(true);
  }

  if (feito) {
    return (
      <div className="mt-8 rounded-2xl border border-brand-green/30 bg-brand-green/[0.06] p-5">
        <p className="font-semibold text-white">Falta um passo: confirme seu e-mail.</p>
        <p className="mt-1 text-sm text-slate-300">Mandamos um link para {d.email}. Depois da confirmação, a recomendação vai para {primeiroNome} aprovar.</p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="mt-8 flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-slate-300">Seu nome<input required value={d.nome} onChange={muda("nome")} className={`${campo} mt-1`} /></label>
        <label className="text-sm text-slate-300">Seu cargo<input value={d.cargo} onChange={muda("cargo")} placeholder="Ex: Gerente de Operações" className={`${campo} mt-1`} /></label>
      </div>
      <label className="text-sm text-slate-300">Como vocês trabalharam juntos<input value={d.relacao} onChange={muda("relacao")} placeholder={`Ex: fui gestor de ${primeiroNome} por dois anos`} className={`${campo} mt-1`} /></label>
      <label className="text-sm text-slate-300">
        Seu e-mail
        <input required type="email" value={d.email} onChange={muda("email")} className={`${campo} mt-1`} />
        <span className="mt-1 block text-xs text-slate-500">Não aparece no portfólio. Serve só para confirmar que foi você.</span>
      </label>
      <label className="text-sm text-slate-300">
        Sua recomendação
        <textarea required value={d.texto} onChange={muda("texto")} rows={6} maxLength={1500} placeholder={`O que ${primeiroNome} fez, como foi o trabalho, o que você destacaria.`} className={`${campo} mt-1 resize-y`} />
        <span className="mt-1 block text-right text-xs text-slate-500">{d.texto.length}/1500</span>
      </label>
      {erro && <p className="text-sm text-red-300">{erro}</p>}
      <button disabled={enviando} className="self-start rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900 disabled:opacity-50">
        {enviando ? "Enviando..." : "Enviar recomendação"}
      </button>
    </form>
  );
}
