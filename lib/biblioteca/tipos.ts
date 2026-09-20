/* Biblioteca de referência: o que o aluno abre no meio do expediente.

   A regra de ouro de cada verbete é a mesma: ele precisa responder três coisas
   em cinco segundos. Quando usar, o código para colar, e a armadilha que o
   pessoal cai. Verbete sem armadilha é só um trecho de código, e trecho de
   código o Google já tem.

   Nada aqui é decorativo: se um item não resolve um problema real de terça de
   manhã, ele não entra. */

export type Linguagem = "dax" | "sql" | "m" | "oracle" | "protheus";

export type Item = {
  id: string;
  linguagem: Linguagem;
  titulo: string;
  /** Quando usar, em uma frase, na língua de quem pede o número. */
  quando: string;
  codigo: string;
  /** Por que o código é assim, em uma ou duas frases. */
  explicacao: string;
  /** O erro que a maioria comete com esse padrão. */
  armadilha?: string;
  tags: string[];
  nivel: "básico" | "intermediário" | "avançado";
};

export const NOME_LINGUAGEM: Record<Linguagem, string> = {
  dax: "DAX",
  sql: "SQL",
  m: "Power Query",
  oracle: "Oracle",
  protheus: "Protheus",
};

/** Busca sem frescura: ignora acento e procura em tudo que é texto do verbete. */
export const semAcento = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/* `traduzir` faz a busca achar o verbete pelo texto que está na tela.

   Quem lê em inglês digita "running total", não "acumulado". Sem isso o
   acervo pareceria vazio para quem não escreve em português. O texto original
   continua na busca porque o código e os nomes de função são iguais nos três
   idiomas, e muita gente procura justamente por eles. */
export function filtrar(
  itens: Item[],
  busca: string,
  linguagem: Linguagem | "todas",
  tag: string,
  traduzir: (t: string) => string = (t) => t,
): Item[] {
  const q = semAcento(busca.trim());
  return itens.filter((i) => {
    if (linguagem !== "todas" && i.linguagem !== linguagem) return false;
    if (tag && !i.tags.includes(tag)) return false;
    if (!q) return true;
    const campos = [i.titulo, i.quando, i.explicacao, i.armadilha ?? ""];
    const tudo = [...campos, ...campos.map(traduzir), i.codigo, i.tags.join(" ")].join(" ");
    return semAcento(tudo).includes(q);
  });
}

/** As tags que existem de fato, com quantos verbetes cada uma tem. */
export function tagsDe(itens: Item[]): [string, number][] {
  const conta = new Map<string, number>();
  for (const i of itens) for (const t of i.tags) conta.set(t, (conta.get(t) || 0) + 1);
  return [...conta.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"));
}
