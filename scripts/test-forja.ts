/* Testes da Forja DAX.
 *
 * Duas coisas precisam estar certas, e nenhuma delas é estética:
 *
 * 1. As datas dos feriados móveis. Carnaval errado é dia útil errado, e isso
 *    contamina qualquer análise de venda ou de produção.
 * 2. O código gerado. Ele vai ser colado no Power BI de gente de verdade, então
 *    o teste cobra a sintaxe que o DAX exige e as decisões que a gente defende
 *    numa revisão: DIVIDE no lugar da barra, ano fiscal tratado, calendário
 *    fechando em 31 de dezembro.
 *
 * Rodar: npm run test:forja
 */

import { feriadosBR, pascoa, feriadosValidos } from "../lib/forja/feriados";
import { calendarioDAX, calendarioM, feriadosDAX, medidasDAX, passoAPasso, type OpcoesCalendario } from "../lib/forja/gerar";

let ok = 0;
let falhas = 0;

function confere(nome: string, condicao: boolean, detalhe = "") {
  if (condicao) { ok++; console.log(`  ok   ${nome}`); }
  else { falhas++; console.log(`  FALHA ${nome}${detalhe ? ": " + detalhe : ""}`); }
}

const base: OpcoesCalendario = {
  tabela: "dCalendario",
  coluna: "Data",
  origem: "fato",
  fatoTabela: "fVendas",
  fatoColuna: "Data da venda",
  de: 2024,
  ate: 2026,
  inicioAnoFiscal: 1,
  idioma: "pt",
  feriados: true,
  tabelaFeriados: "dFeriados",
};

console.log("\nPáscoa e feriados móveis");
{
  // Datas conferidas contra o calendário oficial.
  const casos: [number, string][] = [
    [2024, "2024-03-31"],
    [2025, "2025-04-20"],
    [2026, "2026-04-05"],
    [2027, "2027-03-28"],
    [2030, "2030-04-21"],
  ];
  for (const [ano, esperado] of casos) {
    const achou = pascoa(ano).toISOString().slice(0, 10);
    confere(`Páscoa de ${ano}`, achou === esperado, `veio ${achou}, esperado ${esperado}`);
  }

  const f2026 = feriadosBR(2026);
  const acha = (nome: string) => f2026.find((f) => f.nome === nome)?.data;
  confere("Carnaval de 2026 é 17/02", acha("Carnaval") === "2026-02-17", `veio ${acha("Carnaval")}`);
  confere("Sexta-feira Santa de 2026 é 03/04", acha("Sexta-feira Santa") === "2026-04-03", `veio ${acha("Sexta-feira Santa")}`);
  confere("Corpus Christi de 2026 é 04/06", acha("Corpus Christi") === "2026-06-04", `veio ${acha("Corpus Christi")}`);
  confere("Natal continua em 25/12", acha("Natal") === "2026-12-25");
  confere("Consciência Negra entra em 2024", feriadosValidos(2024, 2024).some((f) => f.nome === "Consciência Negra"));
  confere("Consciência Negra não entra em 2020", !feriadosValidos(2020, 2020).some((f) => f.nome === "Consciência Negra"));
  confere("três anos geram três vezes os feriados", feriadosValidos(2024, 2026).length === feriadosBR(2024).length * 3);
}

console.log("\nCalendário em DAX");
{
  const dax = calendarioDAX(base);
  confere("nomeia a tabela", dax.includes("dCalendario ="));
  confere("usa a coluna de data do fato", dax.includes("MIN ( fVendas[Data da venda] )"));
  confere("fecha o ano em 31 de dezembro", dax.includes("DATE ( YEAR ( UltimaData ), 12, 31 )"));
  confere("renomeia a coluna do CALENDAR", dax.includes(`SELECTCOLUMNS ( CALENDAR ( Inicio, Fim ), "Data", [Date] )`));
  confere("traz coluna de ordenação do mês", dax.includes('"Ordem do mês"'));
  confere("liga feriado por LOOKUPVALUE", dax.includes("LOOKUPVALUE ( dFeriados[Feriado], dFeriados[Data], [Data] )"));
  confere("dia útil exclui fim de semana e feriado", dax.includes("WEEKDAY ( [Data], 2 ) <= 5 && ISBLANK"));
  // O separador dos argumentos não pode cair dentro de um comentário: se cair,
  // o DAX junta duas colunas em uma e o código nem chega a colar no Power BI.
  const argumentos = dax.split("ADDCOLUMNS (")[1].split("\n").slice(2, -1);
  const comentarios = argumentos.filter((l) => l.trim().startsWith("//"));
  const expressoes = argumentos.filter((l) => !l.trim().startsWith("//"));
  confere("comentário não leva vírgula", comentarios.length > 0 && comentarios.every((l) => !l.trim().endsWith(",")));
  confere(
    "toda expressão menos a última leva vírgula",
    expressoes.slice(0, -1).every((l) => l.trim().endsWith(",")) && !expressoes[expressoes.length - 1].trim().endsWith(",")
  );
  confere("parênteses fecham", (dax.match(/\(/g) || []).length === (dax.match(/\)/g) || []).length);

  const semFeriado = calendarioDAX({ ...base, feriados: false });
  confere("sem feriados, não cita a tabela de feriados", !semFeriado.includes("dFeriados"));

  const fiscal = calendarioDAX({ ...base, inicioAnoFiscal: 7 });
  confere("ano fiscal aparece quando não começa em janeiro", fiscal.includes('"Ano fiscal", YEAR ( [Data] ) + IF ( MONTH ( [Data] ) >= 7, 1, 0 )'));
  confere("mês fiscal numera a partir do início do ano fiscal", fiscal.includes("MOD ( MONTH ( [Data] ) - 7, 12 ) + 1"));
  confere("sem ano fiscal quando começa em janeiro", !dax.includes("Ano fiscal"));

  const porAnos = calendarioDAX({ ...base, origem: "anos" });
  confere("intervalo por anos não usa a tabela de fatos", porAnos.includes("DATE ( 2024, 1, 1 )") && !porAnos.includes("MIN ( fVendas"));

  const ingles = calendarioDAX({ ...base, idioma: "en" });
  confere("em inglês muda nome de coluna e cultura", ingles.includes('"Month name"') && ingles.includes('"en-US"'));

  const comEspaco = calendarioDAX({ ...base, fatoTabela: "Fato Vendas" });
  confere("tabela com espaço ganha aspas simples", comEspaco.includes("'Fato Vendas'[Data da venda]"));
}

console.log("\nFeriados em DAX");
{
  const f = feriadosDAX(base);
  confere("monta DATATABLE", f.includes("DATATABLE (") && f.includes('"Data", DATETIME'));
  confere("tem o Carnaval de 2026", f.includes('{ "2026-02-17", "Carnaval" }'));
  const linhas = (f.match(/\{ "\d{4}-\d{2}-\d{2}"/g) || []).length;
  confere("uma linha por feriado", linhas === feriadosValidos(2024, 2026).length, `veio ${linhas}`);
  confere("última linha não tem vírgula sobrando", !/,\n\s*\}\n\)/.test(f));
}

console.log("\nCalendário em Power Query");
{
  const m = calendarioM(base);
  confere("abre e fecha o let", m.includes("let\n") && m.trim().endsWith("ComDiaUtil"));
  confere("usa List.Dates", m.includes("List.Dates(Inicio,"));
  confere("junta os feriados", m.includes("Table.NestedJoin") && m.includes("#date(2026, 2, 17)"));
  confere("dia útil considera feriado", m.includes("and [Feriado] = null"));
  const semFeriado = calendarioM({ ...base, feriados: false });
  confere("sem feriados termina no fim de semana", semFeriado.trim().endsWith("ComFimDeSemana"));
  const fiscal = calendarioM({ ...base, feriados: false, inicioAnoFiscal: 4 });
  confere("ano fiscal em M", fiscal.includes("Date.Month([Data]) >= 4") && fiscal.trim().endsWith("ComMesFiscal"));
}

console.log("\nMedidas");
{
  const todas = medidasDAX({
    base: "Receita",
    expressaoBase: "SUM ( fVendas[Valor] )",
    tabelaCalendario: "dCalendario",
    colunaData: "Data",
    inicioAnoFiscal: 1,
    escolhas: ["ytd", "mtd", "ano_anterior", "yoy", "mes_anterior", "mom", "media_movel", "acumulado"],
    formato: "moeda com duas casas",
  });
  confere("cria a medida base", todas.includes("Receita = SUM ( fVendas[Valor] )"));
  confere("YTD usa TOTALYTD", todas.includes("Receita YTD = TOTALYTD ( [Receita], dCalendario[Data] )"));
  confere("ano anterior usa SAMEPERIODLASTYEAR", todas.includes("SAMEPERIODLASTYEAR ( dCalendario[Data] )"));
  confere("variação usa DIVIDE", todas.includes("Receita YoY % = DIVIDE (") && !/-\s*\[Receita ano anterior\]\s*\)\s*\/\s*/.test(todas));
  confere("média móvel usa DATESINPERIOD", todas.includes("DATESINPERIOD ( dCalendario[Data], MAX ( dCalendario[Data] ), -3, MONTH )"));
  confere("acumulado tira o filtro do calendário", todas.includes("CALCULATE ( [Receita], dCalendario, dCalendario[Data] <= Ultima )"));
  confere("nenhuma divisão com barra solta", !/[^/]\/[^/]/.test(todas.replace(/\/\/.*$/gm, "")));

  const fiscal = medidasDAX({
    base: "Receita", expressaoBase: "", tabelaCalendario: "dCalendario", colunaData: "Data",
    inicioAnoFiscal: 7, escolhas: ["ytd"], formato: "",
  });
  confere("YTD fiscal fecha em 30/06", fiscal.includes(`TOTALYTD ( [Receita], dCalendario[Data], "30/06" )`), fiscal);

  const soDuas = medidasDAX({
    base: "Receita", expressaoBase: "", tabelaCalendario: "dCalendario", colunaData: "Data",
    inicioAnoFiscal: 1, escolhas: ["mtd", "acumulado"], formato: "",
  });
  confere("gera só o que foi pedido", soDuas.includes("MTD") && soDuas.includes("acumulado") && !soDuas.includes("YoY"));

  const dependencia = medidasDAX({
    base: "Receita", expressaoBase: "", tabelaCalendario: "dCalendario", colunaData: "Data",
    inicioAnoFiscal: 1, escolhas: ["yoy"], formato: "",
  });
  confere("pedir só a variação traz a medida de que ela depende", dependencia.includes("Receita ano anterior ="));
}

console.log("\nPasso a passo");
{
  const p = passoAPasso(base);
  confere("começa pelos feriados quando eles existem", p[0].includes("feriados"));
  confere("manda marcar como tabela de datas", p.some((x) => x.includes("Marcar como tabela de datas")));
  confere("manda criar o relacionamento", p.some((x) => x.includes("um para muitos")));
  confere("fala de ano fiscal só quando tem", !p.some((x) => x.includes("Ano fiscal")) && passoAPasso({ ...base, inicioAnoFiscal: 7 }).some((x) => x.includes("Ano fiscal")));
}

console.log(`\n${ok}/${ok + falhas} verificações passaram.`);
process.exit(falhas ? 1 : 0);
