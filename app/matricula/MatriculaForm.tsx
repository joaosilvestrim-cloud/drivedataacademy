"use client";

import { useState } from "react";
import { createMatricula, type MatriculaResult } from "./actions";

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function MatriculaForm({
  turmaNome = "DriveData Academy",
  mensal = 0,
  anual = 0,
  desconto = 0,
}: {
  turmaNome?: string;
  mensal?: number;
  anual?: number;
  desconto?: number;
}) {
  const [result, setResult] = useState<MatriculaResult | null>(null);
  // Sem anual configurado a escolha nem aparece e tudo segue como mensal.
  const [plano, setPlano] = useState<"mensal" | "anual">(anual > 0 ? "anual" : "mensal");
  // Anual aceita só Pix ou cartão. Boleto ficou de fora de propósito.
  const [forma, setForma] = useState<"pix" | "cartao">("pix");
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
      <input type="hidden" name="plano" value={plano} />
      <input type="hidden" name="forma" value={forma} />
      {anual > 0 && (
        <fieldset className="grid grid-cols-2 gap-3">
          <legend className="sr-only">Escolha o plano</legend>
          {([
            { k: "anual" as const, titulo: "Anual", valor: brl(anual), nota: `${desconto}% OFF · pagamento único` },
            { k: "mensal" as const, titulo: "Mensal", valor: `${brl(mensal)}/mês`, nota: "no cartão · cancele quando quiser" },
          ]).map((p) => {
            const ativo = plano === p.k;
            return (
              <label
                key={p.k}
                className={`relative cursor-pointer rounded-xl border px-3 py-3 transition-colors ${ativo ? "border-brand-green/60 bg-brand-green/10" : "border-white/10 bg-white/[0.03] hover:border-white/25"}`}
              >
                <input type="radio" name="plano_ui" value={p.k} checked={ativo} onChange={() => setPlano(p.k)} className="sr-only" />
                {p.k === "anual" && (
                  <span className="absolute -top-2.5 right-2 rounded-full bg-gradient-to-r from-brand-green to-brand-blue px-2 py-0.5 text-[0.6rem] font-bold uppercase text-ink-900">Mais vantajoso</span>
                )}
                <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{p.titulo}</span>
                <span className="block font-display text-lg font-bold text-white">{p.valor}</span>
                <span className="block text-[0.7rem] text-brand-teal">{p.nota}</span>
              </label>
            );
          })}
        </fieldset>
      )}
      {plano === "anual" && (
        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">Forma de pagamento</legend>
          {([
            { k: "pix" as const, rotulo: "Pix", nota: "confirma na hora" },
            { k: "cartao" as const, rotulo: "Cartão de crédito", nota: "à vista" },
          ]).map((f) => {
            const ativo = forma === f.k;
            return (
              <label
                key={f.k}
                className={`cursor-pointer rounded-xl border px-4 py-2 text-sm transition-colors ${ativo ? "border-brand-green/60 bg-brand-green/10 text-white" : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25"}`}
              >
                <input type="radio" name="forma_ui" value={f.k} checked={ativo} onChange={() => setForma(f.k)} className="sr-only" />
                <span className="font-semibold">{f.rotulo}</span> <span className="text-xs text-slate-400">· {f.nota}</span>
              </label>
            );
          })}
        </fieldset>
      )}
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
        {loading ? "Gerando pagamento..." : plano === "anual" ? `Pagar ${brl(anual)} e liberar 12 meses` : "Assinar no cartão"}
      </button>
      <p className="text-center text-xs text-slate-500">
        {plano === "anual"
          ? `Pagamento único no ${forma === "pix" ? "Pix" : "cartão de crédito"}, com 12 meses de acesso. Sua conta é criada após a confirmação do pagamento.`
          : "Assinatura mensal no cartão de crédito. Sua conta é criada após a confirmação do pagamento. Cancele quando quiser."}
      </p>
    </form>
  );
}
