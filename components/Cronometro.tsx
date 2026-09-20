"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";

import { useEffect, useState } from "react";

/* Contagem regressiva até o início de um evento, rodando a cada segundo.

   O primeiro desenho usa `agoraInicial`, o mesmo instante que o servidor usou.
   Assim o HTML do servidor e o primeiro render do navegador saem idênticos e a
   hidratação não quebra. Calcular Date.now() dos dois lados dava segundos
   diferentes e o React descartava o HTML da página inteira. Depois de hidratar
   o relógio passa a correr sozinho. Quando chega a hora vira "Ao vivo agora", e depois da duração do
   evento vira "Encerrada". Os números usam tabular-nums para não tremer. */

function partes(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

const dois = (n: number) => String(n).padStart(2, "0");

export default function Cronometro({
  inicio,
  duracaoMin = 90,
  compacto = false,
  agoraInicial,
}: {
  inicio: string;
  duracaoMin?: number | null;
  compacto?: boolean;
  agoraInicial: number;
}) {
  const tr = usarTraducao();
  const alvo = new Date(inicio).getTime();
  const fim = alvo + (duracaoMin || 90) * 60000;
  const [agora, setAgora] = useState(agoraInicial);

  useEffect(() => {
    setAgora(Date.now());
    const t = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  if (agora >= fim) {
    return <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{tr("Encerrada")}</span>;
  }

  if (agora >= alvo) {
    return (
      <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-300">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75 motion-reduce:animate-none" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        {tr("Ao vivo agora")}
      </span>
    );
  }

  const { d, h, m, s } = partes(alvo - agora);
  const falta = d > 0 ? `${d} dia${d > 1 ? "s" : ""}, ${h} h e ${m} min` : `${h} h, ${m} min e ${s} s`;

  if (compacto) {
    return (
      <span className="font-mono text-xs font-semibold tabular-nums text-brand-cyan" aria-label={`Começa em ${falta}`}>
        {d > 0 && `${d}d `}
        {dois(h)}:{dois(m)}:{dois(s)}
      </span>
    );
  }

  const blocos = [
    ...(d > 0 ? [{ v: d, r: d === 1 ? "dia" : "dias" }] : []),
    { v: h, r: "h" },
    { v: m, r: "min" },
    { v: s, r: "s" },
  ];

  return (
    <span className="inline-flex items-end gap-1.5" role="timer" aria-label={`Começa em ${falta}`}>
      {blocos.map((b, i) => (
        <span key={i} className="flex flex-col items-center">
          <span className="min-w-[2.1rem] rounded-md border border-brand-cyan/25 bg-brand-cyan/10 px-1.5 py-1 text-center font-mono text-sm font-bold tabular-nums text-white" aria-hidden="true">
            {b.r === "dia" || b.r === "dias" ? b.v : dois(b.v)}
          </span>
          <span className="mt-0.5 text-[0.58rem] uppercase tracking-wider text-slate-500" aria-hidden="true">{b.r}</span>
        </span>
      ))}
    </span>
  );
}
