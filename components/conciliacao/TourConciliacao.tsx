"use client";

import TourGuiado, { tourJaVisto, type PassoTour } from "@/components/TourGuiado";

/* Passos do laboratório de conciliação. O tour aqui ensina o método, porque o
   método é a ferramenta. */

const PASSOS: PassoTour[] = [
  {
    alvo: '[data-tour="conc-totais"]',
    titulo: "Passo 1: o total diz que existe problema",
    texto: "De um lado o extrato do sistema, do outro o que o painel mostra. A diferença entre eles é o tamanho da encrenca. Só isso, ainda não diz onde ela mora.",
  },
  {
    alvo: '[data-tour="conc-quebra"]',
    titulo: "Passo 2: a quebra diz onde ela mora",
    texto: "Quebre por uma dimensão de cada vez e veja em qual grupo a diferença se concentra. Achou o grupo, clique em isolar: tudo acima passa a falar só dele.",
  },
  {
    alvo: '[data-tour="conc-registros"]',
    titulo: "Passo 3: a linha diz o que é",
    texto: "Só agora vale a pena olhar lançamento a lançamento. A coluna de situação marca o que está só de um lado, com valor diferente ou com id repetido.",
  },
  {
    alvo: '[data-tour="conc-resposta"]',
    titulo: "O laudo",
    texto: "Diga de quanto é a divergência e qual é a causa. Se errar a causa, eu explico por que ela não fecha com o que está na tela: o sinal da diferença já elimina metade das hipóteses.",
  },
];

const CHAVE = "conciliacao:tour:v1";

export function tourConciliacaoJaVisto() { return tourJaVisto(CHAVE); }

export default function TourConciliacao({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  return <TourGuiado passos={PASSOS} chave={CHAVE} aberto={aberto} aoFechar={aoFechar} />;
}
