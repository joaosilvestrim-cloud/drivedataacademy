"use client";

import TourGuiado, { tourJaVisto, type PassoTour } from "@/components/TourGuiado";

/* O tour da Biblioteca é curto de propósito: quem chega aqui está com pressa.
   Quatro passos, um por área, e o aluno já sabe consultar sozinho. */

const PASSOS: PassoTour[] = [
  {
    alvo: '[data-tour="bib-busca"]',
    titulo: "Busque pelo problema",
    texto: "Escreva o que está acontecendo, não o nome da função: “não bate”, “duplicata”, “mês anterior”. A busca ignora acento e responde a cada tecla. A barra / traz o cursor para cá de qualquer lugar da página.",
  },
  {
    alvo: '[data-tour="bib-lista"]',
    titulo: "A lista já responde a primeira pergunta",
    texto: "Cada linha traz o título e o quando usar. Muitas vezes isso basta para você saber se é o verbete certo. As setas do teclado andam na lista.",
  },
  {
    alvo: '[data-tour="bib-codigo"]',
    titulo: "Copie e volte ao trabalho",
    texto: "O código está pronto para colar. Os nomes das tabelas são os do exemplo: troque pelos seus e pronto.",
  },
  {
    alvo: '[data-tour="bib-armadilha"]',
    titulo: "Leia a armadilha antes de colar",
    texto: "Essa é a parte que o Google não te dá. É o erro que a maioria comete com esse padrão exato, e lê em dez segundos. Verbete sem armadilha aqui não entra.",
  },
];

const CHAVE = "biblioteca:tour:v1";

export function tourBibliotecaJaVisto() { return tourJaVisto(CHAVE); }

export default function TourBiblioteca({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  return <TourGuiado passos={PASSOS} chave={CHAVE} aberto={aberto} aoFechar={aoFechar} />;
}
