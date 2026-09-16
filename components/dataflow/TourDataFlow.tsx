"use client";

import TourGuiado, { tourJaVisto, type PassoTour } from "@/components/TourGuiado";

/* Passos do DataFlow Lab. O comportamento do tour mora em TourGuiado. */

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

export function tourDataFlowJaVisto() { return tourJaVisto(CHAVE); }

export default function TourDataFlow({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  return <TourGuiado passos={PASSOS} chave={CHAVE} aberto={aberto} aoFechar={aoFechar} />;
}
