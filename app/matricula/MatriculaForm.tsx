"use client";

import { useState } from "react";
import { createMatricula, type MatriculaResult } from "./actions";

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";

export default function MatriculaForm({ turmaNome }: { turmaNome: string }) {
  const [result, setResult] = useState<MatriculaResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");

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
      {result && !result.ok && (
        <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">{result.error}</p>
      )}
      <button
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02] disabled:opacity-60"
      >
        {loading ? "Enviando..." : "Quero garantir minha vaga"}
      </button>
      <p className="text-center text-xs text-slate-500">Sem cobrança automática agora. Você confirma o pagamento com a nossa equipe.</p>
    </form>
  );
}
