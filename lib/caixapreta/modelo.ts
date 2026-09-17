import { codificar, decodificar, type Vocabulario } from "./tokenizador";

/* O modelo de linguagem da Caixa-Preta.

   É um modelo de n-grama: olha os últimos tokens e conta, no corpus, quais
   tokens costumam vir depois. Só isso. Nenhuma rede neural, nenhuma API.

   Parece pouco perto de um GPT, e é. Mas o mecanismo que interessa é o mesmo, e
   aqui ele fica visível: não existe consulta a nenhuma verdade, existe uma
   tabela de "o que costuma vir depois" e um sorteio. Quando o aluno vê a lista
   de candidatos e a probabilidade de cada um, ele para de achar que o modelo
   sabe alguma coisa, e passa a entender de onde vem a alucinação.

   A temperatura também fica honesta aqui, porque é a mesma conta: probabilidade
   elevada a 1/T. Em zero, o modelo sempre pega o campeão e se repete. Alto, ele
   escolhe o improvável e delira com a mesma confiança. */

export type Modelo = {
  ordem: number;
  vocab: Vocabulario;
  /** contexto (ids juntos por vírgula) -> token seguinte -> quantas vezes. */
  tabela: Map<string, Map<number, number>>;
  /** Frequência de cada token no corpus inteiro, sem olhar contexto nenhum. */
  geral: Map<number, number>;
  totalTokens: number;
  contextos: number;
};

export type Candidato = { id: number; token: string; contagem: number; probabilidade: number };

const chave = (ids: number[]) => ids.join(",");

export function treinarModelo(corpus: string, vocab: Vocabulario, ordem = 3): Modelo {
  const ids = codificar(corpus, vocab);
  const tabela = new Map<string, Map<number, number>>();
  const geral = new Map<number, number>();
  const contexto = Math.max(1, ordem - 1);

  for (let i = 0; i < ids.length; i++) {
    geral.set(ids[i], (geral.get(ids[i]) || 0) + 1);
    if (i < contexto) continue;
    const k = chave(ids.slice(i - contexto, i));
    const seguintes = tabela.get(k) ?? new Map<number, number>();
    seguintes.set(ids[i], (seguintes.get(ids[i]) || 0) + 1);
    tabela.set(k, seguintes);
  }

  return { ordem, vocab, tabela, geral, totalTokens: ids.length, contextos: tabela.size };
}

/* Candidatos para o próximo token, já com a temperatura aplicada.

   Quando o contexto exato nunca apareceu no corpus, o modelo encurta o contexto
   e tenta de novo. É o que um modelo de n-grama faz de mais parecido com
   "generalizar", e deixa claro para o aluno que ele não inventa: ele recorre a
   um contexto mais pobre. */
export function candidatos(modelo: Modelo, ids: number[], temperatura: number, quantos = 8): Candidato[] {
  const contexto = Math.max(1, modelo.ordem - 1);
  let seguintes: Map<number, number> | undefined;
  let tamanho = Math.min(contexto, ids.length);

  while (tamanho > 0 && !seguintes) {
    seguintes = modelo.tabela.get(chave(ids.slice(ids.length - tamanho)));
    if (!seguintes) tamanho--;
  }

  /* Nem o contexto mais curto bateu: o texto do aluno saiu inteiro fora do que
     o corpus conhece. O modelo não trava nem admite que não sabe. Ele cai na
     frequência geral e responde assim mesmo, com a mesma cara de certeza.

     Esse é o comportamento que a ferramenta existe para mostrar. */
  if (!seguintes) seguintes = modelo.geral;
  if (!seguintes.size) return [];

  const t = Math.max(0.01, temperatura);
  const bruto = [...seguintes.entries()].map(([id, contagem]) => ({ id, contagem, peso: Math.pow(contagem, 1 / t) }));
  const soma = bruto.reduce((s, c) => s + c.peso, 0) || 1;

  return bruto
    .map((c) => ({
      id: c.id,
      token: modelo.vocab.tokens[c.id] ?? "",
      contagem: c.contagem,
      probabilidade: c.peso / soma,
    }))
    .sort((a, b) => b.probabilidade - a.probabilidade)
    .slice(0, quantos);
}

/* De onde saiu a resposta: quantos tokens de contexto o modelo conseguiu usar,
   ou se ele teve que apelar para a frequência geral. A tela mostra isso, porque
   é a diferença entre "o modelo conhece esta situação" e "o modelo está
   chutando pelo que é comum". */
export function origemDaResposta(modelo: Modelo, ids: number[]): { tamanho: number; geral: boolean } {
  const contexto = Math.max(1, modelo.ordem - 1);
  for (let tamanho = Math.min(contexto, ids.length); tamanho > 0; tamanho--) {
    if (modelo.tabela.has(ids.slice(ids.length - tamanho).join(","))) return { tamanho, geral: false };
  }
  return { tamanho: 0, geral: true };
}

/** Sorteio com semente: a mesma semente devolve a mesma geração, sempre. */
export function sorteador(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function escolher(lista: Candidato[], sorteio: () => number, temperatura: number): Candidato | null {
  if (!lista.length) return null;
  // Temperatura zero não sorteia: pega o campeão. É o "modo determinístico".
  if (temperatura <= 0.05) return lista[0];
  const alvo = sorteio();
  let acumulado = 0;
  for (const c of lista) {
    acumulado += c.probabilidade;
    if (alvo <= acumulado) return c;
  }
  return lista[lista.length - 1];
}

export type Passo = { escolhido: Candidato; opcoes: Candidato[] };

export function gerar(
  modelo: Modelo,
  prompt: string,
  { tokens = 40, temperatura = 0.8, semente = 1, topo = 8 } = {}
): { texto: string; passos: Passo[] } {
  const sorteio = sorteador(semente);
  const ids = codificar(prompt, modelo.vocab);
  const passos: Passo[] = [];

  for (let i = 0; i < tokens; i++) {
    const opcoes = candidatos(modelo, ids, temperatura, topo);
    const escolhido = escolher(opcoes, sorteio, temperatura);
    if (!escolhido) break;
    ids.push(escolhido.id);
    passos.push({ escolhido, opcoes });
  }

  return { texto: decodificar(ids, modelo.vocab), passos };
}
