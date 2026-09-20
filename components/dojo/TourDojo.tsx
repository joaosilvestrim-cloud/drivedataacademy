"use client";

import TourGuiado, { tourJaVisto, type PassoTour } from "@/components/TourGuiado";

/* Quatro passos: a base é sua, o desafio pede número e fórmula, a correção
   separa os dois, e a trilha de SQL fica na Arena. */

const PASSOS: PassoTour[] = [
  {
    alvo: '[data-tour="dojo-base"]',
    titulo: "A base é sua",
    texto: "Essa tabela foi gerada a partir da sua conta. A do colega tem outros números, então a resposta precisa sair da sua leitura. A letra ao lado do cabeçalho é a coluna no Excel.",
  },
  {
    alvo: '[data-tour="dojo-desafio"]',
    titulo: "Duas respostas, não uma",
    texto: "O número mostra que você entendeu o problema. A fórmula mostra que você sabe escrever a solução na ferramenta. As duas contam.",
  },
  {
    alvo: '[data-tour="dojo-trilhas"]',
    titulo: "DAX, Excel e SQL",
    texto: "DAX e Excel ficam aqui, com a mesma base nas duas trilhas: é a melhor forma de ver como cada ferramenta resolve a mesma pergunta. O treino de SQL fica na Arena, com banco de verdade.",
  },
  {
    alvo: '[data-tour="dojo-desafio"]',
    titulo: "Errou? Melhor ainda",
    texto: "A correção diz o que faltou, mostra um jeito certo de escrever e explica por que aquele caminho é o que aguenta a base crescer. Dica e resposta estão sempre à mão, sem penalidade.",
  },
];

const CHAVE = "dojo:tour:v1";

export function tourDojoJaVisto() { return tourJaVisto(CHAVE); }

export default function TourDojo({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  return <TourGuiado passos={PASSOS} chave={CHAVE} aberto={aberto} aoFechar={aoFechar} />;
}
