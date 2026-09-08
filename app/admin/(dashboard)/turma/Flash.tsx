"use client";

import { useEffect, useState } from "react";

// Aviso de salvo/erro que some sozinho e limpa o ?ok=1 da URL, para o recado não
// ficar preso na tela em todo refresh.
export default function Flash({ kind, message }: { kind: "ok" | "error"; message: string }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    window.history.replaceState(null, "", "/admin/turma");
    const t = setTimeout(() => setShow(false), kind === "ok" ? 4000 : 10000);
    return () => clearTimeout(t);
  }, [kind]);

  if (!show) return null;

  const tone =
    kind === "ok"
      ? "border-brand-green/30 bg-brand-green/10 text-brand-green"
      : "border-red-400/30 bg-red-400/10 text-red-200";

  return (
    <div className={`mt-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${tone}`} role="status">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0">
        {kind === "ok" ? (
          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M12 8v5m0 3.5h.01M10.3 3.9L2.5 17.4A2 2 0 004.2 20.4h15.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
      <span className="flex-1">{message}</span>
      <button type="button" onClick={() => setShow(false)} aria-label="Fechar" className="shrink-0 opacity-60 hover:opacity-100">
        ✕
      </button>
    </div>
  );
}
