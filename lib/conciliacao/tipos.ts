/* "O número não bate": os tipos do laboratório de conciliação.

   A ideia é simples e o efeito é grande: a plataforma gera duas fontes que
   deveriam fechar e planta uma divergência de uma classe conhecida. Como o
   defeito foi plantado por nós, a resposta é sabida sem ninguém escrever
   gabarito, e o diagnóstico do erro do aluno também.

   O que a ferramenta ensina não é achar o defeito por sorte. É o método:
   comparar o total, quebrar por dimensão até a diferença aparecer concentrada,
   isolar o grupo e só então olhar a linha. */

export type Lancamento = {
  id: string;
  data: string;
  filial: string;
  canal: string;
  status: string;
  produto: string;
  valor: number;
};

export type Dimensao = "mes" | "filial" | "canal" | "status" | "produto";

export const DIMENSOES: { chave: Dimensao; nome: string }[] = [
  { chave: "mes", nome: "Mês" },
  { chave: "filial", nome: "Filial" },
  { chave: "canal", nome: "Canal" },
  { chave: "status", nome: "Status" },
  { chave: "produto", nome: "Produto" },
];

export type ClasseDefeito =
  | "duplicata"
  | "status"
  | "orfao"
  | "devolucao"
  | "escopo"
  | "corte_data"
  | "arredondamento";

export type Causa = {
  classe: ClasseDefeito;
  nome: string;
  /** O que o aluno marca na resposta. */
  descricao: string;
  /** Como reconhecer no mundo real, mostrado depois da correção. */
  comoReconhecer: string;
  /** Assinatura da causa, usada para explicar por que não pode ser ela. */
  sinal: "painel_maior" | "painel_menor" | "qualquer";
  concentracao: Dimensao | "espalhado";
};

export const CAUSAS: Causa[] = [
  {
    classe: "duplicata",
    nome: "Registro duplicado na origem",
    descricao: "O extrato do sistema trouxe o mesmo lançamento mais de uma vez.",
    comoReconhecer: "O total da origem fica maior, e a diferença some quando você conta os ids distintos. Procure id repetido: é a primeira coisa a conferir sempre.",
    sinal: "painel_menor",
    concentracao: "espalhado",
  },
  {
    classe: "status",
    nome: "Filtro de status diferente",
    descricao: "O painel está contando lançamento que o sistema origem não considera, como cancelado.",
    comoReconhecer: "Quebre por status. A diferença vai aparecer inteira em um status que só existe de um lado. É o erro mais comum de relatório de vendas.",
    sinal: "painel_maior",
    concentracao: "status",
  },
  {
    classe: "orfao",
    nome: "Linhas perdidas na junção",
    descricao: "O painel perdeu lançamentos porque a chave não existia na tabela de dimensão.",
    comoReconhecer: "O painel fica menor e a diferença se concentra em uma filial ou produto que sumiu do painel. É junção interna comendo linha sem avisar.",
    sinal: "painel_menor",
    concentracao: "filial",
  },
  {
    classe: "devolucao",
    nome: "Devolução contada duas vezes",
    descricao: "O valor devolvido foi abatido na origem e abatido de novo no painel.",
    comoReconhecer: "O painel fica menor exatamente pelo valor das devoluções do período. Confira se o abatimento já não vinha pronto da origem.",
    sinal: "painel_menor",
    concentracao: "espalhado",
  },
  {
    classe: "escopo",
    nome: "Escopo diferente",
    descricao: "Um lado inclui uma filial, canal ou período que o outro não inclui.",
    comoReconhecer: "A diferença fica inteira em um grupo que existe de um lado só. Antes de caçar defeito, confirme se os dois lados estão falando do mesmo universo.",
    sinal: "qualquer",
    concentracao: "filial",
  },
  {
    classe: "corte_data",
    nome: "Corte de data ou fuso",
    descricao: "Lançamentos do fim do mês caíram no mês seguinte por causa do horário.",
    comoReconhecer: "O total do ano fecha, mas o mês não. Quebre por mês: a diferença aparece negativa em um mês e positiva no seguinte, com o mesmo valor.",
    sinal: "qualquer",
    concentracao: "mes",
  },
  {
    classe: "arredondamento",
    nome: "Arredondamento por linha",
    descricao: "Um lado arredonda cada linha e o outro arredonda só no total.",
    comoReconhecer: "A diferença é pequena e não se concentra em nenhum grupo. Parece desprezível, mas cresce com o volume e some quando você compara sem arredondar.",
    sinal: "qualquer",
    concentracao: "espalhado",
  },
];

export type Caso = {
  id: string;
  titulo: string;
  contexto: string;
  /* A pergunta muda com o caso, e isso é parte da lição.

     No corte de data o total do período fecha em zero: perguntar "qual a
     diferença total" teria resposta zero e ensinaria a coisa errada. O que se
     pergunta ali é quanto valor mudou de mês. */
  pergunta: string;
  origem: Lancamento[];
  painel: Lancamento[];
  /** Verdade do caso. A tela nunca mostra isto antes da resposta. */
  gabarito: {
    classe: ClasseDefeito;
    diferenca: number;
    /** Dimensão em que a diferença aparece concentrada, quando existe. */
    dimensao: Dimensao | "espalhado";
    /** Ids envolvidos no defeito. */
    registros: string[];
  };
};

export type Resposta = { valor: number; classe: ClasseDefeito | "" };

export type Veredito = {
  acertouValor: boolean;
  acertouClasse: boolean;
  titulo: string;
  detalhe: string;
  metodo: string;
};
