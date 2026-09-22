"use client";

import { useState } from "react";
import { usarTraducao } from "@/lib/i18n/usarTraducao";
import { cancelarAssinatura } from "./actions";
import { MOTIVOS } from "@/lib/assinatura-motivos";

/* Formulário de cancelamento.

   Fica fechado por padrão. Não é pegadinha de retenção: é que ninguém abre a
   tela da assinatura querendo cancelar, e um formulário de saída aberto no
   meio da página sugere que cancelar é o caminho.

   O motivo é obrigatório e o texto livre também, quando a pessoa marca
   "outro". Fora isso o texto é opcional: obrigar a escrever para conseguir
   sair é o tipo de atrito que vira reclamação, não retenção. */
export default function CancelarForm({
  acessoAte,
  recorrente,
}: {
  acessoAte: string | null;
  recorrente: boolean;
}) {
  const tr = usarTraducao();
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  const ate = acessoAte
    ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(acessoAte))
    : null;

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-sm text-slate-500 underline decoration-slate-700 underline-offset-4 transition-colors hover:text-slate-300"
      >
        {tr("Quero cancelar minha assinatura")}
      </button>
    );
  }

  return (
    <form
      action={(fd) => { setEnviando(true); return cancelarAssinatura(fd); }}
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6"
    >
      <h2 className="font-display text-lg font-bold text-white">{tr("Cancelar a assinatura")}</h2>

      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        {recorrente
          ? tr("A cobrança no cartão para hoje. Nenhuma nova mensalidade é lançada.")
          : tr("Seu plano é de cobrança única, então não existe mensalidade para interromper.")}{" "}
        {ate
          ? tr("Seu acesso continua até") + ` ${ate}. ` + tr("Você já pagou por esse período e ele é seu.")
          : tr("Seu acesso continua até o fim do período que você já pagou.")}
      </p>

      <fieldset className="mt-5">
        <legend className="text-sm font-medium text-white">{tr("O que te fez decidir isso?")}</legend>
        <p className="mt-1 text-xs text-slate-500">{tr("Ninguém responde por você. Isso vai direto para quem cuida da Academy.")}</p>
        <div className="mt-3 space-y-1">
          {MOTIVOS.map((m) => (
            <label
              key={m.id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                motivo === m.id ? "bg-white/[0.07] text-white" : "text-slate-300 hover:bg-white/[0.04]"
              }`}
            >
              <input
                type="radio"
                name="motivo"
                value={m.id}
                checked={motivo === m.id}
                onChange={() => setMotivo(m.id)}
                className="h-4 w-4 shrink-0 accent-brand-green"
                required
              />
              {tr(m.label)}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-white">
          {motivo === "outro" ? tr("Conte o que aconteceu") : tr("Quer contar mais? (opcional)")}
        </span>
        <textarea
          name="detalhe"
          rows={3}
          required={motivo === "outro"}
          placeholder={tr("O que faltou para a Academy valer a pena para você?")}
          className="mt-2 w-full rounded-xl border border-white/10 bg-ink-900 px-3.5 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-brand-green/50 focus:outline-none"
        />
      </label>

      <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-slate-300">
        <input type="checkbox" name="confirma" value="sim" required className="mt-0.5 h-4 w-4 shrink-0 accent-brand-green" />
        <span>
          {ate
            ? tr("Entendi que não serei cobrado de novo e que meu acesso vai até") + ` ${ate}.`
            : tr("Entendi que não serei cobrado de novo.")}
        </span>
      </label>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-xl border border-red-400/30 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
        >
          {enviando ? tr("Cancelando...") : tr("Confirmar cancelamento")}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900"
        >
          {tr("Continuar assinante")}
        </button>
      </div>
    </form>
  );
}
