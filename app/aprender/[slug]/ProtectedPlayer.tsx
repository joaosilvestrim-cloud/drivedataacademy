"use client";

import { useEffect, useState } from "react";

// Camada leve de dissuasão anti-cópia (não substitui DRM; DRM real é plano Panda).
// Desativa menu de contexto, seleção e arraste, e tenta limpar o PrintScreen.
//
// set/2026: a cobertura ao perder o foco foi DESLIGADA por padrão. Ela escutava
// `blur` do window, que dispara ao clicar em qualquer outra janela e também ao
// clicar DENTRO do iframe do player. Pior: o overlay dizia "Reprodução pausada"
// mas não pausava nada, só borrava — o vídeo seguia correndo por trás e o aluno
// perdia o trecho. Foi o que a Sumitomo relatou como aula "congelando e cortando
// conteúdo" e como impedimento de praticar junto com o professor.
//
// Para voltar a cobrir quando a aba fica realmente invisível, passe
// `coverWhenHidden`. O `blur` de janela não volta: ele quebra o uso legítimo.
export default function ProtectedPlayer({
  enabled = true,
  coverWhenHidden = false,
  children,
}: {
  enabled?: boolean;
  coverWhenHidden?: boolean;
  children: React.ReactNode;
}) {
  const [covered, setCovered] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    // PrintScreen: tenta limpar a área de transferência (dificulta screenshot)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        try { navigator.clipboard?.writeText(""); } catch {}
      }
    };
    window.addEventListener("keyup", onKey);

    let onVis: (() => void) | undefined;
    if (coverWhenHidden) {
      onVis = () => setCovered(document.hidden);
      document.addEventListener("visibilitychange", onVis);
    }

    return () => {
      window.removeEventListener("keyup", onKey);
      if (onVis) document.removeEventListener("visibilitychange", onVis);
    };
  }, [enabled, coverWhenHidden]);

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
            <p className="mt-3 text-sm font-medium text-white">Aula oculta</p>
            <p className="mt-1 text-xs text-slate-400">Volte para esta aba para continuar assistindo.</p>
          </div>
        </div>
      )}
    </div>
  );
}
