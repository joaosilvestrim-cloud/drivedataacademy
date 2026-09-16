"use client";

import TourGuiado, { tourJaVisto, type PassoTour } from "@/components/TourGuiado";

/* Passos do Decision Lab. O comportamento do tour mora em TourGuiado. */

const PASSOS: PassoTour[] = [
  {
    alvo: '[data-tour="abas"]',
    titulo: "Três telas, um jogo só",
    texto:
      "Empresa é onde você decide. Central de dados mostra o histórico que explica o problema. Relatório mede o resultado da sua estratégia.",
  },
  {
    alvo: '[data-tour="boletim"]',
    titulo: "Leia o boletim antes de decidir",
    texto:
      "Cada ciclo começa com um acontecimento do mercado. Ele muda a procura, então vale ler antes de mexer em preço e estoque.",
  },
  {
    alvo: '[data-tour="empresa"]',
    titulo: "A loja por dentro",
    texto:
      "Clique em um prédio ou use os botões das áreas. Cada área abre as decisões daquele setor. Dá para girar, aproximar e centralizar a cena.",
  },
  {
    alvo: '[data-tour="plano"]',
    titulo: "Monte o plano completo",
    texto:
      "Preço, divulgação, compra de estoque e equipe formam um plano único. Trocar de área não aplica nada, só muda o que você está editando.",
  },
  {
    alvo: '[data-tour="aplicar"]',
    titulo: "Aplicar plano avança 5 dias",
    texto:
      "Aqui o dinheiro é comprometido e a simulação roda. Confira o total antes: comprar não é vender, e o caixa precisa cobrir o próximo ciclo.",
  },
  {
    alvo: '[data-tour="linha"]',
    titulo: "Volte no tempo",
    texto:
      "Escolha um dia e investigue o que aconteceu naquele ciclo. É assim que você descobre qual decisão derrubou o resultado.",
  },
  {
    alvo: '[data-tour="partidas"]',
    titulo: "Compare estratégias",
    texto:
      "Você guarda até cinco partidas neste navegador. Comece outra com preço diferente e veja qual caminho paga melhor.",
  },
];

const CHAVE = "decision-lab:tour:v1";

export function tourDecisionJaVisto() { return tourJaVisto(CHAVE); }

export default function TourDecision({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  return <TourGuiado passos={PASSOS} chave={CHAVE} aberto={aberto} aoFechar={aoFechar} />;
}
