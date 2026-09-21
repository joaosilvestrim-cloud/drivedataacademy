"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";

import { useEffect, useRef } from "react";
import { markLessonDone } from "./actions";
import AvisoLegendas from "@/components/AvisoLegendas";

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
  legendas,
}: {
  videoId: string;
  host: string | null;
  lessonId: string;
  courseId: string;
  slug: string;
  legendas?: string[] | null;
}) {
  const tr = usarTraducao();
  const marked = useRef(false);
  const watched = useRef(0);
  const lastT = useRef<number | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  // Retenção: trechos de 5% vistos, tempo assistido desde o último envio e até onde chegou.
  const buckets = useRef<string[]>(Array(20).fill("0"));
  const pendente = useRef(0);
  const maxPos = useRef(0);
  const duracao = useRef(0);
  const novaSessao = useRef(true);
  const src = resolveSrc(videoId, host);

  useEffect(() => {
    marked.current = false;
    watched.current = 0;
    lastT.current = null;
    buckets.current = Array(20).fill("0");
    pendente.current = 0;
    maxPos.current = 0;
    duracao.current = 0;
    novaSessao.current = true;

    /* Envia o que foi assistido. Sai a cada 20s enquanto o vídeo roda e uma
       última vez quando o aluno troca de aula ou fecha a aba (sendBeacon, que
       o navegador entrega mesmo com a página saindo). */
    function enviar(saindo = false) {
      if (!duracao.current || (!pendente.current && !buckets.current.includes("1"))) return;
      const corpo = JSON.stringify({
        lessonId, courseId, duration: duracao.current, watched: pendente.current,
        maxPos: maxPos.current, buckets: buckets.current.join(""), nova: novaSessao.current,
      });
      pendente.current = 0;
      novaSessao.current = false;
      try {
        if (saindo && navigator.sendBeacon) navigator.sendBeacon("/api/video-progresso", new Blob([corpo], { type: "application/json" }));
        else fetch("/api/video-progresso", { method: "POST", body: corpo, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
      } catch {}
    }
    const intervalo = window.setInterval(() => enviar(false), 20000);
    const aoSair = () => enviar(true);
    window.addEventListener("pagehide", aoSair);

    function done(pct: number) {
      if (marked.current) return;
      marked.current = true;
      markLessonDone(lessonId, courseId, slug, Math.min(100, Math.max(0, Math.round(pct)))).then(result=>{if(!result.ok)marked.current=false;}).catch(()=>{marked.current=false;});
    }

    function onMessage(e: MessageEvent) {
      if(!src||e.source!==frame.current?.contentWindow)return;
      try {if(e.origin!==new URL(src).origin)return;}catch{return;}
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
          pendente.current += ct - lastT.current;
          buckets.current[Math.min(19, Math.floor((ct / dur) * 20))] = "1";
        }
        duracao.current = dur;
        maxPos.current = Math.max(maxPos.current, ct);
        lastT.current = ct;
        if (watched.current / dur >= 0.9) done((watched.current / dur) * 100);
      }
    }

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("pagehide", aoSair);
      window.clearInterval(intervalo);
      enviar(true);
    };
  }, [lessonId, courseId, slug, src]);

  if (!src) {
    return (
      <div className="grid aspect-video place-items-center rounded-2xl border border-white/10 bg-white/[0.02] px-6 text-center text-sm text-slate-500">
        {tr("Cole o link de compartilhamento (ou o código de incorporar) do Panda nesta aula.")}
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
        <div className="relative aspect-video">
          <iframe
            ref={frame}
            className="absolute inset-0 h-full w-full"
            src={src}
            title={tr("Aula")}
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      </div>
      <AvisoLegendas idiomas={legendas} />
    </>
  );
}
