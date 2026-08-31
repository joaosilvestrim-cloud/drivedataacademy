"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60";

export default function CoverUpload({ initialUrl }: { initialUrl?: string | null }) {
  const [url, setUrl] = useState(initialUrl || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Envie uma imagem (JPG ou PNG)."); return; }
    setUploading(true);
    setError("");
    try {
      const supabase = createClient();
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `course-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("covers").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("covers").getPublicUrl(path);
      setUrl(data.publicUrl + `?v=${Date.now()}`);
    } catch {
      setError("Não consegui subir a imagem. Rode o SQL de permissão do bucket 'covers' (te passei) e tente de novo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">Imagem de capa</label>
      <div className="flex items-start gap-4">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Capa" className="h-20 w-32 shrink-0 rounded-lg border border-white/10 object-cover" />
        ) : (
          <div className="grid h-20 w-32 shrink-0 place-items-center rounded-lg border border-dashed border-white/15 text-xs text-slate-500">sem capa</div>
        )}
        <div className="flex-1 space-y-2">
          <input type="file" accept="image/*" onChange={onFile} disabled={uploading} className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-brand-green file:to-brand-blue file:px-4 file:py-2 file:text-sm file:font-semibold file:text-ink-900 hover:file:opacity-90 disabled:opacity-50" />
          {uploading && <p className="text-xs text-brand-teal">Enviando imagem...</p>}
          {error && <p className="text-xs text-red-300">{error}</p>}
          <p className="text-xs text-slate-500">Recomendado 1600×900 (16:9). Sobe direto do navegador, sem limite de tamanho do servidor.</p>
          <input name="cover_url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="ou cole uma URL de imagem" className={field} />
        </div>
      </div>
    </div>
  );
}
