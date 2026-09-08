"use client";

import { useState } from "react";
import { createMatricula, type MatriculaResult } from "./actions";

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";

export default function MatriculaForm({ turmaNome = "DriveData Academy" }: { turmaNome?: string }) {
  const [result, setResult] = useState<MatriculaResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const res = await createMatricula(new FormData(e.currentTarget));
    setResult(res);
    setLoading(false);
    if (res.ok && res.mode === "asaas") window.location.href = res.url;
  }

  if (result?.ok && result.mode === "manual") {
    const digits = (result.whatsapp || "").replace(/\D/g, "");
    const msg = encodeURIComponent(`Olá! Quero assinar a ${turmaNome}.`);
    return (
      <div className="rounded-2xl border border-brand-green/30 bg-brand-green/10 p-6 text-center">
        <p className="text-lg font-semibold text-white">Recebemos seu pedido!</p>
        <p className="mt-2 text-sm text-slate-300">Fale com a gente pelo WhatsApp pra finalizar a assinatura. Sua conta é criada assim que o pagamento é confirmado.</p>
        {digits && (
          <a href={`https://wa.me/${digits}?text=${msg}`} target="_blank" rel="noreferrer" className="mt-5 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900">Falar no WhatsApp</a>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input name="name" required placeholder="Seu nome completo" className={field} />
      <input name="email" type="email" required placeholder="Seu melhor e-mail" className={field} />
      <input name="phone" placeholder="WhatsApp com DDD" className={field} />
      <input name="cpf" inputMode="numeric" placeholder="CPF (para a assinatura no cartão)" className={field} />

      <div className="grid grid-cols-3 gap-3">
        <input name="cep" inputMode="numeric" placeholder="CEP" className={field} />
        <input name="endereco" placeholder="Endereço" className={`${field} col-span-2`} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <input name="numero" placeholder="Número" className={field} />
        <input name="bairro" placeholder="Bairro" className={`${field} col-span-2`} />
      </div>

      {result && !result.ok && (
        <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">{result.error}</p>
      )}
      <button
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02] disabled:opacity-60"
      >
        {loading ? "Gerando pagamento..." : "Assinar no cartão"}
      </button>
      <p className="text-center text-xs text-slate-500">Assinatura mensal no cartão de crédito. Sua conta é criada após a confirmação do pagamento. Cancele quando quiser.</p>
    </form>
  );
}
