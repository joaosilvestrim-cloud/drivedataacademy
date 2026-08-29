"use client";

import { useState } from "react";
import { createMatricula, type MatriculaResult } from "./actions";

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function MatriculaForm({
  turmaNome,
  price = 0,
  pixPrice = 0,
  maxInst = 1,
  allowsPix = true,
  allowsCard = true,
}: {
  turmaNome: string;
  price?: number;
  pixPrice?: number;
  maxInst?: number;
  allowsPix?: boolean;
  allowsCard?: boolean;
}) {
  const [result, setResult] = useState<MatriculaResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<"pix" | "card">(allowsCard ? "card" : "pix");

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
    const msg = encodeURIComponent(`Olá! Quero garantir minha vaga na ${turmaNome} da DriveData Academy.`);
    return (
      <div className="rounded-2xl border border-brand-green/30 bg-brand-green/10 p-6 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-green/20 text-2xl">✓</div>
        <p className="text-lg font-semibold text-white">Recebemos sua inscrição!</p>
        <p className="mt-2 text-sm text-slate-300">
          Para garantir a vaga, fale com a gente pelo WhatsApp e finalize o pagamento. Assim que confirmarmos, seu acesso é liberado.
        </p>
        {digits ? (
          <a
            href={`https://wa.me/${digits}?text=${msg}`}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]"
          >
            Falar no WhatsApp
          </a>
        ) : (
          <p className="mt-4 text-sm text-slate-400">Em breve entraremos em contato pelo e-mail informado.</p>
        )}
      </div>
    );
  }

  const cardParcela = maxInst > 1 && price > 0 ? price / maxInst : 0;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input name="name" required placeholder="Seu nome completo" className={field} />
      <input name="email" type="email" required placeholder="Seu melhor e-mail" className={field} />
      <input
        name="phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="WhatsApp com DDD"
        className={field}
      />
      <input name="cpf" inputMode="numeric" placeholder="CPF (para emitir o pagamento)" className={field} />

      {/* Endereço */}
      <div className="grid grid-cols-3 gap-3">
        <input name="cep" inputMode="numeric" placeholder="CEP" className={field} />
        <input name="endereco" placeholder="Endereço" className={`${field} col-span-2`} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <input name="numero" placeholder="Número" className={field} />
        <input name="bairro" placeholder="Bairro" className={`${field} col-span-2`} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <input name="cidade" placeholder="Cidade" className={`${field} col-span-2`} />
        <input name="uf" placeholder="UF" maxLength={2} className={`${field} uppercase`} />
      </div>

      {/* Forma de pagamento */}
      {price > 0 && (allowsPix || allowsCard) && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Forma de pagamento</p>
          <input type="hidden" name="method" value={method} />
          <div className="grid gap-2 sm:grid-cols-2">
            {allowsCard && (
              <button
                type="button"
                onClick={() => setMethod("card")}
                className={`rounded-xl border p-3 text-left transition-colors ${method === "card" ? "border-brand-green/60 bg-brand-green/10" : "border-white/10 bg-white/5 hover:border-white/25"}`}
              >
                <span className="block text-sm font-semibold text-white">Cartão de crédito</span>
                <span className="block text-xs text-slate-400">{brl(price)}{maxInst > 1 ? ` · até ${maxInst}x de ${brl(cardParcela)}` : ""}</span>
              </button>
            )}
            {allowsPix && (
              <button
                type="button"
                onClick={() => setMethod("pix")}
                className={`rounded-xl border p-3 text-left transition-colors ${method === "pix" ? "border-brand-green/60 bg-brand-green/10" : "border-white/10 bg-white/5 hover:border-white/25"}`}
              >
                <span className="block text-sm font-semibold text-white">Pix à vista</span>
                <span className="block text-xs text-brand-teal">{brl(pixPrice)} <span className="text-slate-500">com desconto</span></span>
              </button>
            )}
          </div>
        </div>
      )}

      {result && !result.ok && (
        <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">{result.error}</p>
      )}
      <button
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02] disabled:opacity-60"
      >
        {loading ? "Enviando..." : method === "pix" ? "Pagar com Pix" : "Ir para o pagamento"}
      </button>
      <p className="text-center text-xs text-slate-500">O acesso é liberado assim que o pagamento é confirmado.</p>
    </form>
  );
}
