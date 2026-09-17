"use client";

import TourGuiado, { tourJaVisto, type PassoTour } from "@/components/TourGuiado";

/* Passos da Arena SQL. O comportamento do tour mora em TourGuiado. */

const PASSOS: PassoTour[] = [
  {
    alvo: '[data-tour="arena-desafios"]',
    titulo: "Seis desafios, do básico ao que cai em entrevista",
    texto: "Agregação, junção, nulo, tempo, subconsulta e função de janela. Pode fazer em qualquer ordem. O visto verde marca o que você já resolveu.",
  },
  {
    alvo: '[data-tour="arena-enunciado"]',
    titulo: "A pergunta vem em português de negócio",
    texto: "Ninguém na empresa vai te pedir um LEFT JOIN. Vão pedir a lista de clientes incluindo quem nunca comprou. Traduzir isso é o exercício.",
  },
  {
    alvo: '[data-tour="arena-editor"]',
    titulo: "Escreva aqui e execute de verdade",
    texto: "É um banco SQLite rodando no seu navegador. A sua consulta é executada mesmo, não comparada com texto. Ctrl e Enter executam.",
  },
  {
    alvo: '[data-tour="arena-executar"]',
    titulo: "A correção sai na hora",
    texto: "Se o resultado bater com o esperado, acertou, mesmo que o caminho tenha sido outro. Se não bater, eu digo em qual armadilha você caiu, e não só que errou.",
  },
  {
    alvo: '[data-tour="arena-dicionario"]',
    titulo: "As tabelas estão aqui do lado",
    texto: "Nome de coluna, tipo e as pegadinhas da base: pedido apontando para cliente que não existe, desconto vazio, pedido cancelado no meio.",
  },
  {
    alvo: '[data-tour="arena-progresso"]',
    titulo: "A sua base é só sua",
    texto: "Os números foram sorteados a partir do seu cadastro, então a resposta do colega não fecha aqui. Quer treinar de novo com outros números? Nova base.",
  },
];

const CHAVE = "arena:tour:v1";

export function tourArenaJaVisto() { return tourJaVisto(CHAVE); }

export default function TourArena({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  return <TourGuiado passos={PASSOS} chave={CHAVE} aberto={aberto} aoFechar={aoFechar} />;
}
