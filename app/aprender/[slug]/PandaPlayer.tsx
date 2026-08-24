"use client";

import { useEffect, useRef } from "react";
import { markLessonDone } from "./actions";

// Extrai pullzone (library_id) e video_external_id de um iframe/URL/ID colado.
function parsePanda(raw: string): { pullzone: string | null; videoId: string | null; embedUrl: string | null } {
  let v = (raw || "").trim();
  const iframe = v.match(/src=["']([^"']+)["']/i);
  if (iframe) v = iframe[1];
  const embedUrl = /^https?:\/\//i.test(v) ? v : null;
  // host: player-<pullzone>.tv.pandavideo.com.br
  const hostMatch = v.match(/player-([a-z0-9-]+)\.tv\.pandavideo\.com\.br/i);
  const pullzone = hostMatch ? hostMatch[1] : null;
  // video_external_id: valor de v= ou UUID
  const vMatch = v.match(/[?&]v=([0-9a-f-]{16,})/i);
  const uuid = v.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  const videoId = vMatch ? vMatch[1] : uuid ? uuid[0] : null;
  return { pullzone, videoId, embedUrl };
}

let scriptPromise: Promise<void> | null = null;
function loadPandaScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).PandaPlayer) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve) => {
    const s = document.createElement("script");
    s.src = "https://player.pandavideo.com.br/api.v2.js";
    s.async = true;
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export default function PandaPlayer({
  videoId: raw,
  host,
  lessonId,
  courseId,
  slug,
}: {
  videoId: string;
  host: string | null;
  lessonId: string;
  courseId: string;
  slug: string;
}) {
  const marked = useRef(false);
  const watched = useRef(0);
  const lastT = useRef<number | null>(null);
  const { pullzone, videoId, embedUrl } = parsePanda(raw);
  const effPullzone = pullzone || (host ? host.replace(/^player-/, "").replace(/\.tv\.pandavideo\.com\.br.*/i, "") : null);
  const domId = videoId ? `panda-${videoId}` : "panda-player";

  useEffect(() => {
    marked.current = false;
    watched.current = 0;
    lastT.current = null;
    if (!effPullzone || !videoId) return;

    let player: any;
    let cancelled = false;

    function done(pct: number) {
      if (marked.current) return;
      marked.current = true;
      markLessonDone(lessonId, courseId, slug, Math.min(100, Math.max(0, Math.round(pct))));
    }

    function onEvent(e: any) {
      const msg = e?.message || e?.event;
      const ct = e?.currentTime ?? e?.data?.currentTime;
      const dur = e?.duration ?? e?.data?.duration;
      if (msg === "panda_ended" || msg === "ended") return done(100);
      if (typeof ct === "number" && typeof dur === "number" && dur > 0) {
        // soma só o tempo assistido de fato (evita "pular pro fim")
        if (lastT.current != null && ct > lastT.current && ct - lastT.current < 1.5) {
          watched.current += ct - lastT.current;
        }
        lastT.current = ct;
        if (watched.current / dur >= 0.9) done((watched.current / dur) * 100);
      }
    }

    loadPandaScript().then(() => {
      if (cancelled) return;
      (window as any).pandascripttag = (window as any).pandascripttag || [];
      (window as any).pandascripttag.push(() => {
        if (cancelled) return;
        try {
          player = new (window as any).PandaPlayer(domId, {
            library_id: effPullzone,
            video_id: videoId,
            onReady: () => player?.onEvent?.(onEvent),
          });
        } catch {
          /* fallback fica no iframe abaixo */
        }
      });
    });

    return () => {
      cancelled = true;
      try { player?.destroy?.(); } catch {}
    };
  }, [effPullzone, videoId, domId, lessonId, courseId, slug]);

  // SDK oficial (rastreamento confiável)
  if (effPullzone && videoId) {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
        <div className="relative aspect-video">
          <div id={domId} className="absolute inset-0 h-full w-full" />
        </div>
      </div>
    );
  }

  // Fallback: iframe simples (sem rastreamento fino) se não deu pra extrair os dados
  const src = embedUrl || (host && videoId ? `https://${host}/embed/?v=${videoId}` : null);
  if (!src) {
    return (
      <div className="grid aspect-video place-items-center rounded-2xl border border-white/10 bg-white/[0.02] px-6 text-center text-sm text-slate-500">
        Cole o link de compartilhamento (ou o código de incorporar) do Panda nesta aula.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
      <div className="relative aspect-video">
        <iframe className="absolute inset-0 h-full w-full" src={src} title="Aula" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
      </div>
    </div>
  );
}
