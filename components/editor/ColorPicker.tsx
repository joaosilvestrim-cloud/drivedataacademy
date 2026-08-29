"use client";

import { useEffect, useRef, useState } from "react";
import { Palette } from "lucide-react";
import { useEditor } from "@/lib/editor/store";

export default function ColorPicker({
  valor,
  onChange,
  onStart,
  compact = false,
}: {
  valor: string;
  onChange: (v: string) => void;
  onStart?: () => void;
  compact?: boolean;
}) {
  const paleta = useEditor((s) => s.doc.paleta);
  const recentes = useEditor((s) => s.coresRecentes);
  const addRecente = useEditor((s) => s.addCorRecente);
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false); };
    window.addEventListener("pointerdown", fora);
    return () => window.removeEventListener("pointerdown", fora);
  }, [aberto]);

  const hex = /^#[0-9a-fA-F]{6}$/.test(valor) ? valor : "#000000";
  const aplicar = (v: string) => {
    onChange(v);
    if (/^#[0-9a-fA-F]{6}$/.test(v)) addRecente(v);
  };

  const swatches = (
    <div className="flex max-w-[176px] flex-wrap justify-end gap-1">
      <button
        onClick={() => aplicar("transparent")}
        title="Sem cor (transparente)"
        className="h-4 w-4 rounded border border-border"
        style={{ background: "repeating-conic-gradient(#cbd5e1 0% 25%, #fff 0% 50%) 50% / 6px 6px" }}
      />
      {(paleta ?? []).map((c, i) => (
        <button key={`p${i}`} onClick={() => aplicar(c)} title={c} className="h-4 w-4 rounded border border-border" style={{ background: c }} />
      ))}
      {recentes.map((c, i) => (
        <button key={`r${i}`} onClick={() => aplicar(c)} title={`${c} (recente)`} className="h-4 w-4 rounded border border-dashed border-muted" style={{ background: c }} />
      ))}
    </div>
  );

  // Modo compacto: uma linha só (largura total, encolhível); swatches em popover.
  if (compact) {
    return (
      <div ref={ref} className="relative flex w-full min-w-0 items-center gap-1" onPointerDown={onStart}>
        <input type="color" value={hex} onChange={(e) => aplicar(e.target.value)} className="h-7 w-7 shrink-0 cursor-pointer rounded border border-border bg-surface" />
        <input value={valor} onChange={(e) => onChange(e.target.value)} className="min-w-0 flex-1 rounded-md border border-border bg-surface px-1.5 py-1 font-mono text-[11px] focus:border-viz focus:outline-none" />
        <button onClick={() => setAberto((v) => !v)} title="Paleta" className={`flex h-7 w-6 shrink-0 items-center justify-center rounded border ${aberto ? "border-viz text-viz-dark" : "border-border text-muted hover:text-foreground"}`}>
          <Palette className="h-3.5 w-3.5" />
        </button>
        {aberto && (
          <div className="absolute right-0 top-8 z-30 rounded-lg border border-border bg-surface p-2 shadow-xl">
            {swatches}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5" onPointerDown={onStart}>
      <div className="flex items-center gap-1.5">
        <input type="color" value={hex} onChange={(e) => aplicar(e.target.value)} className="h-7 w-8 cursor-pointer rounded border border-border bg-surface" />
        <input value={valor} onChange={(e) => onChange(e.target.value)} className="w-24 rounded-md border border-border bg-surface px-2 py-1 font-mono text-xs focus:border-viz focus:outline-none" />
      </div>
      {swatches}
    </div>
  );
}
