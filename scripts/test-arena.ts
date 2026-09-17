/* Testes da Arena SQL.
 *
 * O que precisa estar certo, em ordem de gravidade:
 *
 * 1. A base gerada precisa conter as armadilhas. Sem pedido órfão e sem
 *    desconto nulo, metade dos desafios não ensina nada.
 * 2. A consulta de referência de cada família precisa rodar e devolver linha.
 *    Referência quebrada é gabarito quebrado.
 * 3. Cada armadilha precisa mesmo errar, e errar do jeito previsto: se a
 *    consulta "errada" devolver o mesmo que a certa, o diagnóstico mente.
 * 4. A correção precisa aceitar caminho diferente e recusar resultado errado.
 *
 * Rodar: npm run test:arena
 */

// O pacote sql.js não traz tipos, e instalar @types só para o teste não paga.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const initSqlJs = require("sql.js") as (config?: any) => Promise<any>;
import { gerarBase } from "../lib/arena/gerador";
import { FAMILIAS } from "../lib/arena/familias";
import { corrigir, mesmasLinhas, rodar, type Banco } from "../lib/arena/motor";

let ok = 0;
let falhas = 0;

// Envolvido numa função porque o carregamento do sql.js é assíncrono e o
// esbuild do tsx não aceita await no topo do arquivo.
async function principal() {

function confere(nome: string, condicao: boolean, detalhe = "") {
  if (condicao) { ok++; console.log(`  ok   ${nome}`); }
  else { falhas++; console.log(`  FALHA ${nome}${detalhe ? ": " + detalhe : ""}`); }
}

const SQL = await initSqlJs();

function abrir(semente: number) {
  const base = gerarBase(semente, 2025);
  const db = new SQL.Database();
  db.run(base.sql);
  return { base, banco: db as unknown as Banco, db };
}

console.log("\nBase gerada");
{
  const { base, banco } = abrir(7);
  const conta = (sql: string) => Number(rodar(banco, sql).linhas[0][0]);

  confere("cria as quatro tabelas", base.tabelas.length === 4);
  confere("tem clientes", conta("SELECT COUNT(*) FROM clientes") > 20);
  confere("tem pedidos", conta("SELECT COUNT(*) FROM pedidos") > 150);
  confere("tem itens de pedido", conta("SELECT COUNT(*) FROM itens") > 200);

  const orfaos = conta("SELECT COUNT(*) FROM pedidos p LEFT JOIN clientes c ON c.id = p.cliente_id WHERE c.id IS NULL");
  confere("planta pedidos órfãos, para o INNER JOIN morder", orfaos > 0, `veio ${orfaos}`);

  const semCompra = conta("SELECT COUNT(*) FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id WHERE p.id IS NULL");
  confere("planta clientes que nunca compraram", semCompra >= 5, `veio ${semCompra}`);

  const nulos = conta("SELECT COUNT(*) FROM pedidos WHERE desconto IS NULL");
  confere("planta desconto nulo", nulos > 20, `veio ${nulos}`);

  const naoPagos = conta("SELECT COUNT(*) FROM pedidos WHERE status <> 'pago'");
  confere("mistura cancelado e devolvido", naoPagos > 10, `veio ${naoPagos}`);

  const anos = rodar(banco, "SELECT DISTINCT strftime('%Y', data) FROM pedidos ORDER BY 1").linhas.map((l) => String(l[0]));
  confere("espalha em dois anos", anos.length === 2 && anos.includes("2024") && anos.includes("2025"), anos.join(", "));

  const outra = gerarBase(8, 2025);
  confere("semente diferente gera base diferente", outra.sql !== base.sql);
  confere("mesma semente gera a mesma base", gerarBase(7, 2025).sql === base.sql);
}

console.log("\nReferências e armadilhas de cada família");
{
  const { base, banco } = abrir(11);
  for (const familia of FAMILIAS) {
    const d = familia.montar(base);
    let esperado;
    try {
      esperado = rodar(banco, d.referencia);
      confere(`[${d.id}] a referência roda e devolve linha`, esperado.linhas.length > 0, `${esperado.linhas.length} linhas`);
    } catch (e: any) {
      confere(`[${d.id}] a referência roda`, false, e?.message);
      continue;
    }

    confere(`[${d.id}] tem armadilha cadastrada`, d.armadilhas.length > 0);
    d.armadilhas.forEach((a, i) => {
      try {
        const errado = rodar(banco, a.sql);
        confere(`[${d.id}] armadilha ${i + 1} realmente erra`, !mesmasLinhas(errado, esperado!, d.ordenado));
      } catch (e: any) {
        confere(`[${d.id}] armadilha ${i + 1} roda`, false, e?.message);
      }
    });

    // O aluno que escreve exatamente a referência tem que acertar.
    const veredito = corrigir(banco, d, d.referencia);
    confere(`[${d.id}] a própria referência é aceita`, veredito.certo, veredito.detalhe);

    // E quem cai na armadilha tem que receber o diagnóstico dela, não um genérico.
    const naArmadilha = corrigir(banco, d, d.armadilhas[0].sql);
    confere(`[${d.id}] a armadilha é reconhecida pelo nome`, !naArmadilha.certo && naArmadilha.diagnosticado, naArmadilha.detalhe);
  }
}

console.log("\nJuiz");
{
  const { base, banco } = abrir(3);
  const agregacao = FAMILIAS[0].montar(base);

  // Caminho diferente, resultado igual: tem que aceitar.
  const outroCaminho = `SELECT categoria, ROUND(receita, 2) FROM (
    SELECT pr.categoria AS categoria, SUM(i.quantidade * i.valor_unitario) AS receita
    FROM produtos pr, itens i, pedidos p
    WHERE pr.id = i.produto_id AND p.id = i.pedido_id AND p.status = 'pago' AND p.data >= '${base.ano}-01-01' AND p.data <= '${base.ano}-12-31'
    GROUP BY pr.categoria
  ) ORDER BY 2 DESC`;
  const v1 = corrigir(banco, agregacao, outroCaminho);
  confere("aceita quem chega pelo outro caminho", v1.certo, v1.detalhe);

  // Nome de coluna diferente não pode reprovar.
  const v2 = corrigir(banco, agregacao, agregacao.referencia.replace("AS receita", "AS faturamento").replace("ORDER BY receita", "ORDER BY faturamento"));
  confere("não implica com o nome da coluna", v2.certo, v2.detalhe);

  // Erro de sintaxe vira recado de gente.
  const v3 = corrigir(banco, agregacao, "SELECT * FORM pedidos");
  confere("explica erro de escrita", !v3.certo && v3.detalhe.includes("erro de escrita"), v3.detalhe);

  // Coluna inexistente é apontada pelo nome.
  const v4 = corrigir(banco, agregacao, "SELECT valor_total FROM pedidos");
  confere("aponta a coluna que não existe", !v4.certo && v4.detalhe.includes("valor_total"), v4.detalhe);

  // Consulta vazia não quebra o juiz.
  const v5 = corrigir(banco, agregacao, "   ");
  confere("editor vazio não derruba", !v5.certo && v5.titulo.includes("Escreva"));

  // Resultado errado sem armadilha conhecida: diferença apontada.
  const v6 = corrigir(banco, agregacao, `SELECT pr.categoria, 1 FROM produtos pr GROUP BY pr.categoria ORDER BY 1`);
  confere("aponta a diferença quando não reconhece o erro", !v6.certo && !v6.diagnosticado && v6.detalhe.length > 10, v6.detalhe);

  // Tolerância de centavos: arredondar diferente não reprova.
  const v7 = corrigir(banco, agregacao, agregacao.referencia.replace("ROUND(SUM(i.quantidade * i.valor_unitario), 2)", "SUM(i.quantidade * i.valor_unitario)"));
  confere("tolera diferença de centavo no arredondamento", v7.certo, v7.detalhe);
}

console.log("\nVariação entre alunos");
{
  const a = abrir(21);
  const b = abrir(22);
  const da = FAMILIAS[0].montar(a.base);
  const dbb = FAMILIAS[0].montar(b.base);
  const respostaDoColega = rodar(a.banco, da.referencia);
  const minhaEsperada = rodar(b.banco, dbb.referencia);
  confere("a resposta do colega não serve", !mesmasLinhas(respostaDoColega, minhaEsperada, true));
}

console.log(`\n${ok}/${ok + falhas} verificações passaram.`);
process.exit(falhas ? 1 : 0);
}

principal();
