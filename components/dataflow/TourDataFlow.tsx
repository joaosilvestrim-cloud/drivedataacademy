"use client";

import { useCallback, useEffect, useState } from "react";

/* Tour guiado do DataFlow Lab.

   O laboratório tem muita coisa na tela ao mesmo tempo, e quem entra pela
   primeira vez não sabe por onde começar. O tour acende uma área de cada vez e
   explica em uma frase o que ela faz. Roda sozinho na primeira visita e pode
   ser chamado de novo pelo botão do cabeçalho.

   O destaque é feito com uma sombra gigante em volta do retângulo do elemento:
   resolve o recorte sem precisar de biblioteca nem de canvas. */

export type PassoTour = { alvo: string; titulo: string; texto: string };

const PASSOS: PassoTour[] = [
  {
    alvo: '[data-tour="executar"]',
    titulo: "Tudo começa aqui",
    texto:
      "Este botão roda o fluxo inteiro: limpa, filtra, junta e executa o SQL. O caso de exemplo já vem carregado, então pode clicar sem medo.",
  },
  {
    alvo: '[data-tour="fontes"]',
    titulo: "1. De onde vêm os dados",
    texto:
      "Duas tabelas: pedidos e clientes. Use as do exemplo ou importe os seus CSVs. O arquivo fica no seu navegador, não sobe para lugar nenhum.",
  },
  {
    alvo: '[data-tour="receita"]',
    titulo: "2, 3 e 4. A receita do fluxo",
    texto:
      "Aqui você decide: remover clientes repetidos, manter só os pedidos que interessam e conectar as duas tabelas. Mudou algo, execute de novo e compare.",
  },
  {
    alvo: '[data-tour="cena"]',
    titulo: "O fluxo em 3D",
    texto:
      "Cada estação é uma etapa real do seu fluxo. Gire com o mouse, aproxime com a roda e clique em uma estação para inspecionar. Se preferir, troque para 2D no canto.",
  },
  {
    alvo: '[data-tour="timeline"]',
    titulo: "Reproduza a execução",
    texto:
      "A linha do tempo percorre as cinco etapas na ordem. Serve para enxergar onde o número muda, não para medir velocidade.",
  },
  {
    alvo: '[data-tour="inspecao"]',
    titulo: "A tabela de cada etapa",
    texto:
      "Veja a saída da etapa selecionada, abra a entrada para comparar e baixe o CSV. Na etapa Fontes, clique em um pedido para seguir o caminho dele até o fim.",
  },
  {
    alvo: '[data-tour="sql"]',
    titulo: "SQL sobre o resultado",
    texto:
      "Escreva SELECT sobre a tabela fluxo, que é a saída da junção. Roda dentro do seu navegador, em modo somente leitura.",
  },
  {
    alvo: '[data-tour="comparar"]',
    titulo: "Antes e agora",
    texto:
      "Cada execução guarda a anterior. É assim que você prova que a limpeza corrigiu o faturamento inflado, com número na tela.",
  },
  {
    alvo: '[data-tour="missao"]',
    titulo: "Missões",
    texto:
      "Um problema para resolver mexendo na configuração. Quando acertar, você registra a evidência no seu Knowledge Universe.",
  },
];

const CHAVE = "dataflow-lab:tour:v1";

export default function TourDataFlow({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
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
  const topoCartao = area ? (cabeAbaixo ? abaixo : Math.max(margem, area.top - alturaCartao - margem)) : margem;
  const esquerda = area
    ? Math.min(Math.max(margem, area.left), Math.max(margem, window.innerWidth - 380 - margem))
    : margem;

  function fechar(concluido: boolean) {
    if (concluido) { try { localStorage.setItem(CHAVE, "1"); } catch { /* navegador sem storage */ } }
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
          boxShadow: "0 0 0 9999px rgba(3, 8, 18, 0.78)",
          border: "2px solid #34e8a0",
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
export function tourJaVisto(): boolean {
  try { return localStorage.getItem(CHAVE) === "1"; } catch { return true; }
}
