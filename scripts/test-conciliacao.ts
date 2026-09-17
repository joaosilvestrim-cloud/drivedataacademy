/* Testes do laboratório de conciliação.
 *
 * O que não pode quebrar, em ordem de gravidade:
 *
 * 1. O gabarito precisa bater com a realidade dos dados. Se a diferença
 *    declarada não for a diferença que existe entre os dois lados, a ferramenta
 *    reprova aluno certo.
 * 2. Todo caso precisa ser achável pelo método. Se a diferença não se concentra
 *    em nenhuma dimensão e não aparece no registro, o exercício vira loteria.
 * 3. O juiz precisa aceitar a resposta certa, com sinal invertido ou não, e
 *    explicar por que a hipótese errada não fecha.
 *
 * Rodar: npm run test:conciliacao
 */

import { CLASSES, gerarCaso, somar } from "../lib/conciliacao/gerador";
import { comparar, corrigir, quebrar, registros } from "../lib/conciliacao/motor";
import { CAUSAS, DIMENSOES, type ClasseDefeito } from "../lib/conciliacao/tipos";

let ok = 0;
let falhas = 0;

function confere(nome: string, condicao: boolean, detalhe = "") {
  if (condicao) { ok++; console.log(`  ok   ${nome}`); }
  else { falhas++; console.log(`  FALHA ${nome}${detalhe ? ": " + detalhe : ""}`); }
}

console.log("\nCada classe de defeito");
for (const classe of CLASSES) {
  const caso = gerarCaso(101, classe, 2025);
  const total = comparar(caso);

  /* O corte de data é a exceção de propósito: os totais fecham e a divergência
     é o valor que trocou de mês. Nos outros, o gabarito é a diferença dos
     totais, e ela precisa bater com o que a tela mostra. */
  if (classe === "corte_data") {
    confere(`[${classe}] o total fecha, como manda o caso`, Math.abs(total.diferenca) < 0.02, `${total.diferenca}`);
  } else {
    confere(`[${classe}] o gabarito bate com os dados`, Math.abs(total.diferenca - caso.gabarito.diferenca) < 0.02,
      `tela ${total.diferenca}, gabarito ${caso.gabarito.diferenca}`);
  }

  confere(`[${classe}] existe divergência para achar`, Math.abs(caso.gabarito.diferenca) > 0.5,
    `divergência ${caso.gabarito.diferenca}`);

  confere(`[${classe}] o caso traz a própria pergunta`, caso.pergunta.length > 20);

  confere(`[${classe}] aponta registros envolvidos`, caso.gabarito.registros.length > 0);

  // O caso precisa ser achável: ou a diferença se concentra numa dimensão, ou
  // ela aparece registro a registro.
  const concentra = DIMENSOES.some(({ chave }) => {
    const linhas = quebrar(caso, chave);
    const maior = Math.abs(linhas[0]?.diferenca ?? 0);
    return maior >= Math.abs(caso.gabarito.diferenca) * 0.6;
  });
  const apareceNaLinha = registros(caso).some((r) => r.situacao !== "igual");
  confere(`[${classe}] dá para achar pelo método`, concentra || apareceNaLinha);

  const sinalEsperado = classe === "corte_data" ? "qualquer" : CAUSAS.find((c) => c.classe === classe)!.sinal;
  if (sinalEsperado === "painel_maior") {
    confere(`[${classe}] painel maior, como a causa promete`, caso.gabarito.diferenca > 0, `${caso.gabarito.diferenca}`);
  } else if (sinalEsperado === "painel_menor") {
    confere(`[${classe}] painel menor, como a causa promete`, caso.gabarito.diferenca < 0, `${caso.gabarito.diferenca}`);
  }
}

console.log("\nOnde cada defeito aparece");
{
  const status = gerarCaso(7, "status", 2025);
  const porStatus = quebrar(status, "status");
  confere("status: a diferença mora num status que só existe no painel",
    porStatus[0].origem === 0 && porStatus[0].painel > 0, JSON.stringify(porStatus[0]));

  const orfao = gerarCaso(9, "orfao", 2025);
  const porFilial = quebrar(orfao, "filial");
  confere("órfão: a filial inteira sumiu do painel", porFilial[0].painel === 0 && porFilial[0].origem > 0, JSON.stringify(porFilial[0]));

  const corte = gerarCaso(13, "corte_data", 2025);
  const porMes = quebrar(corte, "mes");
  const positivos = porMes.filter((m) => m.diferenca > 0.5);
  const negativos = porMes.filter((m) => m.diferenca < -0.5);
  confere("corte de data: um mês a menos e o seguinte a mais", positivos.length >= 1 && negativos.length >= 1,
    porMes.map((m) => `${m.grupo}:${m.diferenca}`).join(" "));
  confere("corte de data: o total do período fecha", Math.abs(comparar(corte).diferenca) < 0.02, `${comparar(corte).diferenca}`);
  const mesFalho = porMes.find((m) => Math.abs(m.diferenca) > 0.5);
  confere("corte de data: a divergência do mês é o valor deslocado",
    Math.abs(Math.abs(mesFalho!.diferenca) - corte.gabarito.diferenca) < 0.02,
    `mês ${mesFalho?.diferenca}, gabarito ${corte.gabarito.diferenca}`);

  const dup = gerarCaso(17, "duplicata", 2025);
  confere("duplicata: id repetido aparece na comparação de registros",
    registros(dup).some((r) => r.situacao === "repetido"));

  const arred = gerarCaso(19, "arredondamento", 2025);
  const espalhado = quebrar(arred, "filial").every((l) => Math.abs(l.diferenca) < Math.abs(arred.gabarito.diferenca) * 0.8);
  confere("arredondamento: a diferença é espalhada, não concentrada", espalhado);
}

console.log("\nInvestigação");
{
  const caso = gerarCaso(23, "orfao", 2025);
  const porFilial = quebrar(caso, "filial");
  const alvo = porFilial[0].grupo;
  const dentro = comparar(caso, { filial: alvo });
  confere("filtrar pelo grupo isola a diferença", Math.abs(dentro.diferenca - caso.gabarito.diferenca) < 0.02,
    `${dentro.diferenca} contra ${caso.gabarito.diferenca}`);
  confere("dentro do grupo, o painel não tem linha", dentro.linhasPainel === 0 && dentro.linhasOrigem > 0);
  confere("somar os grupos devolve o total", Math.abs(porFilial.reduce((s, l) => s + l.diferenca, 0) - caso.gabarito.diferenca) < 0.05);
  confere("a quebra ordena pela maior diferença", Math.abs(porFilial[0].diferenca) >= Math.abs(porFilial[porFilial.length - 1].diferenca));
}

console.log("\nJuiz");
{
  const caso = gerarCaso(31, "status", 2025);
  const certo = caso.gabarito.diferenca;

  const v1 = corrigir(caso, { valor: certo, classe: "status" });
  confere("aceita a resposta certa", v1.acertouValor && v1.acertouClasse, v1.detalhe);

  const v2 = corrigir(caso, { valor: -certo, classe: "status" });
  confere("aceita o valor com o sinal invertido", v2.acertouValor, v2.detalhe);

  const v3 = corrigir(caso, { valor: certo * 1.005, classe: "status" });
  confere("tolera arredondamento de centavo na resposta", v3.acertouValor, v3.detalhe);

  const v4 = corrigir(caso, { valor: certo, classe: "duplicata" });
  confere("valor certo e causa errada é dito com todas as letras", v4.acertouValor && !v4.acertouClasse && v4.titulo.includes("causa não"));
  confere("explica por que a causa escolhida não fecha", v4.detalhe.includes("estaria menor"), v4.detalhe);

  const v5 = corrigir(caso, { valor: 10, classe: "status" });
  confere("causa certa e valor errado também é dito", !v5.acertouValor && v5.acertouClasse && v5.titulo.includes("valor não"));

  const v6 = corrigir(caso, { valor: 10, classe: "" });
  confere("resposta em branco não quebra o juiz", !v6.acertouValor && !v6.acertouClasse);

  confere("sempre ensina o método", [v1, v2, v4, v5, v6].every((v) => v.metodo.length > 30));
}

console.log("\nVariação entre alunos");
{
  const a = gerarCaso(41, "devolucao", 2025);
  const b = gerarCaso(42, "devolucao", 2025);
  confere("semente diferente, caso diferente", Math.abs(a.gabarito.diferenca - b.gabarito.diferenca) > 0.02);
  confere("mesma semente, mesmo caso", gerarCaso(41, "devolucao", 2025).gabarito.diferenca === a.gabarito.diferenca);
  confere("a origem é a mesma verdade nos dois lados", somar(a.origem) > 0 && somar(a.painel) > 0);
}

console.log(`\n${ok}/${ok + falhas} verificações passaram.`);
process.exit(falhas ? 1 : 0);
