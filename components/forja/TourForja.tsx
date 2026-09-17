"use client";

import TourGuiado, { tourJaVisto, type PassoTour } from "@/components/TourGuiado";

/* Passos da Forja DAX. O comportamento do tour mora em TourGuiado. */

const PASSOS: PassoTour[] = [
  {
    alvo: '[data-tour="forja-modelo"]',
    titulo: "Diga como o seu modelo se chama",
    texto: "O código sai com o nome das suas tabelas, não com nome de exemplo. Trocar aqui reescreve tudo do lado direito na hora.",
  },
  {
    alvo: '[data-tour="forja-intervalo"]',
    titulo: "De quando até quando",
    texto: "Pela tabela de fatos, o calendário acompanha os seus dados sozinho. Por anos fixos, você manda. De qualquer jeito ele fecha em 1º de janeiro e 31 de dezembro, que é o que a inteligência de tempo do DAX exige.",
  },
  {
    alvo: '[data-tour="forja-fiscal"]',
    titulo: "Ano fiscal, se a sua empresa tiver",
    texto: "Escolhendo um mês diferente de janeiro entram as colunas fiscais e o acumulado do ano passa a fechar no mês certo. É o detalhe que quase todo modelo erra.",
  },
  {
    alvo: '[data-tour="forja-feriados"]',
    titulo: "Feriado móvel calculado, não decorado",
    texto: "Carnaval, Sexta-feira Santa e Corpus Christi andam com a Páscoa. A Forja calcula a Páscoa de cada ano, então a coluna de dia útil fica certa.",
  },
  {
    alvo: '[data-tour="forja-medidas"]',
    titulo: "As medidas de tempo do seu indicador",
    texto: "Diga o nome da sua medida e marque o que precisa: acumulado no ano, comparação com o ano anterior, média móvel. Sai tudo escrito em cima dela.",
  },
  {
    alvo: '[data-tour="forja-codigo"]',
    titulo: "Copie e cole",
    texto: "Cada aba é um bloco pronto, com comentário explicando a decisão. Embaixo está a ordem em que colar no Power BI, incluindo marcar a tabela como tabela de datas.",
  },
];

const CHAVE = "forja:tour:v1";

export function tourForjaJaVisto() { return tourJaVisto(CHAVE); }

export default function TourForja({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  return <TourGuiado passos={PASSOS} chave={CHAVE} aberto={aberto} aoFechar={aoFechar} />;
}
