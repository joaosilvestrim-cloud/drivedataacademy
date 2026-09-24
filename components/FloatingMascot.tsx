"use client";

import { useEffect, useState } from "react";
import Mascot from "./Mascot";
import { usarTraducao } from "@/lib/i18n/usarTraducao";
import styles from "./floating-mascot.module.css";

// The four poses share one transparent atlas, downloaded only once.
const SEQUENCE = [1, 3, 1, 0] as const;
const BEAT_MS = 1600;

export default function FloatingMascot({ open, onToggle }: {
  open: boolean;
  onToggle: () => void;
}) {
  const tr = usarTraducao();
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [visible, setVisible] = useState(true);
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

  // Keep dancing during hints, hover, focus and conversations. Only the system's
  // reduced-motion preference or an invisible tab suspends decorative motion.
  const still = reduced || !visible;
  useEffect(() => {
    if (still || !ready) return;
    const timer = window.setInterval(() => setStep(s => (s + 1) % SEQUENCE.length), BEAT_MS);
    return () => window.clearInterval(timer);
  }, [still, ready]);

  const pose = still ? 0 : SEQUENCE[step];

  return <div className={styles.dock} data-still={still} data-pose={pose}>
    <button type="button" onClick={onToggle} aria-label={tr("Assistente de dúvidas")} aria-expanded={open} aria-controls="drivedata-assistant-panel"
      className={styles.launcher}>
      <span className={styles.glow} aria-hidden="true" />
      <span className={styles.platform} aria-hidden="true"><span /></span>
      <span className={styles.character} aria-hidden="true">
        {ready ? [0, 1, 3].map(frame => <span key={frame} className={styles.frame} data-frame={frame} data-active={pose === frame} />)
          : <Mascot className="h-full w-full drop-shadow-lg" />}
      </span>
      <span className={styles.online} aria-hidden="true" />
    </button>
  </div>;
}
