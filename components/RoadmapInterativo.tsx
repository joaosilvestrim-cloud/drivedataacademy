"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./roadmap.module.css";
import type { createRoadmapScene } from "./roadmap-scene";
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const stage = useRef<HTMLDivElement>(null);
  const scene = useRef<ReturnType<typeof createRoadmapScene> | null>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusAfterChange = useRef(false);
  const uid = useId();
  const ativo = Math.max(0, eventos.findIndex(event => event.id === selectedId));
  const e = eventos[ativo];
  // Six platforms per view; the agenda itself has no six-event limit.
  const offset = Math.floor(ativo / 6) * 6;
  const visible = eventos.slice(offset, offset + 6);
  const visibleKey = JSON.stringify(visible.map(event => event.id));
  const selectedRef = useRef(ativo);
  const pausedRef = useRef(true);
  selectedRef.current = ativo;
  pausedRef.current = paused || reducedMotion;

  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update(); preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!stage.current || !visible.length) return;
    const host = stage.current;
    import("./roadmap-scene").then(({ createRoadmapScene }) => {
      if (cancelled) return;
      try {
        const instance = createRoadmapScene(host, buttonRefs.current.slice(0, visible.length).filter((b): b is HTMLButtonElement => Boolean(b)), offset);
        scene.current = instance;
        instance.select(selectedRef.current);
        instance.pause(pausedRef.current);
      } catch {
        host.dataset.ready = "false";
      }
    }).catch(() => { host.dataset.ready = "false"; });
    return () => { cancelled = true; scene.current?.dispose(); scene.current = null; };
  // Titles and banners can change without rebuilding the graphics.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKey, offset]);

  useEffect(() => {
    scene.current?.select(ativo);
    if (focusAfterChange.current) {
      buttonRefs.current[ativo - offset]?.focus({ preventScroll: true });
      focusAfterChange.current = false;
    }
  }, [ativo, offset, visibleKey]);
  useEffect(() => { scene.current?.pause(paused || reducedMotion); }, [paused, reducedMotion]);

  if (!e) return null;
  function select(index: number, focus = false) {
    const event = eventos[Math.max(0, Math.min(eventos.length - 1, index))];
    if (!event) return;
    focusAfterChange.current = focus;
    setSelectedId(event.id);
  }
  function teclado(event: React.KeyboardEvent) {
    const target = event.key === "Home" ? 0 : event.key === "End" ? eventos.length - 1
      : ["ArrowRight", "ArrowDown"].includes(event.key) ? ativo + 1
      : ["ArrowLeft", "ArrowUp"].includes(event.key) ? ativo - 1 : null;
    if (target === null) return;
    event.preventDefault(); select(target, true);
  }
  return (
    <section className={styles.roadmap} aria-label="Roadmap interativo">
      <div className={styles.toolbar}>
        <span>{diaMes(visible[0].starts_at)} — {diaMes(visible[visible.length - 1].starts_at)} · {new Date(e.starts_at).getFullYear()}</span>
        {!reducedMotion && <button type="button" onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? "Ativar movimento" : "Pausar movimento"}</button>}
      </div>
      <div ref={stage} className={styles.stage}>
        <div className={styles.stops} role="tablist" aria-label="Próximos encontros" onKeyDown={teclado}>
          {visible.map((event, i) => {
            const index = offset + i;
            const atual = index === ativo;
            return (
              <button type="button" ref={el => { buttonRefs.current[i] = el; }} key={event.id}
                id={`${uid}-tab-${event.id}`} role="tab" aria-selected={atual}
                aria-controls={`${uid}-detail`} tabIndex={atual ? 0 : -1}
                aria-label={`${diaMes(event.starts_at)}: ${event.title}`}
                onClick={() => select(index)} className={styles.stop}>
                <span className={styles.date}>{diaMes(event.starts_at)}</span>
                <span className={styles.name}>{event.title}</span>
                <span className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className={styles.navigation}>
        <span className={styles.hint}>Escolha uma data para explorar o encontro.</span>
        <div><span aria-live="polite">{String(ativo + 1).padStart(2, "0")} / {String(eventos.length).padStart(2, "0")}</span>
          <button type="button" aria-label="Encontro anterior" disabled={ativo === 0} onClick={() => select(ativo - 1)}>←</button>
          <button type="button" aria-label="Próximo encontro" disabled={ativo === eventos.length - 1} onClick={() => select(ativo + 1)}>→</button>
        </div>
      </div>
      <div id={`${uid}-detail`} role="tabpanel" aria-labelledby={`${uid}-tab-${e.id}`} tabIndex={0} className={styles.detail}>
        {e.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={e.cover_url} src={e.cover_url} alt={`Banner: ${e.title}`} className={styles.banner} />
        )}
        <div className={styles.content}>
          <span className={styles.kind}>{e.kind === "mentoria" ? "Mentoria" : "Live"}</span>
          <h3 className="font-display">{e.title}</h3>
          <p className={styles.when}>{completa(e.starts_at)}{e.duration_min ? ` · ${e.duration_min} min` : ""}</p>
          {e.description && <p className={styles.description}>{e.description}</p>}
          <div className={styles.actions}>
            <Cronometro inicio={e.starts_at} duracaoMin={e.duration_min} compacto agoraInicial={agoraInicial} />
            <a href={linkCalendario(e)} download={`${e.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`}>Salvar no calendário</a>
            {e.url && /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(e.url) && (
              <a href={e.url} target="_blank" rel="noreferrer">Abrir no YouTube ↗</a>
            )}
          </div>
        </div>
      </div>
      <p className={styles.footer}>{eventos.length} {eventos.length === 1 ? "encontro" : "encontros"} no roadmap · Agenda atualizada automaticamente. Use as setas do teclado para percorrer as datas.</p>
    </section>
  );
}
