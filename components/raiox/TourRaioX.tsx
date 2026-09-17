"use client";

import TourGuiado, { tourJaVisto, type PassoTour } from "@/components/TourGuiado";

/* Passos do Raio-X do Dashboard. O comportamento mora em TourGuiado.

   Os três primeiros passos existem antes de qualquer análise. Os dois últimos
   só aparecem depois que o laudo sai, e o tour dá conta disso: quando o alvo
   não está na tela, o cartão se centraliza e o texto continua fazendo sentido. */

const PASSOS: PassoTour[] = [
  {
    alvo: '[data-tour="raiox-upload"]',
    titulo: "Jogue o seu arquivo aqui",
    texto: "Arraste o .pbix ou escolha pelo botão. O arquivo é aberto dentro do seu navegador e não sobe para servidor nenhum: o que fica guardado é só o laudo.",
  },
  {
    alvo: '[data-tour="raiox-pbit"]',
    titulo: "Quer o laudo completo? Mande o .pbit",
    texto: "No .pbix o modelo vem compactado e não dá para ler. Exportando como modelo do Power BI, o Raio-X passa a auditar também relacionamentos, colunas calculadas e cada medida. E o template vai sem os seus dados.",
  },
  {
    alvo: '[data-tour="raiox-nota"]',
    titulo: "A nota, e o que ela quer dizer",
    texto: "Uma nota geral e uma por dimensão. Ela nunca passa da pior dimensão mais doze, então relatório bonito por fora não esconde modelo quebrado por dentro.",
  },
  {
    alvo: '[data-tour="raiox-achados"]',
    titulo: "Cada achado tem nome e sobrenome",
    texto: "Qual página, qual visual, qual medida. Depois o porquê aquilo importa e o que fazer para resolver. Nada de conselho genérico.",
  },
  {
    alvo: '[data-tour="raiox-historico"]',
    titulo: "A curva é o que interessa",
    texto: "Cada laudo fica no seu histórico. Corrija o que apareceu, suba o mesmo arquivo de novo e veja a nota subir. É assim que isso vira aprendizado, e não só diagnóstico.",
  },
];

const CHAVE = "raiox:tour:v1";

export function tourRaioXJaVisto() { return tourJaVisto(CHAVE); }

export default function TourRaioX({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  return <TourGuiado passos={PASSOS} chave={CHAVE} aberto={aberto} aoFechar={aoFechar} />;
}
