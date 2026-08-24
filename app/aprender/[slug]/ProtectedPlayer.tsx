"use client";

import { useEffect, useState } from "react";

// Camada de dissuasão anti-cópia (não substitui DRM). Cobre/borra o vídeo quando
// a aba perde o foco, desativa menu de contexto, seleção e tenta limpar o print.
export default function ProtectedPlayer({ enabled = true, children }: { enabled?: boolean; children: React.ReactNode }) {
  const [covered, setCovered] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const onVis = () => setCovered(document.hidden);
    const onBlur = () => setCovered(true);
    const onFocus = () => setCovered(false);
    const onKey = (e: KeyboardEvent) => {
      // PrintScreen: tenta limpar a área de transferência (dificulta screenshot)
      if (e.key === "PrintScreen") {
        try { navigator.clipboard?.writeText(""); } catch {}
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("keyup", onKey);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("keyup", onKey);
    };
  }, [enabled]);

  if (!enabled) return <>{children}</>;

  return (
    <div
      className="relative select-none"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      style={{ WebkitUserSelect: "none", userSelect: "none" }}
    >
      <div className={covered ? "pointer-events-none blur-2xl brightness-50 transition" : "transition"}>{children}</div>
      {covered && (
        <div className="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-ink-900/95 px-6 text-center">
          <div>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="mx-auto text-brand-green"><path d="M12 1l9 4v6c0 5-3.8 9-9 11-5.2-2-9-6-9-11V5l9-4zM9.5 12l1.8 1.8L15 10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <p className="mt-3 text-sm font-medium text-white">Reprodução pausada</p>
            <p className="mt-1 text-xs text-slate-400">Volte para esta aba para continuar assistindo.</p>
          </div>
        </div>
      )}
    </div>
  );
}
