"use client";

import { useEffect, useRef } from "react";
import { markLessonDone } from "./actions";

// Resolve a URL de embed a partir de iframe/URL/ID colado.
function resolveSrc(raw: string, host: string | null): string | null {
  let v = (raw || "").trim();
  const iframe = v.match(/src=["']([^"']+)["']/i);
  if (iframe) v = iframe[1];
  if (/^https?:\/\//i.test(v)) return v;
  const idMatch = v.match(/[?&]v=([^&\s"']+)/);
  const id = idMatch ? idMatch[1] : v;
  return host ? `https://${host}/embed/?v=${id}` : null;
}

export default function PandaPlayer({
  videoId,
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
  const src = resolveSrc(videoId, host);

  useEffect(() => {
    marked.current = false;
    watched.current = 0;
    lastT.current = null;

    function done(pct: number) {
      if (marked.current) return;
      marked.current = true;
      markLessonDone(lessonId, courseId, slug, Math.min(100, Math.max(0, Math.round(pct))));
    }

    function onMessage(e: MessageEvent) {
      let d: any = e.data;
      if (typeof d === "string") { try { d = JSON.parse(d); } catch { return; } }
      if (!d || typeof d !== "object") return;
      const msg = d.message || d.event;
      const ct = d.currentTime ?? d.data?.currentTime;
      const dur = d.duration ?? d.data?.duration;
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

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [lessonId, courseId, slug]);

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
        <iframe
          className="absolute inset-0 h-full w-full"
          src={src}
          title="Aula"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    </div>
  );
}
