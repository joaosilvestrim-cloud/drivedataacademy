/* A base do treino: pequena o bastante para caber na tela, grande o bastante
   para a conta não ser óbvia.

   Cada aluno recebe a base dele, gerada a partir do id. Duas pessoas ao lado
   uma da outra têm números diferentes, então copiar a resposta do colega não
   funciona, e a conta precisa ser feita de verdade. */

export type Venda = {
  id: number;
  data: string;          // AAAA-MM-DD
  vendedor: string;
  regiao: string;
  categoria: string;
  produto: string;
  quantidade: number;
  preco: number;
  desconto: number;      // fração: 0.1 = 10%
  custo: number;         // unitário
};

export type Base = { vendas: Venda[]; ano: number };

const VENDEDORES = ["Ana", "Bruno", "Carla", "Diego", "Elisa"];
const REGIOES = ["Sudeste", "Sul", "Nordeste"];
const PRODUTOS: { nome: string; categoria: string; preco: number; custo: number }[] = [
  { nome: "Teclado", categoria: "Periféricos", preco: 180, custo: 110 },
  { nome: "Mouse", categoria: "Periféricos", preco: 90, custo: 48 },
  { nome: "Monitor", categoria: "Telas", preco: 1250, custo: 890 },
  { nome: "Notebook", categoria: "Computadores", preco: 4200, custo: 3200 },
  { nome: "Dock", categoria: "Periféricos", preco: 640, custo: 430 },
  { nome: "Webcam", categoria: "Telas", preco: 320, custo: 190 },
];

/** Gerador determinístico: a mesma semente devolve sempre a mesma base. */
function sorteio(semente: number) {
  let s = (semente >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function gerarBase(semente: number, rodada = 0): Base {
  const rnd = sorteio(semente + rodada * 7919);
  const ano = 2026;
  const vendas: Venda[] = [];
  const quantas = 18;

  for (let i = 0; i < quantas; i++) {
    const p = PRODUTOS[Math.floor(rnd() * PRODUTOS.length)];
    // Três meses, para dar comparação mês a mês sem virar planilha gigante.
    const mes = 1 + Math.floor(rnd() * 3);
    const dia = 1 + Math.floor(rnd() * 28);
    vendas.push({
      id: i + 1,
      data: `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`,
      vendedor: VENDEDORES[Math.floor(rnd() * VENDEDORES.length)],
      regiao: REGIOES[Math.floor(rnd() * REGIOES.length)],
      categoria: p.categoria,
      produto: p.nome,
      quantidade: 1 + Math.floor(rnd() * 9),
      preco: p.preco,
      // Desconto em passos de 5%, até 20%: número redondo, conta conferível.
      desconto: Math.floor(rnd() * 5) * 0.05,
      custo: p.custo,
    });
  }

  vendas.sort((a, b) => a.data.localeCompare(b.data) || a.id - b.id);
  return { vendas, ano };
}

/* ---------------------------------------------------- contas de apoio */

export const bruto = (v: Venda) => v.quantidade * v.preco;
export const liquido = (v: Venda) => bruto(v) * (1 - v.desconto);
export const custoTotal = (v: Venda) => v.quantidade * v.custo;
export const margem = (v: Venda) => liquido(v) - custoTotal(v);
export const mes = (v: Venda) => Number(v.data.slice(5, 7));

export function somaPor<T extends string | number>(vendas: Venda[], chave: (v: Venda) => T, valor: (v: Venda) => number) {
  const mapa = new Map<T, number>();
  for (const v of vendas) mapa.set(chave(v), (mapa.get(chave(v)) ?? 0) + valor(v));
  return mapa;
}

/** O maior de um agrupamento, com desempate por nome para nunca variar. */
export function maiorDe<T extends string | number>(mapa: Map<T, number>): { chave: T; valor: number } | null {
  const lista = [...mapa.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "pt-BR"));
  return lista.length ? { chave: lista[0][0], valor: lista[0][1] } : null;
}

/** A base em formato de planilha, com a linha 1 de cabeçalho, como o Excel mostra. */
export const COLUNAS = ["Data", "Vendedor", "Região", "Categoria", "Produto", "Qtd", "Preço", "Desc.", "Custo"] as const;

export function linhas(base: Base): (string | number)[][] {
  return base.vendas.map((v) => [v.data, v.vendedor, v.regiao, v.categoria, v.produto, v.quantidade, v.preco, v.desconto, v.custo]);
}
