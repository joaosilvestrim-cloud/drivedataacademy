"use client";

import { useEffect, useState } from "react";
import Mascot from "./Mascot";
import { usarTraducao } from "@/lib/i18n/usarTraducao";
import styles from "./floating-mascot.module.css";

// The four poses share one transparent atlas, downloaded only once.
const SEQUENCE = [0, 1, 0, 2, 0, 3] as const;
const DURATIONS = [7000, 3200, 8500, 5000, 8500, 3200];

export default function FloatingMascot({ open, onToggle, hint, loading, paused, onPause }: {
  open: boolean;
  onToggle: () => void;
  hint?: "ajuda" | "dica" | "piada";
  loading: boolean;
  paused: boolean;
  onPause: () => void;
}) {
  const tr = usarTraducao();
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [visible, setVisible] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const image = new Image();
    image.onload = () => setReady(true);
    image.src = "/mascot-poses.png";
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReduced(media.matches);
    const visibility = () => setVisible(!document.hidden);
    motion(); visibility();
    media.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      image.onload = null;
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  const still = paused || reduced || !visible;
  const interacting = hovered || focused;
  useEffect(() => {
    if (still || open || interacting || hint || !ready) return;
    const timer = window.setTimeout(() => setStep(s => (s + 1) % SEQUENCE.length), DURATIONS[step]);
    return () => window.clearTimeout(timer);
  }, [still, open, interacting, hint, ready, step]);

  const pose = still ? 0 : loading ? 2 : open ? 0 : interacting ? 1 : hint === "piada" ? 3 : hint === "dica" ? 2 : hint === "ajuda" ? 1 : SEQUENCE[step];

  return <div className={styles.dock} data-still={still} data-pose={pose}>
    <button type="button" onClick={onToggle} aria-label={tr("Assistente de dúvidas")} aria-expanded={open} aria-controls="drivedata-assistant-panel"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      className={styles.launcher}>
      <span className={styles.glow} aria-hidden="true" />
      <span className={styles.platform} aria-hidden="true"><span /></span>
      <span className={styles.character} aria-hidden="true">
        {ready ? [0, 1, 2, 3].map(frame => <span key={frame} className={styles.frame} data-frame={frame} data-active={pose === frame} />)
          : <Mascot className="h-full w-full drop-shadow-lg" />}
      </span>
      <span className={styles.online} aria-hidden="true" />
    </button>
    {!reduced && <button type="button" onClick={onPause} className={styles.pause} aria-pressed={paused}
      aria-label={tr(paused ? "Retomar animação do mascote" : "Pausar animação do mascote")}
      title={tr(paused ? "Retomar animação do mascote" : "Pausar animação do mascote")}>
      <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
        {paused ? <path d="M5 3l8 5-8 5z" /> : <path d="M4 3h3v10H4zM10 3h3v10h-3z" />}
      </svg>
    </button>}
  </div>;
}
