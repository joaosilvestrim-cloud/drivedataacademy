/* Testes do treino de DAX e Excel.

   O que pode quebrar aqui: a base deixar de ser determinística (o aluno perde
   a resposta ao recarregar), um desafio calcular um número impossível, o
   gabarito não passar na própria correção e a correção aceitar resposta errada.

   npm run test:dojo */

import { gerarBase, linhas, COLUNAS, liquido, bruto, mes } from "../lib/dojo/dados";
import { DESAFIOS, DESAFIOS_DA_TRILHA } from "../lib/dojo/desafios";
import { corrigir, numeroDigitado, normalizar, formatar } from "../lib/dojo/correcao";

let ok = 0;
let falhou = 0;
const checa = (nome: string, cond: boolean, detalhe = "") => {
  if (cond) { ok++; return; }
  falhou++;
  console.log(`  FALHOU: ${nome}${detalhe ? ` -> ${detalhe}` : ""}`);
};
const titulo = (t: string) => console.log(`\n${t}`);

/* --------------------------------------------------------------- a base */
titulo("Base do aluno");

const base = gerarBase(12345);
const mesma = gerarBase(12345);
const outra = gerarBase(999);

checa("a mesma semente devolve a mesma base", JSON.stringify(base) === JSON.stringify(mesma));
checa("semente diferente devolve base diferente", JSON.stringify(base) !== JSON.stringify(outra));
checa("a rodada muda a base", JSON.stringify(gerarBase(12345, 1)) !== JSON.stringify(base));
checa("tem 18 vendas", base.vendas.length === 18, String(base.vendas.length));
checa("vem ordenada por data", base.vendas.every((v, i) => i === 0 || base.vendas[i - 1].data <= v.data));
checa("toda venda tem quantidade de 1 a 9", base.vendas.every((v) => v.quantidade >= 1 && v.quantidade <= 9));
checa("desconto entre 0 e 20%", base.vendas.every((v) => v.desconto >= 0 && v.desconto <= 0.2001));
checa("desconto em passos de 5%", base.vendas.every((v) => Math.abs((v.desconto * 100) % 5) < 1e-9));
checa("custo sempre menor que o preço", base.vendas.every((v) => v.custo < v.preco));
checa("só os três primeiros meses", base.vendas.every((v) => mes(v) >= 1 && mes(v) <= 3));
checa("a tabela da tela tem uma coluna por cabeçalho", linhas(base).every((l) => l.length === COLUNAS.length));
checa("líquido nunca passa do bruto", base.vendas.every((v) => liquido(v) <= bruto(v) + 1e-9));

/* ------------------------------------------------------------ desafios */
titulo("Desafios");

const ids = DESAFIOS.map((d) => d.id);
checa("nenhum id repetido", new Set(ids).size === ids.length);
checa("DAX tem pelo menos 8 desafios", DESAFIOS_DA_TRILHA("dax").length >= 8, String(DESAFIOS_DA_TRILHA("dax").length));
checa("Excel tem pelo menos 8 desafios", DESAFIOS_DA_TRILHA("excel").length >= 8, String(DESAFIOS_DA_TRILHA("excel").length));
checa("a trilha vem do nível mais fácil para o mais difícil", DESAFIOS_DA_TRILHA("dax").every((d, i, a) => i === 0 || a[i - 1].nivel <= d.nivel));
checa("todo desafio tem enunciado, dica e explicação", DESAFIOS.every((d) => d.enunciado.length > 20 && d.dica.length > 10 && d.porque.length > 20));
checa("todo desafio pede pelo menos um pedaço da fórmula", DESAFIOS.every((d) => d.precisa.length > 0));
checa("todo gabarito tem fórmula escrita", DESAFIOS.every((d) => d.gabarito.length > 10));

const sementes = [1, 42, 7777, 20260920, 918273];
for (const d of DESAFIOS) {
  const valores = sementes.map((s) => d.valor(gerarBase(s)));
  checa(`${d.id}: devolve número válido em toda base`, valores.every((v) => Number.isFinite(v)), String(valores));
  checa(`${d.id}: não é sempre zero`, valores.some((v) => v !== 0), String(valores));
  if (d.formato === "percentual") {
    checa(`${d.id}: percentual entre 0 e 100`, valores.every((v) => v >= -0.01 && v <= 100.01), String(valores));
  }
}

/* ------------------------------------------------------------ correção */
titulo("Correção");

for (const d of DESAFIOS) {
  const esperado = d.valor(base);
  const certo = corrigir(d, base, { valor: String(esperado).replace(".", ","), formula: d.gabarito });
  checa(`${d.id}: o gabarito passa na própria correção`, certo.acertou, `${certo.recado} faltou: ${certo.faltou.join(", ")} alertas: ${certo.alertas.join(" | ")}`);

  const valorErrado = corrigir(d, base, { valor: String(esperado + Math.max(5, Math.abs(esperado) * 0.2)), formula: d.gabarito });
  checa(`${d.id}: número errado é recusado`, !valorErrado.acertou && !valorErrado.valorOk);

  const semFormula = corrigir(d, base, { valor: String(esperado), formula: "" });
  checa(`${d.id}: sem fórmula não fecha`, !semFormula.acertou && semFormula.valorOk);

  const formulaQualquer = corrigir(d, base, { valor: String(esperado), formula: "= soma de tudo" });
  checa(`${d.id}: fórmula inventada é recusada`, !formulaQualquer.formulaOk);
}

// Arredondamento não pode reprovar quem acertou.
const d1 = DESAFIOS[0];
const v1 = d1.valor(base);
checa("aceita diferença de um centavo", corrigir(d1, base, { valor: String(v1 + 0.01), formula: d1.gabarito }).valorOk);
checa("recusa diferença grande", !corrigir(d1, base, { valor: String(v1 * 1.05), formula: d1.gabarito }).valorOk);

// O alerta de atalho precisa disparar de verdade.
const receita = DESAFIOS.find((d) => d.id === "dax-receita-bruta")!;
const atalho = corrigir(receita, base, { valor: String(receita.valor(base)), formula: "Receita = SUM ( Vendas[Quantidade] ) * SUM ( Vendas[Preço] )" });
checa("atalho de SUM * SUM vira alerta", atalho.alertas.length > 0 && !atalho.acertou);

/* --------------------------------------------------------- entrada solta */
titulo("Número digitado");

checa("aceita vírgula decimal", numeroDigitado("1.234,56") === 1234.56);
checa("aceita ponto decimal", numeroDigitado("1234.56") === 1234.56);
checa("aceita com cifrão", numeroDigitado("R$ 1.234,56") === 1234.56);
checa("aceita percentual escrito", numeroDigitado("23,5%") === 23.5);
checa("vazio é nulo", numeroDigitado("   ") === null);
checa("texto é nulo", numeroDigitado("não sei") === null);
checa("negativo funciona", numeroDigitado("-15") === -15);

checa("comentário não atrapalha a fórmula", normalizar("SUMX( t, a*b ) // teste").includes("SUMX"));
checa("formata moeda", formatar(1234.5, "moeda").includes("1.234,50"));
checa("formata percentual", formatar(23.5, "percentual") === "23,5%");

console.log(`\n${ok} passaram, ${falhou} falharam.`);
process.exit(falhou ? 1 : 0);
