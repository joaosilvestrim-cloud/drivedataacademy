"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./roadmap.module.css";
import Cronometro from "@/components/Cronometro";

/* Apresentação dos banners cadastrados. A seleção usa o ID do encontro para
   sobreviver às atualizações da agenda. Teclado, toque e miniaturas controlam
   o mesmo slide; a reprodução pausa quando a pessoa interage. */

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
function linkCalendario(e: EventoRoadmap, agoraInicial: number): string {
  const carimbo = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const inicio = new Date(e.starts_at);
  const fim = new Date(inicio.getTime() + (e.duration_min || 90) * 60000);
  const texto = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DriveData Academy//PT-BR",
    "BEGIN:VEVENT",
    `UID:${e.id}@academy.drivedata.com.br`,
    `DTSTAMP:${carimbo(new Date(agoraInicial))}`,
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

function Banner({ event, miniature = false }: { event: EventoRoadmap; miniature?: boolean }) {
  const tr = usarTraducao();
  const [failed, setFailed] = useState(false);
  return event.cover_url && !failed ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={event.cover_url} alt={miniature ? "" : `Banner: ${event.title}`} draggable={false}
      onError={() => setFailed(true)} loading={miniature ? "lazy" : "eager"} />
  ) : <span className={styles.noBanner}><span>{diaMes(event.starts_at)}</span><strong>{event.title}</strong><small>{tr("DriveData Academy")}</small></span>;
}

export default function RoadmapInterativo({ eventos, agoraInicial }: { eventos: EventoRoadmap[]; agoraInicial: number }) {
  const tr = usarTraducao();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const thumbnails = useRef<(HTMLButtonElement | null)[]>([]);
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  const focusAfterChange = useRef(false);
  const uid = useId();
  const ativo = Math.max(0, eventos.findIndex(event => event.id === selectedId));
  const e = eventos[ativo];
  const running = playing && !reducedMotion && !hovered && visible && pageVisible && eventos.length > 1;
  const ids = eventos.map(event => event.id).join(",");

  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    const visibility = () => setPageVisible(!document.hidden);
    update(); visibility();
    preference.addEventListener("change", update);
    document.addEventListener("visibilitychange", visibility);
    return () => { preference.removeEventListener("change", update); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  useEffect(() => {
    if (!root.current) return;
    const observer = new IntersectionObserver(entries => setVisible(entries[0].isIntersecting), { threshold: .15 });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, [Boolean(e)]);
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setSelectedId(eventos[(ativo + 1) % eventos.length].id), 6500);
    return () => clearTimeout(timer);
  }, [running, ativo, ids, eventos]);
  useEffect(() => {
    const button = thumbnails.current[ativo];
    const strip = button?.parentElement;
    if (button && strip) {
      // Scroll only the thumbnail strip; never move the page during autoplay.
      strip.scrollTo({ left: button.offsetLeft - strip.offsetLeft - (strip.clientWidth - button.clientWidth) / 2, behavior: reducedMotion ? "instant" : "smooth" });
      if (focusAfterChange.current) button.focus({ preventScroll: true });
    }
    focusAfterChange.current = false;
  }, [ativo, ids, reducedMotion]);

  if (!e) return null;
  const select = (index: number, focus = false) => {
    setPlaying(false);
    focusAfterChange.current = focus;
    setSelectedId(eventos[(index + eventos.length) % eventos.length].id);
  };
  const keyboard = (event: React.KeyboardEvent) => {
    const target = event.key === "Home" ? 0 : event.key === "End" ? eventos.length - 1
      : event.key === "ArrowRight" ? ativo + 1 : event.key === "ArrowLeft" ? ativo - 1 : null;
    if (target !== null) { event.preventDefault(); select(target, true); }
  };
  const position = (index: number) => {
    let distance = index - ativo;
    if (eventos.length > 2) {
      if (distance > eventos.length / 2) distance -= eventos.length;
      if (distance < -eventos.length / 2) distance += eventos.length;
    }
    return distance;
  };
  const endGesture = (event: React.PointerEvent) => {
    if (!gesture.current) return;
    const dx = event.clientX - gesture.current.x, dy = event.clientY - gesture.current.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      dragged.current = true; select(ativo + (dx < 0 ? 1 : -1));
    }
    gesture.current = null; stage.current?.style.removeProperty("--drag");
  };
  return (
    <section ref={root} className={styles.roadmap} aria-label={tr("Roadmap de encontros")} aria-roledescription="carrossel"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setPlaying(false)}>
      <div className={styles.toolbar}>
        <div><span className={styles.eyebrow}>{tr("Na agenda")}</span><span className={styles.count}>{String(ativo + 1).padStart(2,"0")} <span>/ {String(eventos.length).padStart(2,"0")}</span></span></div>
        {eventos.length > 1 && !reducedMotion && <button type="button" onClick={() => setPlaying(!playing)} aria-pressed={playing} className={styles.play}>
          <span aria-hidden="true">{playing ? "Ⅱ" : "▷"}</span>{playing ? "Pausar slides" : "Reproduzir slides"}
        </button>}
      </div>
      <div ref={stage} className={styles.stage} onPointerDown={event => {
        if (event.button !== 0) return;
        gesture.current = { x: event.clientX, y: event.clientY }; dragged.current = false;
      }} onPointerMove={event => {
        if (gesture.current) stage.current?.style.setProperty("--drag", `${Math.max(-70,Math.min(70,(event.clientX - gesture.current.x) * .28))}px`);
      }} onPointerUp={endGesture} onPointerCancel={() => { gesture.current = null; stage.current?.style.removeProperty("--drag"); }}
      onPointerLeave={() => { gesture.current = null; stage.current?.style.removeProperty("--drag"); }}
      onClickCapture={event => { if (dragged.current) { event.preventDefault(); event.stopPropagation(); dragged.current = false; } }}>
        {eventos.map((event, index) => {
          const distance = position(index);
          if (Math.abs(distance) > 2) return null;
          return <button key={event.id} type="button" className={styles.poster} data-position={Math.max(-2,Math.min(2,distance))}
            tabIndex={-1} aria-hidden={Math.abs(distance) > 1 ? true : undefined}
            aria-label={`Ver encontro: ${event.title}`} onClick={() => select(index)}>
            <Banner key={event.cover_url} event={event} />
          </button>;
        })}
      </div>
      <div className={styles.controls}>
        <button type="button" aria-label={tr("Encontro anterior")} disabled={eventos.length < 2} onClick={() => select(ativo - 1)}>←</button>
        <span>{diaMes(e.starts_at)} <span>· {e.kind === "mentoria" ? "Mentoria" : "Live"}</span></span>
        <button type="button" aria-label={tr("Próximo encontro")} disabled={eventos.length < 2} onClick={() => select(ativo + 1)}>→</button>
      </div>
      <div className={styles.progress} aria-hidden="true"><span key={`${e.id}-${running}`} data-running={running} /></div>
      <div id={`${uid}-detail`} className={styles.detail} role="tabpanel" aria-labelledby={`${uid}-tab-${e.id}`} tabIndex={0}>
        <div className={styles.summary} aria-live={running ? "off" : "polite"} aria-atomic="true">
          <h3 key={e.id} className="font-display">{e.title}</h3>
          <p className={styles.when}>{completa(e.starts_at)}{e.duration_min ? ` · ${e.duration_min} min` : ""}</p>
          {e.description && <p className={styles.description}>{e.description}</p>}
        </div>
        <div className={styles.actions}>
          <Cronometro inicio={e.starts_at} duracaoMin={e.duration_min} compacto agoraInicial={agoraInicial} />
          <a href={linkCalendario(e, agoraInicial)} download={`${e.title.toLowerCase().replace(/[^a-z0-9]+/g,"-")}.ics`}>{tr("Salvar no calendário")} <span aria-hidden="true">↗</span></a>
          {e.url && /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(e.url) && <a href={e.url} target="_blank" rel="noreferrer">{tr("Abrir no YouTube ↗")}</a>}
        </div>
      </div>
      <div className={styles.filmstrip} role="tablist" aria-label={tr("Escolher encontro")} onKeyDown={keyboard}>
        {eventos.map((event,index) => <button type="button" key={event.id} ref={el => { thumbnails.current[index] = el; }}
          role="tab" id={`${uid}-tab-${event.id}`} aria-selected={index === ativo} aria-controls={`${uid}-detail`}
          aria-label={`${diaMes(event.starts_at)}: ${event.title}`} tabIndex={index === ativo ? 0 : -1} onClick={() => select(index)}>
          <span className={styles.thumbnail}><Banner key={event.cover_url} event={event} miniature /></span>
          <span>{diaMes(event.starts_at)}</span>
        </button>)}
      </div>
      <p className={styles.footer}>{tr("Deslize os banners ou escolha um encontro. A agenda acompanha os novos cadastros automaticamente.")}</p>
    </section>
  );
}
