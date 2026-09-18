"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { EventoFaixa } from "@/lib/sessao";

/* Faixa rolante com os próximos encontros, no topo da área do aluno.

   O conteúdo vai duplicado dentro da trilha e a animação anda metade da
   largura: quando a primeira cópia sai, a segunda está exatamente no lugar
   dela, e o loop não tem emenda. Para no hover e no foco do teclado, e quem
   pediu menos movimento no sistema vê a lista parada, com rolagem lateral. */

const FUSO = "America/Sao_Paulo";
const diaSemana = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: FUSO });
const diaMes = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: FUSO });
const hora = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: FUSO });
const chaveDia = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: FUSO }).format(d);

function quando(iso: string, agora: number) {
  const d = new Date(iso);
  const ms = d.getTime() - agora;
  if (ms <= 0) return { texto: "AO VIVO AGORA", destaque: true };
  const h = hora.format(d).replace(":", "h");
  if (ms < 3600_000) return { texto: `em ${Math.max(1, Math.round(ms / 60_000))} min`, destaque: true };
  const hoje = chaveDia(new Date(agora));
  const amanha = chaveDia(new Date(agora + 864e5));
  if (chaveDia(d) === hoje) return { texto: `hoje ${h}`, destaque: true };
  if (chaveDia(d) === amanha) return { texto: `amanhã ${h}`, destaque: false };
  return { texto: `${diaSemana.format(d).replace(".", "")} ${diaMes.format(d)} · ${h}`, destaque: false };
}

export default function FaixaEventos({ eventos }: { eventos: EventoFaixa[] }) {
  // O relógio só existe no navegador: o servidor renderiza com a hora da
  // requisição e o cliente atualiza a cada minuto, sem erro de hidratação.
  const [agora, setAgora] = useState<number | null>(null);
  useEffect(() => {
    setAgora(Date.now());
    const t = setInterval(() => setAgora(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (!eventos.length) return null;

  // Com poucos eventos a trilha fica curta demais para rolar bonito; repete até encher.
  const base = eventos.length >= 4 ? eventos : Array.from({ length: Math.ceil(4 / eventos.length) }, () => eventos).flat();
  const duracao = Math.max(25, base.length * 7);

  const item = (e: EventoFaixa, i: number, oculto: boolean) => {
    const q = agora == null ? null : quando(e.starts_at, agora);
    return (
      <Link
        key={`${oculto ? "b" : "a"}-${i}-${e.id}`}
        href="/conta/agenda"
        tabIndex={oculto ? -1 : undefined}
        aria-hidden={oculto || undefined}
        className="group flex shrink-0 items-center gap-2.5 whitespace-nowrap px-5 text-[0.8rem] text-slate-300 outline-none transition-colors hover:text-white focus-visible:text-white"
      >
        <span className={`rounded px-1.5 py-0.5 font-mono text-[0.68rem] font-semibold uppercase tabular-nums ${q?.destaque ? "bg-brand-green/20 text-brand-green" : "bg-white/[0.06] text-slate-400"}`}>
          {q?.texto ?? "em breve"}
        </span>
        <span className="font-medium">{e.title}</span>
        <span className="text-[0.65rem] uppercase tracking-wide text-slate-500">{e.kind === "mentoria" ? "mentoria" : "live"}</span>
        <span aria-hidden="true" className="ml-3 h-1 w-1 rounded-full bg-white/20" />
      </Link>
    );
  };

  return (
    <div className="faixa-eventos relative flex h-9 items-stretch overflow-hidden border-b border-white/10 bg-ink-900/85 backdrop-blur" role="region" aria-label="Próximos eventos">
      <Link
        href="/conta/agenda"
        className="relative z-10 flex shrink-0 items-center gap-2 border-r border-white/10 bg-ink-900 px-3 text-[0.7rem] font-semibold uppercase tracking-wider text-brand-green hover:text-white"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="hidden sm:inline">Próximos eventos</span>
      </Link>

      <div className="faixa-mascara relative min-w-0 flex-1 overflow-hidden">
        <div className="faixa-trilha flex h-full w-max items-center" style={{ animationDuration: `${duracao}s` }}>
          {base.map((e, i) => item(e, i, false))}
          {base.map((e, i) => item(e, i, true))}
        </div>
      </div>
    </div>
  );
}
