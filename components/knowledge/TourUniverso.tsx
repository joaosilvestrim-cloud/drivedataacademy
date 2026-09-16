"use client";

import TourGuiado, { tourJaVisto, type PassoTour } from "@/components/TourGuiado";

/* Passos do Knowledge Universe. O comportamento do tour mora em TourGuiado. */

const PASSOS: PassoTour[] = [
  {
    alvo: '[data-tour="universo-mapa"]',
    titulo: "Seu mapa de competências",
    texto:
      "Cada estrela é uma competência sua. Quanto mais evidência você acumula, mais forte ela brilha. Gire e aproxime para explorar.",
  },
  {
    alvo: '[data-tour="universo-modos"]',
    titulo: "Os modos do universo",
    texto:
      "Troque entre o mapa, as próximas conexões, o caminho de aprendizagem, as evidências práticas e as conquistas.",
  },
  {
    alvo: '[data-tour="universo-tempo"]',
    titulo: "A quarta dimensão",
    texto:
      "A linha do tempo mostra como você estava em qualquer data. Arraste para trás e veja seu conhecimento crescendo.",
  },
  {
    alvo: '[data-tour="universo-detalhe"]',
    titulo: "O detalhe de cada competência",
    texto:
      "Clique em uma estrela do mapa e abre um painel com a origem do seu domínio: curso concluído, exercício, desafio corrigido ou certificado. Experimente depois do tour.",
  },
  {
    alvo: '[data-tour="universo-ajuda"]',
    titulo: "Como o score é calculado",
    texto:
      "O cálculo é aberto e sem IA: evidência, qualidade e tempo. Este botão explica cada parte, quando bater a dúvida.",
  },
];

const CHAVE = "universo:tour:v1";

export function tourUniversoJaVisto() { return tourJaVisto(CHAVE); }

export default function TourUniverso({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  return <TourGuiado passos={PASSOS} chave={CHAVE} aberto={aberto} aoFechar={aoFechar} />;
}
