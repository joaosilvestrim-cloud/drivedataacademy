"use client";

import { useState } from "react";

const field =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";

function youtubeId(v: string): string | null {
  const m = v.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/) || v.match(/^([\w-]{11})$/);
  return m ? m[1] : null;
}

function pandaSrc(raw: string): string | null {
  let v = (raw || "").trim();
  const iframe = v.match(/src=["']([^"']+)["']/i);
  if (iframe) v = iframe[1];
  if (/^https?:\/\/[^ ]*pandavideo[^ ]*\/embed/i.test(v)) return v;
  return null;
}

export default function VideoField({ defaultProvider, defaultValue }: { defaultProvider: string; defaultValue: string }) {
  const [provider, setProvider] = useState(defaultProvider || "youtube");
  const [value, setValue] = useState(defaultValue || "");

  let preview: string | null = null;
  if (value.trim()) {
    if (provider === "panda") preview = pandaSrc(value);
    else {
      const id = youtubeId(value.trim());
      preview = id ? `https://www.youtube.com/embed/${id}` : null;
    }
  }

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 5h11a1 1 0 011 1v3l4-2v10l-4-2v3a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Vídeo (para aulas do tipo Vídeo)
      </p>
      <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
        <select name="video_provider" value={provider} onChange={(e) => setProvider(e.target.value)} className={`${field} [&>option]:bg-ink-900`}>
          <option value="youtube">YouTube</option>
          <option value="panda">Panda Video</option>
        </select>
        <input name="video_id" value={value} onChange={(e) => setValue(e.target.value)} placeholder={provider === "panda" ? "Cole o código <iframe> ou o link do Panda" : "Link ou ID do YouTube"} className={field} />
      </div>
      <p className="mt-1.5 text-[0.7rem] text-slate-500">
        {provider === "panda" ? "Panda: abra o vídeo → Compartilhar → Copiar código embed e cole aqui. Não precisa de API." : "YouTube: cole o link do vídeo."}
      </p>

      {/* Preview */}
      <div className="mt-3">
        <p className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">Pré-visualização</p>
        {preview ? (
          <div className="overflow-hidden rounded-lg border border-white/10 bg-black">
            <div className="relative aspect-video">
              <iframe key={preview} className="absolute inset-0 h-full w-full" src={preview} title="Preview" allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
            </div>
          </div>
        ) : (
          <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] text-center text-xs text-slate-500">
            {value.trim() ? "Não reconheci o link. Confira se colou o embed/link certo." : "Cole o link do vídeo acima para ver o preview aqui."}
          </div>
        )}
      </div>
    </div>
  );
}
