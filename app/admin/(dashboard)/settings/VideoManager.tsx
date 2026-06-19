"use client";

import { useState } from "react";
import { saveVideos } from "./actions";

export default function VideoManager({ initial }: { initial: string[] }) {
  const [videos, setVideos] = useState<string[]>(initial.length ? initial : [""]);

  const update = (i: number, val: string) =>
    setVideos((v) => v.map((x, idx) => (idx === i ? val : x)));
  const add = () => setVideos((v) => [...v, ""]);
  const remove = (i: number) => setVideos((v) => v.filter((_, idx) => idx !== i));
  const move = (i: number, dir: number) =>
    setVideos((v) => {
      const j = i + dir;
      if (j < 0 || j >= v.length) return v;
      const copy = [...v];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const cleaned = videos.map((s) => s.trim()).filter(Boolean);

  return (
    <form action={saveVideos} className="max-w-2xl">
      <input type="hidden" name="videos_json" value={JSON.stringify(cleaned)} />

      <div className="glass rounded-2xl border border-white/8 p-6">
        <p className="text-sm font-medium text-slate-300">
          Vídeos do YouTube (seção “Conheça a Academy”)
        </p>
        <p className="mt-1 text-xs text-slate-500">
          A ordem abaixo é a ordem do carrossel no site. Use ↑ ↓ para reordenar.
        </p>

        <div className="mt-4 space-y-2.5">
          {videos.map((url, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-xs font-semibold text-slate-400">
                {i + 1}
              </span>
              <input
                value={url}
                onChange={(e) => update(i, e.target.value)}
                placeholder="https://youtu.be/XXXXXXXXXXX"
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60"
              />
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Subir"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-slate-300 transition-colors hover:border-white/30 hover:text-white disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === videos.length - 1}
                aria-label="Descer"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-slate-300 transition-colors hover:border-white/30 hover:text-white disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Remover"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-slate-300 transition-colors hover:border-red-400/40 hover:text-red-400"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={add}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-brand-green/50 hover:text-brand-green"
        >
          + Adicionar vídeo
        </button>

        <p className="mt-4 text-xs text-slate-500">
          Pode ser link “não listado”. Deixe a lista vazia para esconder a seção. Os vídeos
          tocam automaticamente, sem som (exigência dos navegadores).
        </p>
      </div>

      <div className="mt-5">
        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]"
        >
          Salvar
        </button>
      </div>
    </form>
  );
}
