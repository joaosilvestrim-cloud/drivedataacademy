"use client";

import { useEffect, useState } from "react";

/* Quanto falta para os downloads liberarem. Mesma ideia do cronômetro das
   lives: o primeiro desenho usa o instante que veio do servidor, senão a
   hidratação quebra por diferença de segundos. Depois corre sozinho. */

const dois = (n: number) => String(n).padStart(2, "0");

export default function ContagemLiberacao({
  liberaEm,
  agoraInicial,
  compacto = false,
}: {
  liberaEm: string;
  agoraInicial: number;
  compacto?: boolean;
}) {
  const alvo = new Date(liberaEm).getTime();
  const [agora, setAgora] = useState(agoraInicial);

  useEffect(() => {
    setAgora(Date.now());
    const t = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const resta = Math.max(0, alvo - agora);
  if (resta === 0) {
    return <span className="text-xs font-semibold text-brand-green">Liberado. Atualize a página.</span>;
  }

  const s = Math.floor(resta / 1000);
  const dias = Math.floor(s / 86400);
  const horas = Math.floor((s % 86400) / 3600);
  const min = Math.floor((s % 3600) / 60);
  const seg = s % 60;

  if (compacto) {
    return (
      <span className="font-mono text-xs tabular-nums text-amber-300/90">
        {dias > 0 ? `${dias}d ` : ""}
        {dois(horas)}:{dois(min)}:{dois(seg)}
      </span>
    );
  }

  return (
    <span className="flex flex-wrap items-baseline gap-3 font-mono text-2xl tabular-nums text-white">
      {dias > 0 && (
        <span>
          {dias}
          <span className="ml-1 text-xs uppercase tracking-wider text-slate-400">{dias === 1 ? "dia" : "dias"}</span>
        </span>
      )}
      <span>
        {dois(horas)}
        <span className="ml-1 text-xs uppercase tracking-wider text-slate-400">h</span>
      </span>
      <span>
        {dois(min)}
        <span className="ml-1 text-xs uppercase tracking-wider text-slate-400">min</span>
      </span>
      <span>
        {dois(seg)}
        <span className="ml-1 text-xs uppercase tracking-wider text-slate-400">s</span>
      </span>
    </span>
  );
}
