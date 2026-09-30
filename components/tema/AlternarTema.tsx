"use client";

import { useEffect, useState } from "react";
import { usarTraducao } from "@/lib/i18n/usarTraducao";

/* Claro ou escuro. A escolha fica neste navegador (localStorage "tema") e o
   script em app/layout.tsx aplica antes da primeira pintura, então a página
   não pisca branca ao abrir no escuro. */
export const CHAVE_TEMA = "tema";

export function aplicarTema(tema: "claro" | "escuro") {
  const raiz = document.documentElement;
  if (tema === "escuro") raiz.dataset.tema = "escuro";
  else delete raiz.dataset.tema;
  try {
    localStorage.setItem(CHAVE_TEMA, tema);
  } catch {}
}

export default function AlternarTema({ className = "", comRotulo = false }: { className?: string; comRotulo?: boolean }) {
  const tr = usarTraducao();
  const [escuro, setEscuro] = useState(false);
  useEffect(() => setEscuro(document.documentElement.dataset.tema === "escuro"), []);

  function alternar() {
    const proximo = escuro ? "claro" : "escuro";
    aplicarTema(proximo);
    setEscuro(!escuro);
  }

  const rotulo = escuro ? tr("Usar modo claro") : tr("Usar modo escuro");
  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={rotulo}
      title={rotulo}
      aria-pressed={escuro}
      className={`inline-flex items-center gap-2 rounded-full border border-tinta/15 text-slate-300 transition-colors hover:border-tinta/40 hover:text-tinta ${comRotulo ? "px-3 py-1.5 text-xs font-medium" : "h-9 w-9 justify-center"} ${className}`}
    >
      {escuro ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        </svg>
      )}
      {comRotulo && <span>{escuro ? tr("Modo claro") : tr("Modo escuro")}</span>}
    </button>
  );
}
