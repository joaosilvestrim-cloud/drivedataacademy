import { CAUSAS, type Caso, type ClasseDefeito, type Dimensao, type Lancamento, type Resposta, type Veredito } from "./tipos";
import { centavos, somar } from "./gerador";

/* O motor da conciliação: as contas da investigação e o juiz da resposta.

   As contas aqui não são enfeite, são o método. Comparar o total diz que tem
   problema. Quebrar por dimensão diz onde ele mora. Olhar a linha diz o que é.
   A tela é só a forma desse caminho. */

export type Filtro = Partial<Record<Dimensao, string>>;

export const valorDaDimensao = (l: Lancamento, d: Dimensao): string =>
  d === "mes" ? l.data.slice(0, 7) : (l[d] as string);

export const aplicarFiltro = (linhas: Lancamento[], filtro: Filtro): Lancamento[] =>
  linhas.filter((l) => Object.entries(filtro).every(([d, v]) => valorDaDimensao(l, d as Dimensao) === v));

export type LinhaDaQuebra = { grupo: string; origem: number; painel: number; diferenca: number; registros: number };

/* A quebra por dimensão, com os dois lados lado a lado.

   Grupo que existe em um lado só aparece do mesmo jeito, com zero do outro:
   é justamente ali que mora metade das divergências, e esconder isso seria
   esconder a resposta. */
export function quebrar(caso: Caso, dimensao: Dimensao, filtro: Filtro = {}): LinhaDaQuebra[] {
  const origem = aplicarFiltro(caso.origem, filtro);
  const painel = aplicarFiltro(caso.painel, filtro);
  const grupos = new Map<string, LinhaDaQuebra>();

  const pega = (g: string) =>
    grupos.get(g) ?? (grupos.set(g, { grupo: g, origem: 0, painel: 0, diferenca: 0, registros: 0 }), grupos.get(g)!);

  for (const l of origem) {
    const g = pega(valorDaDimensao(l, dimensao));
    g.origem = centavos(g.origem + l.valor);
    g.registros++;
  }
  for (const l of painel) {
    const g = pega(valorDaDimensao(l, dimensao));
    g.painel = centavos(g.painel + l.valor);
  }

  return [...grupos.values()]
    .map((g) => ({ ...g, diferenca: centavos(g.painel - g.origem) }))
    .sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca) || a.grupo.localeCompare(b.grupo, "pt-BR"));
}

export type Comparacao = { origem: number; painel: number; diferenca: number; linhasOrigem: number; linhasPainel: number };

export function comparar(caso: Caso, filtro: Filtro = {}): Comparacao {
  const origem = aplicarFiltro(caso.origem, filtro);
  const painel = aplicarFiltro(caso.painel, filtro);
  const a = somar(origem);
  const b = somar(painel);
  return { origem: a, painel: b, diferenca: centavos(b - a), linhasOrigem: origem.length, linhasPainel: painel.length };
}

export type LinhaLadoALado = { id: string; origem: Lancamento[]; painel: Lancamento[]; situacao: "igual" | "so_origem" | "so_painel" | "valor" | "repetido" };

/* Os registros do grupo, dos dois lados, já classificados. É o último passo do
   método, e o único em que olhar linha a linha vale a pena. */
export function registros(caso: Caso, filtro: Filtro = {}): LinhaLadoALado[] {
  const origem = aplicarFiltro(caso.origem, filtro);
  const painel = aplicarFiltro(caso.painel, filtro);
  const ids = Array.from(new Set([...origem.map((l) => l.id), ...painel.map((l) => l.id)]));

  return ids
    .map((id) => {
      const a = origem.filter((l) => l.id === id);
      const b = painel.filter((l) => l.id === id);
      const situacao: LinhaLadoALado["situacao"] =
        a.length > 1 || b.length > 1
          ? "repetido"
          : !b.length
          ? "so_origem"
          : !a.length
          ? "so_painel"
          : Math.abs(a[0].valor - b[0].valor) > 0.001
          ? "valor"
          : "igual";
      return { id, origem: a, painel: b, situacao };
    })
    .sort((x, y) => (x.situacao === "igual" ? 1 : 0) - (y.situacao === "igual" ? 1 : 0) || x.id.localeCompare(y.id));
}

/* O juiz.

   Errar a causa não vale "errado". Vale a explicação de por que não pode ser
   aquela: a assinatura de cada causa diz para que lado a diferença aponta e
   onde ela se concentra. É assim que o aluno aprende a descartar hipótese, que
   é o que um sênior faz de verdade. */
export function corrigir(caso: Caso, resposta: Resposta): Veredito {
  const real = caso.gabarito.diferenca;
  const margem = Math.max(1, Math.abs(real) * 0.01);
  const acertouValor = Number.isFinite(resposta.valor) && Math.abs(Math.abs(resposta.valor) - Math.abs(real)) <= margem;
  const acertouClasse = resposta.classe === caso.gabarito.classe;
  const certa = CAUSAS.find((c) => c.classe === caso.gabarito.classe)!;
  const escolhida = CAUSAS.find((c) => c.classe === resposta.classe);

  const metodo = certa.comoReconhecer;

  if (acertouValor && acertouClasse) {
    return {
      acertouValor,
      acertouClasse,
      titulo: "Fechou",
      detalhe: `A diferença é de ${moeda(real)} e a causa é ${certa.nome.toLowerCase()}. ${caso.gabarito.registros.length} ${caso.gabarito.registros.length === 1 ? "registro explica" : "registros explicam"} tudo.`,
      metodo,
    };
  }

  if (acertouValor && !acertouClasse) {
    const porque = escolhida ? naoPodeSer(escolhida.classe, real) : "";
    return {
      acertouValor,
      acertouClasse,
      titulo: "O valor está certo, a causa não",
      detalhe: `${porque} Aqui a causa é ${certa.nome.toLowerCase()}: ${certa.descricao.toLowerCase()}`,
      metodo,
    };
  }

  if (!acertouValor && acertouClasse) {
    return {
      acertouValor,
      acertouClasse,
      titulo: "A causa está certa, o valor não",
      detalhe: `A diferença total é de ${moeda(real)}. Confira se você comparou o mesmo recorte dos dois lados: filtro sobrando de um lado só é a pegadinha clássica dessa conta.`,
      metodo,
    };
  }

  const porque = escolhida ? naoPodeSer(escolhida.classe, real) : "";
  return {
    acertouValor,
    acertouClasse,
    titulo: "Ainda não",
    detalhe: `${porque} A diferença total entre os dois lados é de ${moeda(real)}. Volte ao método: compare o total, quebre por uma dimensão de cada vez e veja em qual grupo a diferença se concentra.`,
    metodo,
  };
}

/* Por que a hipótese do aluno não fecha com o que está na tela. */
function naoPodeSer(classe: ClasseDefeito, diferenca: number): string {
  const causa = CAUSAS.find((c) => c.classe === classe);
  if (!causa) return "";
  const painelMaior = diferenca > 0;
  if (causa.sinal === "painel_maior" && !painelMaior) {
    return `Se fosse ${causa.nome.toLowerCase()}, o painel estaria maior que a origem, e aqui ele está menor.`;
  }
  if (causa.sinal === "painel_menor" && painelMaior) {
    return `Se fosse ${causa.nome.toLowerCase()}, o painel estaria menor que a origem, e aqui ele está maior.`;
  }
  return "";
}

export const moeda = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
