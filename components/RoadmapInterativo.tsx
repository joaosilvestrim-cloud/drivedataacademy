"use client";

import { useState } from "react";
import Cronometro from "@/components/Cronometro";

/* Roadmap dos próximos encontros. No lugar de uma lista longa, uma régua de
   datas: a pessoa escolhe a data e vê aquele encontro inteiro, com capa,
   contagem regressiva e o botão de salvar no calendário. Setas do teclado
   andam pela régua, então dá para navegar sem mouse. */

export type EventoRoadmap = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  duration_min: number | null;
  cover_url: string | null;
  url: string | null;
  kind: string | null;
};

const FUSO = "America/Sao_Paulo";
const diaMes = (iso: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: FUSO }).format(new Date(iso)).replace(".", "");
const completa = (iso: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short", timeZone: FUSO }).format(new Date(iso));

// Arquivo .ics montado na hora, sem servidor: abre no Google Agenda, Outlook e iPhone.
function linkCalendario(e: EventoRoadmap): string {
  const carimbo = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const inicio = new Date(e.starts_at);
  const fim = new Date(inicio.getTime() + (e.duration_min || 90) * 60000);
  const texto = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DriveData Academy//PT-BR",
    "BEGIN:VEVENT",
    `UID:${e.id}@academy.drivedata.com.br`,
    `DTSTAMP:${carimbo(new Date())}`,
    `DTSTART:${carimbo(inicio)}`,
    `DTEND:${carimbo(fim)}`,
    `SUMMARY:${e.title}`,
    `DESCRIPTION:${(e.description || "").replace(/\n/g, "\\n")}`,
    e.url ? `URL:${e.url}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
  return "data:text/calendar;charset=utf-8," + encodeURIComponent(texto);
}

export default function RoadmapInterativo({ eventos, agoraInicial }: { eventos: EventoRoadmap[]; agoraInicial: number }) {
  const [ativo, setAtivo] = useState(0);
  if (eventos.length === 0) return null;
  const e = eventos[Math.min(ativo, eventos.length - 1)];

  function teclado(ev: React.KeyboardEvent) {
    if (ev.key === "ArrowRight") setAtivo((i) => Math.min(i + 1, eventos.length - 1));
    if (ev.key === "ArrowLeft") setAtivo((i) => Math.max(i - 1, 0));
  }

  return (
    <div className="mt-4">
      {/* Régua de datas */}
      <div role="tablist" aria-label="Próximos encontros" onKeyDown={teclado} className="flex gap-2 overflow-x-auto pb-2">
        {eventos.map((ev, i) => {
          const atual = i === ativo;
          return (
            <button
              key={ev.id}
              role="tab"
              aria-selected={atual}
              tabIndex={atual ? 0 : -1}
              onClick={() => setAtivo(i)}
              className={`shrink-0 rounded-xl border px-4 py-2.5 text-left transition-colors ${
                atual ? "border-brand-green bg-brand-green/10" : "border-white/10 hover:border-brand-green/40"
              }`}
            >
              <span className={`block font-mono text-sm tabular-nums ${atual ? "text-brand-green" : "text-slate-300"}`}>{diaMes(ev.starts_at)}</span>
              <span className="mt-0.5 block max-w-[11rem] truncate text-xs text-slate-500">{ev.kind === "mentoria" ? "Mentoria" : "Live"}</span>
            </button>
          );
        })}
      </div>

      {/* Encontro escolhido */}
      <div role="tabpanel" className="glass mt-3 flex flex-col gap-5 rounded-2xl border border-white/8 p-5 sm:flex-row">
        {e.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={e.cover_url}
            src={e.cover_url}
            alt={`Banner: ${e.title}`}
            className="aspect-[16/9] w-full shrink-0 rounded-xl border border-white/10 object-cover sm:w-72"
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-xl font-bold text-white">{e.title}</h3>
            {e.kind === "mentoria" && (
              <span className="rounded-full bg-brand-blue/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-brand-teal">Mentoria</span>
            )}
          </div>
          <p className="mt-1 text-sm text-brand-teal">
            {completa(e.starts_at)}
            {e.duration_min ? ` · ${e.duration_min} min` : ""}
          </p>
          {e.description && <p className="mt-2 whitespace-pre-line text-sm text-slate-300">{e.description}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Cronometro inicio={e.starts_at} duracaoMin={e.duration_min} compacto agoraInicial={agoraInicial} />
            <a
              href={linkCalendario(e)}
              download={`${e.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-brand-green/50 hover:text-brand-green"
            >
              Salvar no calendário
            </a>
            {e.url && /youtu/.test(e.url) && (
              <a
                href={e.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 transition-colors hover:bg-red-500/20"
              >
                Abrir no YouTube ↗
              </a>
            )}
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {eventos.length} {eventos.length === 1 ? "encontro" : "encontros"} no roadmap. Use as setas do teclado para percorrer as datas.
      </p>
    </div>
  );
}
