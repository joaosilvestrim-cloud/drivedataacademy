"use client";

import { useCallback, useEffect, useState } from "react";

/* Tour guiado, usado pelas três ferramentas.

   As ferramentas têm muita coisa na tela ao mesmo tempo, e quem entra pela
   primeira vez não sabe por onde começar. O tour acende uma área de cada vez e
   explica em uma frase o que ela faz. Roda sozinho na primeira visita e pode
   ser chamado de novo pelo botão do cabeçalho.

   O destaque é feito com uma sombra gigante em volta do retângulo do elemento:
   resolve o recorte sem precisar de biblioteca nem de canvas. */

export type PassoTour = { alvo: string; titulo: string; texto: string };


export default function TourGuiado({ passos: PASSOS, chave, aberto, aoFechar }: { passos: PassoTour[]; chave: string; aberto: boolean; aoFechar: () => void }) {
  const [passo, setPasso] = useState(0);
  const [area, setArea] = useState<DOMRect | null>(null);

  /* Mede na hora e remede enquanto o scroll suave termina. Uma medição só
     deixava o destaque no lugar do passo anterior. */
  const medir = useCallback(() => {
    const alvo = document.querySelector(PASSOS[passo]?.alvo || "");
    if (!alvo) { setArea(null); return; }
    setArea(alvo.getBoundingClientRect());
    alvo.scrollIntoView({ block: "center", behavior: "smooth" });
    const tempos = [120, 320, 620].map((ms) => window.setTimeout(() => setArea(alvo.getBoundingClientRect()), ms));
    return () => tempos.forEach(window.clearTimeout);
  }, [passo]);

  // Reabrir pelo botão do cabeçalho recomeça do primeiro passo.
  useEffect(() => { if (aberto) setPasso(0); }, [aberto]);
  useEffect(() => { if (!aberto) return; return medir(); }, [aberto, medir]);

  useEffect(() => {
    if (!aberto) return;
    const atualiza = () => setArea(document.querySelector(PASSOS[passo]?.alvo || "")?.getBoundingClientRect() ?? null);
    const teclado = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
      if (e.key === "ArrowRight") setPasso((p) => Math.min(PASSOS.length - 1, p + 1));
      if (e.key === "ArrowLeft") setPasso((p) => Math.max(0, p - 1));
    };
    window.addEventListener("resize", atualiza);
    window.addEventListener("scroll", atualiza, true);
    window.addEventListener("keydown", teclado);
    return () => {
      window.removeEventListener("resize", atualiza);
      window.removeEventListener("scroll", atualiza, true);
      window.removeEventListener("keydown", teclado);
    };
  }, [aberto, passo, aoFechar]);

  if (!aberto) return null;
  const atual = PASSOS[passo];
  const ultimo = passo === PASSOS.length - 1;

  // O cartão fica abaixo do destaque, ou acima quando não cabe.
  const margem = 16;
  const alturaCartao = 210;
  const abaixo = area ? area.bottom + margem : 0;
  const cabeAbaixo = area ? abaixo + alturaCartao < window.innerHeight : true;
  const topoCartao = area ? (cabeAbaixo ? abaixo : Math.max(margem, area.top - alturaCartao - margem)) : Math.max(margem, window.innerHeight / 2 - alturaCartao / 2);
  const esquerda = area
    ? Math.min(Math.max(margem, area.left), Math.max(margem, window.innerWidth - 380 - margem))
    : Math.max(margem, window.innerWidth / 2 - 176);

  function fechar(concluido: boolean) {
    if (concluido) { try { localStorage.setItem(chave, "1"); } catch { /* navegador sem storage */ } }
    aoFechar();
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80 }} role="dialog" aria-label={`Tour do laboratório, passo ${passo + 1} de ${PASSOS.length}`}>
      {/* Escurece a tela e abre o buraco por cima do elemento do passo */}
      <div
        onClick={() => fechar(false)}
        style={{
          position: "absolute",
          top: area ? area.top - 8 : 0,
          left: area ? area.left - 8 : 0,
          width: area ? area.width + 16 : 0,
          height: area ? area.height + 16 : 0,
          borderRadius: 16,
          // Sem alvo na tela, a máscara cobre tudo e o cartão vai para o centro.
          boxShadow: area ? "0 0 0 9999px rgba(3, 8, 18, 0.78)" : "0 0 0 9999px rgba(3, 8, 18, 0.86)",
          border: area ? "2px solid #34e8a0" : "none",
          transition: "all .25s ease",
          pointerEvents: "auto",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: topoCartao,
          left: esquerda,
          width: "min(22rem, calc(100vw - 2rem))",
          background: "#0f172a",
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 18,
          padding: "18px 18px 16px",
          boxShadow: "0 30px 60px -20px rgba(0,0,0,.8)",
          color: "#e2e8f0",
        }}
      >
        <p style={{ margin: 0, fontSize: 12, letterSpacing: ".12em", color: "#34e8a0", fontWeight: 700 }}>
          PASSO {passo + 1} DE {PASSOS.length}
        </p>
        <h3 style={{ margin: "8px 0 6px", fontSize: 19, fontWeight: 700, color: "#fff" }}>{atual.titulo}</h3>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#cbd5e1" }}>{atual.texto}</p>

        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => (ultimo ? fechar(true) : setPasso((p) => p + 1))}
            style={{ background: "#34e8a0", color: "#04140d", fontWeight: 700, borderRadius: 10, padding: "9px 16px", fontSize: 14 }}
          >
            {ultimo ? "Começar a usar" : "Próximo"}
          </button>
          {passo > 0 && (
            <button type="button" onClick={() => setPasso((p) => p - 1)} style={{ color: "#94a3b8", fontSize: 13 }}>
              voltar
            </button>
          )}
          <button type="button" onClick={() => fechar(true)} style={{ marginLeft: "auto", color: "#64748b", fontSize: 13 }}>
            pular tour
          </button>
        </div>
      </div>
    </div>
  );
}

// Primeira visita: o tour abre sozinho. Depois só pelo botão do cabeçalho.
export function tourJaVisto(chave: string): boolean {
  try { return localStorage.getItem(chave) === "1"; } catch { return true; }
}
