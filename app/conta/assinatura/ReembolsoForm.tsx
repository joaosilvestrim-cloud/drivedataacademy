"use client";

import { useState } from "react";
import { usarTraducao } from "@/lib/i18n/usarTraducao";
import { pedirReembolso } from "./actions";
import { MOTIVOS } from "@/lib/assinatura-motivos";

/* Reembolso pelo próprio aluno, dentro de 7 dias úteis da compra.

   O bloco só existe dentro do prazo (lib/assinatura.ts decide). Passou o
   prazo, a tela mostra só o cancelamento, que mantém o acesso até o fim do
   período pago. Aqui é o contrário: o dinheiro volta e o acesso termina na
   hora, e o texto diz isso antes do clique. */
export default function ReembolsoForm({ ate, valor }: { ate: string; valor: string | null }) {
  const tr = usarTraducao();
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const dia = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(new Date(`${ate}T12:00:00Z`));

  return (
    <div className="rounded-[20px] border border-tinta/10 bg-papel p-5 sm:p-6">
      <h2 className="text-lg font-bold tracking-tight text-obsidian">{tr("Reembolso")}</h2>
      <p className="mt-2 text-sm leading-relaxed text-charcoal">
        {tr("Você está dentro do prazo de 7 dias úteis da compra. Pode pedir o reembolso integral até")} <b>{dia}</b>.{" "}
        {tr("Ao pedir, a assinatura é encerrada e o acesso termina na hora.")}
      </p>

      {!aberto ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="mt-4 rounded-full border border-tinta/25 px-5 py-2.5 text-sm font-semibold text-obsidian transition-colors hover:border-tinta/50"
        >
          {tr("Pedir reembolso")}
        </button>
      ) : (
        <form action={(fd) => { setEnviando(true); return pedirReembolso(fd); }} className="mt-5">
          <fieldset>
            <legend className="text-sm font-semibold text-obsidian">{tr("O que te fez decidir isso?")}</legend>
            <div className="mt-3 space-y-1">
              {MOTIVOS.map((m) => (
                <label
                  key={m.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-srf px-3 py-2.5 text-sm transition-colors ${motivo === m.id ? "bg-marca-nevoa text-marca" : "text-charcoal hover:bg-fog"}`}
                >
                  <input type="radio" name="motivo" value={m.id} checked={motivo === m.id} onChange={() => setMotivo(m.id)} className="h-4 w-4 shrink-0" required />
                  {tr(m.label)}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="mt-4 block">
            <span className="text-sm font-semibold text-obsidian">{motivo === "outro" ? tr("Conte o que aconteceu") : tr("Quer contar mais? (opcional)")}</span>
            <textarea
              name="detalhe"
              rows={3}
              required={motivo === "outro"}
              className="mt-2 w-full rounded-srf border border-tinta/20 bg-papel px-3.5 py-3 text-sm text-tinta placeholder:text-slate-500 focus:border-marca focus:outline-none"
            />
          </label>

          <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-charcoal">
            <input type="checkbox" name="confirma" value="sim" required className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {tr("Entendi que vou receber de volta")} {valor ?? tr("o valor pago")}{" "}
              {tr("pelo mesmo meio de pagamento e que meu acesso termina agora.")}
            </span>
          </label>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={enviando}
              className="rounded-full bg-alarm-red px-5 py-2.5 text-sm font-semibold text-white transition-[filter] hover:brightness-95 disabled:opacity-50"
            >
              {enviando ? tr("Pedindo reembolso...") : tr("Confirmar reembolso")}
            </button>
            <button type="button" onClick={() => setAberto(false)} className="rounded-full bg-marca-verde px-5 py-2.5 text-sm font-semibold text-sobre-acento">
              {tr("Continuar assinante")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
