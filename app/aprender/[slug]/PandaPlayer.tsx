"use client";

import { useEffect, useRef } from "react";
import { markLessonDone } from "./actions";

// Player do Panda Video: embeda e marca a aula concluída ao atingir ~95% (progresso real).
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

  // Aceita: link de embed, código <iframe> colado, ou só o ID (usando o host do ambiente).
  function resolveSrc(raw: string, host: string | null): string | null {
    let v = (raw || "").trim();
    const iframe = v.match(/src=["']([^"']+)["']/i);
    if (iframe) v = iframe[1];
    if (/^https?:\/\//i.test(v)) return v; // já é a URL do player
    const idMatch = v.match(/[?&]v=([^&\s"']+)/);
    const id = idMatch ? idMatch[1] : v;
    return host ? `https://${host}/embed/?v=${id}` : null;
  }
  const src = resolveSrc(videoId, host);

  useEffect(() => {
    marked.current = false;
    function onMessage(e: MessageEvent) {
      const d: any = e.data;
      if (!d || typeof d !== "object") return;
      const ct = d.currentTime ?? d.data?.currentTime;
      const dur = d.duration ?? d.data?.duration;
      const ended = d.message === "panda_ended" || d.event === "ended";
      if (ended && !marked.current) {
        marked.current = true;
        markLessonDone(lessonId, courseId, slug, 100);
        return;
      }
      if (typeof ct === "number" && typeof dur === "number" && dur > 0) {
        const pct = ct / dur;
        if (pct >= 0.95 && !marked.current) {
          marked.current = true;
          markLessonDone(lessonId, courseId, slug, Math.round(pct * 100));
        }
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [lessonId, courseId, slug]);

  if (!src) {
    return (
      <div className="grid aspect-video place-items-center rounded-2xl border border-white/10 bg-white/[0.02] px-6 text-center text-sm text-slate-500">
        Cole o link de compartilhamento do Panda nesta aula (ou o código de incorporar). Se preferir usar só o ID, defina <code className="text-slate-400">NEXT_PUBLIC_PANDA_PLAYER_HOST</code>.
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
