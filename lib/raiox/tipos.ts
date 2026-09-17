/* Raio-X do Dashboard: o que sai do arquivo e o que vira laudo.

   Os tipos ficam fora do extrator e das regras de propósito: o extrator lê o
   arquivo, as regras leem esta estrutura. Uma coisa não conhece a outra, então
   dá para trocar o leitor (pbix legado, pbix novo, pbit) sem tocar nas regras. */

export type Campo = {
  /** Tabela de origem, como o relatório chama. */
  tabela: string;
  /** Nome do campo ou da medida. */
  campo: string;
  /** "Medidas.Receita", usado para comparar repetição entre visuais. */
  ref: string;
  medida: boolean;
};

export type Visual = {
  id: string;
  tipo: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
  /** Campos por papel do visual (Values, Category, Y, Series...). */
  campos: Campo[];
  /** O autor escreveu um título, ou deixou o automático do Power BI. */
  tituloProprio: boolean;
  tituloVisivel: boolean;
  temFiltroProprio: boolean;
};

export type Pagina = {
  id: string;
  nome: string;
  largura: number;
  altura: number;
  visuais: Visual[];
};

export type Relatorio = {
  arquivo: string;
  /** "pbir" é o formato novo do .pbix, "layout" o antigo, "pbit" traz o modelo. */
  formato: "pbir" | "layout" | "pbit";
  paginas: Pagina[];
  /** Nomes das tabelas do modelo, quando o arquivo entrega. */
  tabelas: string[];
  temVisualCustomizado: boolean;
  /** Medidas com DAX, só quando o arquivo é .pbit. */
  medidas: { tabela: string; nome: string; dax: string; formato: string | null }[];
  relacionamentos: {
    de: string;
    para: string;
    deColuna: string;
    paraColuna: string;
    cruzado: string;
    ativo: boolean;
    cardinalidade: string;
  }[];
  colunasCalculadas: { tabela: string; nome: string; dax: string }[];
  /** Tabela marcada como tabela de datas no modelo. */
  temTabelaDeDatas: boolean;
};

export type Severidade = "alta" | "media" | "baixa";
export type Dimensao = "estrutura" | "design" | "clareza" | "modelo" | "dax";

export type Achado = {
  regra: string;
  dimensao: Dimensao;
  severidade: Severidade;
  /** O que foi encontrado, com nome e sobrenome. */
  titulo: string;
  /** Onde: página, visual, medida. */
  onde: string;
  /** Por que isso importa, em uma frase. */
  porque: string;
  /** O que fazer para resolver. */
  comoArrumar: string;
};

export type NotaDimensao = {
  dimensao: Dimensao;
  nota: number;
  achados: number;
  /** Falso quando o arquivo não trouxe matéria-prima suficiente para julgar. */
  completa: boolean;
};

export type Laudo = {
  arquivo: string;
  formato: Relatorio["formato"];
  /** .pbix não carrega o modelo: o laudo sai sem modelo e sem DAX. */
  parcial: boolean;
  nota: number;
  notas: NotaDimensao[];
  achados: Achado[];
  resumo: { paginas: number; visuais: number; tabelas: number; medidas: number };
};

export const NOME_DIMENSAO: Record<Dimensao, string> = {
  estrutura: "Estrutura",
  design: "Design",
  clareza: "Clareza",
  modelo: "Modelo",
  dax: "DAX",
};

/* Peso de cada achado na nota da dimensão. Uma nota que cai de 100 para 0 com
   dois achados não ensina nada: assusta. Estes pesos deixam um relatório com
   problemas sérios na casa dos 50, e um relatório limpo acima de 90. */
export const PESO: Record<Severidade, number> = { alta: 14, media: 7, baixa: 3 };
