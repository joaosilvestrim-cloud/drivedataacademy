"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";

import { useState } from "react";
import { createWorkshopOrder, type BuyResult } from "./actions";

const field = "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";

export default function WorkshopBuyForm({ eventId, title }: { eventId: string; title: string }) {
  const tr = usarTraducao();
  const [result, setResult] = useState<BuyResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const res = await createWorkshopOrder(new FormData(e.currentTarget));
    setResult(res);
    setLoading(false);
    if (res.ok && res.mode === "asaas") window.location.href = res.url;
  }

  if (result?.ok && result.mode === "manual") {
    const digits = (result.whatsapp || "").replace(/\D/g, "");
    const msg = encodeURIComponent(`Olá! Quero comprar a vaga no workshop "${title}".`);
    return (
      <div className="rounded-2xl border border-brand-green/30 bg-brand-green/10 p-6 text-center">
        <p className="text-lg font-semibold text-white">{tr("Recebemos seu pedido!")}</p>
        <p className="mt-2 text-sm text-slate-300">{tr("Fale com a gente pelo WhatsApp pra finalizar. O link do workshop chega por e-mail após o pagamento.")}</p>
        {digits && <a href={`https://wa.me/${digits}?text=${msg}`} target="_blank" rel="noreferrer" className="mt-5 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900">{tr("Falar no WhatsApp")}</a>}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input name="event_id" type="hidden" value={eventId} />
      <input name="name" required placeholder={tr("Seu nome completo")} className={field} />
      <input name="email" type="email" required placeholder={tr("Seu e-mail")} className={field} />
      <input name="phone" placeholder={tr("WhatsApp com DDD")} className={field} />
      <input name="cpf" inputMode="numeric" placeholder={tr("CPF (para o pagamento)")} className={field} />
      {result && !result.ok && <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">{result.error}</p>}
      <button disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02] disabled:opacity-60">
        {loading ? tr("Gerando pagamento...") : "Garantir minha vaga"}
      </button>
      <p className="text-center text-xs text-slate-500">{tr("Pagamento único (Pix ou cartão). O link do workshop chega por e-mail após a confirmação.")}</p>
    </form>
  );
}
