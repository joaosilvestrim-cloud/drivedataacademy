"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";

import { useEffect, useState } from "react";

/* Faixa do cupom de lançamento, com a contagem regressiva até o vencimento.

   Mesmo cuidado do Cronometro: o primeiro desenho usa `agoraInicial`, o
   instante que o servidor usou, senão o HTML do servidor e o do navegador
   saem diferentes e a hidratação da home inteira quebra. Depois de hidratar
   o relógio corre sozinho e, quando o prazo vence, a faixa some. */

const dois = (n: number) => String(n).padStart(2, "0");

function partes(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

function Cupom({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 8.5V6a1 1 0 011-1h16a1 1 0 011 1v2.5a2.8 2.8 0 000 7V18a1 1 0 01-1 1H4a1 1 0 01-1-1v-2.5a2.8 2.8 0 000-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14.5 9.5l-5 5M9.7 10.1h.01M14.3 13.9h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function CupomContagem({
  codigo,
  desconto,
  prazo,
  expiraEm,
  agoraInicial,
}: {
  codigo: string;
  /** "10% de desconto", já formatado pelo servidor. */
  desconto: string;
  /** "18/09/2026 às 23:59", no fuso de Brasília. */
  prazo: string;
  expiraEm: string;
  agoraInicial: number;
}) {
  const tr = usarTraducao();
  const alvo = Date.parse(expiraEm);
  const [agora, setAgora] = useState(agoraInicial);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    setAgora(Date.now());
    const t = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!copiado) return;
    const t = window.setTimeout(() => setCopiado(false), 2000);
    return () => window.clearTimeout(t);
  }, [copiado]);

  if (!Number.isFinite(alvo) || agora >= alvo) return null;

  const { d, h, m, s } = partes(alvo - agora);
  const falta = d > 0 ? `${d} dia${d > 1 ? "s" : ""}, ${h} h e ${m} min` : `${h} h, ${m} min e ${s} s`;
  const blocos = [...(d > 0 ? [{ v: d, r: d === 1 ? "dia" : "dias" }] : []), { v: h, r: "h" }, { v: m, r: "min" }, { v: s, r: "s" }];

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="mt-5 inline-flex max-w-full flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-dashed border-brand-green/45 bg-brand-green/[0.07] px-5 py-4">
      <span className="flex items-center gap-2.5 text-brand-green">
        <Cupom />
        <button
          type="button"
          onClick={copiar}
          title={tr("Copiar o código")}
          className="font-mono text-base font-bold tracking-wide text-white transition-colors hover:text-brand-green"
        >
          CUPOM: {codigo}
        </button>
        <span className="rounded-full bg-brand-green/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-brand-green">{desconto}</span>
      </span>

      <span className="flex flex-col gap-1.5">
        <span className="text-xs text-slate-400">
          Validade {prazo} · <span className="text-slate-500">{tr("termina em")}</span>
        </span>
        <span className="inline-flex items-end gap-1.5" role="timer" aria-label={`O cupom ${codigo} vence em ${falta}`}>
          {blocos.map((b, i) => (
            <span key={i} className="flex flex-col items-center">
              <span className="min-w-[2.1rem] rounded-md border border-brand-green/30 bg-ink-900/70 px-1.5 py-1 text-center font-mono text-sm font-bold tabular-nums text-white" aria-hidden="true">
                {b.r === "dia" || b.r === "dias" ? b.v : dois(b.v)}
              </span>
              <span className="mt-0.5 text-[0.58rem] uppercase tracking-wider text-slate-500" aria-hidden="true">{b.r}</span>
            </span>
          ))}
        </span>
      </span>

      <span className="text-xs text-slate-400" aria-live="polite">
        {copiado ? <span className="text-brand-green">{tr("código copiado")}</span> : "use no checkout"}
      </span>
    </div>
  );
}
