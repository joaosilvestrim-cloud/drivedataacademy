"use client";

import TourGuiado, { tourJaVisto, type PassoTour } from "@/components/TourGuiado";

/* Passos da Caixa-Preta. O comportamento do tour mora em TourGuiado. */

const PASSOS: PassoTour[] = [
  {
    alvo: '[data-tour="cp-estacoes"]',
    titulo: "Duas estações, um mecanismo",
    texto: "Primeiro o texto vira token. Depois o token vira modelo. É tudo o que existe dentro de uma IA que escreve, e aqui você opera as duas partes.",
  },
  {
    alvo: '[data-tour="cp-corpus"]',
    titulo: "Escolha o que a máquina vai aprender",
    texto: "Power BI, contrato ou receita de cozinha. Tudo aqui é treinado na hora, no seu navegador, sem API e sem custo. Trocar o corpus troca o que a máquina sabe.",
  },
  {
    alvo: '[data-tour="cp-texto"]',
    titulo: "Veja o seu texto virar token",
    texto: "Escreva qualquer coisa e olhe os pedaços. O espaço vem grudado na palavra seguinte, e cada dígito fica sozinho. É por isso que a IA erra CPF: ela nunca viu o número, viu onze pedaços.",
  },
  {
    alvo: '[data-tour="cp-prompt"]',
    titulo: "A temperatura não é mistério",
    texto: "Em zero, a máquina sempre escolhe o candidato campeão e vira um disco riscado. Alta, ela escolhe o improvável. É a mesma conta do modelo grande, e agora você vê o efeito.",
  },
  {
    alvo: '[data-tour="cp-candidatos"]',
    titulo: "Aqui mora a resposta",
    texto: "Esta lista é o modelo inteiro em ação: os tokens que podem vir agora e a chance de cada um. Não existe consulta a nenhuma verdade. Existe sorteio numa tabela de probabilidade.",
  },
  {
    alvo: '[data-tour="cp-saida"]',
    titulo: "E a alucinação, ao vivo",
    texto: "Peça para o corpus de cozinha falar de modelagem. Quando o selo ficar vermelho, a máquina perdeu o contexto e passou a chutar pelo que é comum. Repare que ela não hesita e não avisa. É esse o comportamento.",
  },
];

const CHAVE = "caixapreta:tour:v1";

export function tourCaixaPretaJaVisto() { return tourJaVisto(CHAVE); }

export default function TourCaixaPreta({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  return <TourGuiado passos={PASSOS} chave={CHAVE} aberto={aberto} aoFechar={aoFechar} />;
}
