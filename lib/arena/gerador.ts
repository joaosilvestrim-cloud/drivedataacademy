/* O mundo da Arena: um comércio inteiro, gerado na hora.

   Cada aluno recebe a sua própria base, sorteada a partir de uma semente. Os
   números são diferentes dos do colega, então a resposta que circula no grupo
   não serve para ninguém. E como a base nasce aqui, a plataforma sabe a
   resposta de qualquer pergunta sem nenhum gabarito escrito à mão.

   As armadilhas são plantadas de propósito, e são as mesmas que derrubam gente
   em produção todo dia:

   - pedido com cliente que não existe mais na base, que some no INNER JOIN;
   - cliente que nunca comprou, que some junto;
   - desconto nulo em vez de zero, que envenena a subtração;
   - pedido cancelado e devolvido misturado com pedido pago;
   - dois anos de histórico, para quem esquece de filtrar período. */

export type Linha = (string | number | null)[];
export type Tabela = { nome: string; colunas: string[]; linhas: Linha[] };
export type Base = { tabelas: Tabela[]; sql: string; ano: number; anoAnterior: number };

/* Gerador com semente: a mesma semente devolve exatamente a mesma base, em
   qualquer máquina. Sem isso não existe correção confiável nem repetição do
   mesmo exercício depois de errar. */
function sorteio(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOMES = ["Ana", "Bruno", "Carla", "Diego", "Elisa", "Fábio", "Gisele", "Heitor", "Isabel", "João", "Karina", "Lucas", "Marina", "Nelson", "Olívia", "Paulo", "Rita", "Sérgio", "Tatiana", "Vinícius"];
const SOBRENOMES = ["Almeida", "Barros", "Cardoso", "Duarte", "Esteves", "Farias", "Gomes", "Henriques", "Iglesias", "Junqueira", "Klein", "Lima", "Moraes", "Nunes", "Oliveira", "Pacheco"];
const CIDADES: [string, string][] = [["São Paulo", "SP"], ["Campinas", "SP"], ["Sorocaba", "SP"], ["Rio de Janeiro", "RJ"], ["Belo Horizonte", "MG"], ["Curitiba", "PR"], ["Porto Alegre", "RS"], ["Salvador", "BA"], ["Recife", "PE"], ["Goiânia", "GO"]];
const SEGMENTOS = ["Varejo", "Atacado", "Corporativo"];
const CATEGORIAS = ["Periféricos", "Notebooks", "Monitores", "Redes", "Acessórios"];
const PRODUTOS: Record<string, string[]> = {
  "Periféricos": ["Teclado mecânico", "Mouse sem fio", "Headset", "Webcam HD"],
  "Notebooks": ["Notebook 14 polegadas", "Notebook 15 polegadas", "Ultrabook", "Estação de trabalho"],
  "Monitores": ["Monitor 24 polegadas", "Monitor 27 polegadas", "Monitor ultrawide"],
  "Redes": ["Roteador dual band", "Switch 8 portas", "Repetidor de sinal"],
  "Acessórios": ["Suporte de monitor", "Hub USB-C", "Cabo HDMI", "Mochila para notebook"],
};
const CANAIS = ["Loja", "Site", "Televendas", "Marketplace"];
const STATUS = ["pago", "pago", "pago", "pago", "cancelado", "devolvido"];

const dois = (n: number) => String(n).padStart(2, "0");
const centavos = (v: number) => Math.round(v * 100) / 100;

export function gerarBase(semente: number, anoBase?: number): Base {
  const r = sorteio(semente);
  const escolhe = <T,>(lista: T[]): T => lista[Math.floor(r() * lista.length)];
  const entre = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));

  const ano = anoBase ?? new Date().getFullYear() - 1;
  const anoAnterior = ano - 1;

  // Clientes. Os últimos cinco nunca compram: é a armadilha do LEFT JOIN.
  const clientes: Linha[] = [];
  const quantosClientes = entre(28, 36);
  for (let id = 1; id <= quantosClientes; id++) {
    const [cidade, uf] = escolhe(CIDADES);
    clientes.push([
      id,
      `${escolhe(NOMES)} ${escolhe(SOBRENOMES)}`,
      cidade,
      uf,
      escolhe(SEGMENTOS),
      `${anoAnterior - entre(0, 2)}-${dois(entre(1, 12))}-${dois(entre(1, 28))}`,
    ]);
  }
  const compradores = quantosClientes - 5;

  // Produtos.
  const produtos: Linha[] = [];
  let idProduto = 1;
  for (const categoria of CATEGORIAS) {
    for (const nome of PRODUTOS[categoria]) {
      const base = categoria === "Notebooks" ? entre(2800, 7200) : categoria === "Monitores" ? entre(700, 2600) : entre(40, 480);
      produtos.push([idProduto++, nome, categoria, centavos(base + r()), r() > 0.12 ? 1 : 0]);
    }
  }

  // Pedidos, espalhados em dois anos. Alguns apontam para um cliente que não
  // existe mais: é a armadilha do INNER JOIN.
  const pedidos: Linha[] = [];
  const itens: Linha[] = [];
  let idItem = 1;
  const quantosPedidos = entre(160, 220);
  for (let id = 1; id <= quantosPedidos; id++) {
    const anoDoPedido = r() > 0.42 ? ano : anoAnterior;
    const orfao = r() < 0.05;
    const clienteId = orfao ? quantosClientes + entre(50, 90) : entre(1, compradores);
    pedidos.push([
      id,
      clienteId,
      `${anoDoPedido}-${dois(entre(1, 12))}-${dois(entre(1, 28))}`,
      escolhe(CANAIS),
      escolhe(STATUS),
      centavos(entre(0, 90) + r()),
      // Desconto nulo em vez de zero na maioria: a armadilha do COALESCE.
      r() < 0.55 ? null : centavos(entre(10, 300) + r()),
    ]);

    for (let k = 0; k < entre(1, 4); k++) {
      const produto = produtos[entre(0, produtos.length - 1)];
      itens.push([idItem++, id, produto[0] as number, entre(1, 5), produto[3] as number]);
    }
  }

  const tabelas: Tabela[] = [
    { nome: "clientes", colunas: ["id", "nome", "cidade", "uf", "segmento", "criado_em"], linhas: clientes },
    { nome: "produtos", colunas: ["id", "nome", "categoria", "preco", "ativo"], linhas: produtos },
    { nome: "pedidos", colunas: ["id", "cliente_id", "data", "canal", "status", "frete", "desconto"], linhas: pedidos },
    { nome: "itens", colunas: ["id", "pedido_id", "produto_id", "quantidade", "valor_unitario"], linhas: itens },
  ];

  return { tabelas, sql: montarSQL(tabelas), ano, anoAnterior };
}

const valorSQL = (v: string | number | null) =>
  v === null ? "NULL" : typeof v === "number" ? String(v) : `'${v.replace(/'/g, "''")}'`;

function montarSQL(tabelas: Tabela[]): string {
  const tipos: Record<string, string> = {
    id: "INTEGER PRIMARY KEY", cliente_id: "INTEGER", pedido_id: "INTEGER", produto_id: "INTEGER",
    quantidade: "INTEGER", ativo: "INTEGER", preco: "REAL", frete: "REAL", desconto: "REAL", valor_unitario: "REAL",
  };
  const partes: string[] = [];
  for (const t of tabelas) {
    const colunas = t.colunas.map((c) => `  ${c} ${tipos[c] || "TEXT"}`).join(",\n");
    partes.push(`CREATE TABLE ${t.nome} (\n${colunas}\n);`);
    const linhas = t.linhas.map((l) => `(${l.map(valorSQL).join(", ")})`).join(",\n");
    partes.push(`INSERT INTO ${t.nome} (${t.colunas.join(", ")}) VALUES\n${linhas};`);
  }
  return partes.join("\n\n");
}

/* O dicionário que o aluno vê ao lado do editor. Sem isso ele adivinha nome de
   coluna, e adivinhar nome de coluna não ensina SQL nenhum. */
export const DICIONARIO: { tabela: string; descricao: string; colunas: { nome: string; tipo: string; nota?: string }[] }[] = [
  {
    tabela: "clientes",
    descricao: "Quem compra. Nem todo cliente tem pedido.",
    colunas: [
      { nome: "id", tipo: "inteiro" },
      { nome: "nome", tipo: "texto" },
      { nome: "cidade", tipo: "texto" },
      { nome: "uf", tipo: "texto" },
      { nome: "segmento", tipo: "texto", nota: "Varejo, Atacado ou Corporativo" },
      { nome: "criado_em", tipo: "data", nota: "AAAA-MM-DD" },
    ],
  },
  {
    tabela: "produtos",
    descricao: "O catálogo.",
    colunas: [
      { nome: "id", tipo: "inteiro" },
      { nome: "nome", tipo: "texto" },
      { nome: "categoria", tipo: "texto" },
      { nome: "preco", tipo: "decimal", nota: "preço de tabela, não o vendido" },
      { nome: "ativo", tipo: "inteiro", nota: "1 ou 0" },
    ],
  },
  {
    tabela: "pedidos",
    descricao: "O cabeçalho da venda.",
    colunas: [
      { nome: "id", tipo: "inteiro" },
      { nome: "cliente_id", tipo: "inteiro", nota: "alguns apontam para cliente que não está na base" },
      { nome: "data", tipo: "data", nota: "AAAA-MM-DD" },
      { nome: "canal", tipo: "texto" },
      { nome: "status", tipo: "texto", nota: "pago, cancelado ou devolvido" },
      { nome: "frete", tipo: "decimal" },
      { nome: "desconto", tipo: "decimal", nota: "pode ser nulo" },
    ],
  },
  {
    tabela: "itens",
    descricao: "O que foi vendido em cada pedido.",
    colunas: [
      { nome: "id", tipo: "inteiro" },
      { nome: "pedido_id", tipo: "inteiro" },
      { nome: "produto_id", tipo: "inteiro" },
      { nome: "quantidade", tipo: "inteiro" },
      { nome: "valor_unitario", tipo: "decimal", nota: "o preço praticado na venda" },
    ],
  },
];
