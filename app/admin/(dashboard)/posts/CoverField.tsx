"use client";

import { useState } from "react";

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60";

export default function CoverField({ defaultUrl }: { defaultUrl?: string | null }) {
  const [preview, setPreview] = useState<string | null>(defaultUrl ?? null);
  const [fileName, setFileName] = useState<string | null>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      setPreview(URL.createObjectURL(f));
      setFileName(f.name);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-300">Imagem de capa</label>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {/* Preview */}
        <div className="relative aspect-[16/9] w-full max-w-[220px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Prévia da capa" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-xs text-slate-500">
              Sem capa
            </div>
          )}
        </div>

        <div className="flex-1 space-y-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-brand-green/50 hover:text-brand-green">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Enviar imagem
            <input type="file" name="cover_file" accept="image/*" onChange={onPick} className="hidden" />
          </label>
          {fileName && <p className="text-xs text-slate-400">Selecionado: {fileName}</p>}
          <p className="text-xs text-slate-500">PNG, JPG, WEBP ou GIF — até 8 MB.</p>

          <div className="pt-1">
            <p className="mb-1.5 text-xs text-slate-500">Ou cole uma URL de imagem:</p>
            <input
              name="cover_url"
              placeholder="https://..."
              defaultValue={defaultUrl ?? ""}
              className={field}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
