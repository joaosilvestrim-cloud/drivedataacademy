"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiPromise;
}

// Tempo que a capa fica por cima após o vídeo começar — até o YouTube
// esconder sozinho o título/canal no topo.
const REVEAL_DELAY = 3400;
const FALLBACK_REVEAL = 7000;

export default function VideoCarousel({ ids }: { ids: string[] }) {
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const many = ids.length > 1;

  function clearTimers() {
    if (revealTimer.current) clearTimeout(revealTimer.current);
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    revealTimer.current = null;
    fallbackTimer.current = null;
  }

  function armReveal() {
    // revela só depois que o vídeo já está tocando há REVEAL_DELAY
    if (!revealTimer.current) {
      revealTimer.current = setTimeout(() => setRevealed(true), REVEAL_DELAY);
    }
  }

  function coverThenReveal() {
    clearTimers();
    setRevealed(false);
    // segurança: nunca deixa a capa presa se o PLAYING não disparar
    fallbackTimer.current = setTimeout(() => setRevealed(true), FALLBACK_REVEAL);
  }

  useEffect(() => {
    let cancelled = false;
    coverThenReveal();
    loadYouTubeApi().then(() => {
      if (cancelled || !hostRef.current || !window.YT) return;
      const target = document.createElement("div");
      hostRef.current.appendChild(target);
      playerRef.current = new window.YT.Player(target, {
        width: "100%",
        height: "100%",
        videoId: ids[0],
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
        },
        events: {
          onReady: (e: any) => {
            e.target.mute();
            e.target.playVideo();
          },
          onStateChange: (e: any) => {
            const YT = window.YT;
            if (e.data === YT.PlayerState.PLAYING) armReveal();
            if (e.data === YT.PlayerState.ENDED) {
              e.target.seekTo(0);
              e.target.playVideo();
            }
          },
        },
      });
    });
    return () => {
      cancelled = true;
      clearTimers();
      try {
        playerRef.current?.destroy();
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function go(idx: number) {
    setI(idx);
    coverThenReveal(); // cobre de novo até o novo vídeo passar do título
    const p = playerRef.current;
    if (p?.loadVideoById) {
      p.mute();
      p.loadVideoById(ids[idx]);
    }
  }
  const prev = () => go((i - 1 + ids.length) % ids.length);
  const next = () => go((i + 1) % ids.length);

  return (
    <div className="mx-auto mt-10 max-w-4xl">
      <div className="relative">
        <div className="glow-border overflow-hidden rounded-[1.75rem]">
          <div className="relative aspect-video w-full overflow-hidden rounded-[1.75rem] bg-ink-900">
            {/* O player do YouTube é injetado aqui */}
            <div ref={hostRef} className="absolute inset-0 h-full w-full [&>iframe]:h-full [&>iframe]:w-full" />

            {/* Bloqueia interação (impede hover/pause -> sem UI do YouTube) */}
            <div className="absolute inset-0 z-10" aria-hidden />

            {/* Capa: cobre poster/cabeçalho até o vídeo realmente tocar */}
            <div
              className={`absolute inset-0 z-20 grid place-items-center bg-ink-900 transition-opacity duration-700 ${
                revealed ? "pointer-events-none opacity-0" : "opacity-100"
              }`}
              aria-hidden
            >
              <div className="grid-bg absolute inset-0 opacity-20" />
              <span className="relative h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-brand-green" />
            </div>
          </div>
        </div>

        {many && (
          <>
            <button
              onClick={prev}
              aria-label="Vídeo anterior"
              className="absolute left-2 top-1/2 z-30 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-ink-900/70 text-white backdrop-blur transition-colors hover:border-brand-green/60 hover:text-brand-green sm:-left-5"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={next}
              aria-label="Próximo vídeo"
              className="absolute right-2 top-1/2 z-30 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-ink-900/70 text-white backdrop-blur transition-colors hover:border-brand-green/60 hover:text-brand-green sm:-right-5"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        )}
      </div>

      {many && (
        <div className="mt-5 flex items-center justify-center gap-2">
          {ids.map((_, idx) => (
            <button
              key={idx}
              onClick={() => go(idx)}
              aria-label={`Ir para o vídeo ${idx + 1}`}
              className={`h-2 rounded-full transition-all ${
                idx === i ? "w-6 bg-brand-green" : "w-2 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
