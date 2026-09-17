/* Testes do motor do Raio-X.
 *
 * Duas frentes:
 *
 * 1. Arquivos montados aqui dentro, com zip de verdade, no formato que o Power
 *    BI grava. Cada regra tem um caso que deveria acusar e o relatório limpo,
 *    que não pode acusar nada. É o que roda no CI e a cada mudança de regra.
 *
 * 2. Arquivos de verdade, quando passados por argumento:
 *    npx tsx scripts/test-raiox.ts "C:/caminho/arquivo.pbix"
 *
 * Rodar: npm run test:raiox
 */

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { zipSync, strToU8 } from "fflate";
import { extrairRelatorio } from "../lib/raiox/extrair";
import { auditar } from "../lib/raiox/regras";
import type { Laudo } from "../lib/raiox/tipos";

/* ------------------------------------------------------------------ fixtures */

const utf16 = (texto: string) => {
  const bytes = new Uint8Array(texto.length * 2);
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    bytes[i * 2] = c & 0xff;
    bytes[i * 2 + 1] = c >> 8;
  }
  return bytes;
};

type VisualFake = {
  tipo: string;
  x?: number; y?: number; w?: number; h?: number;
  campos?: { tabela: string; campo: string; medida?: boolean }[];
  titulo?: string | null;   // null = título automático
  semTitulo?: boolean;
};

type PaginaFake = { nome: string; largura?: number; altura?: number; visuais: VisualFake[] };

/* Um .pbix no formato novo (PBIR): um json por página e um por visual. */
function pbix(paginas: PaginaFake[], extras: Record<string, Uint8Array> = {}) {
  const arquivos: Record<string, Uint8Array> = {
    Version: strToU8("1.0"),
    "Report/definition/pages/pages.json": strToU8(JSON.stringify({ pageOrder: paginas.map((_, i) => `p${i}`) })),
    ...extras,
  };

  paginas.forEach((pg, i) => {
    arquivos[`Report/definition/pages/p${i}/page.json`] = strToU8(
      JSON.stringify({ name: `p${i}`, displayName: pg.nome, width: pg.largura ?? 1280, height: pg.altura ?? 720 })
    );
    pg.visuais.forEach((v, j) => {
      const projections = (v.campos ?? []).map((c) => ({
        field: c.medida
          ? { Measure: { Expression: { SourceRef: { Entity: c.tabela } }, Property: c.campo } }
          : { Column: { Expression: { SourceRef: { Entity: c.tabela } }, Property: c.campo } },
        queryRef: `${c.tabela}.${c.campo}`,
      }));
      const title: any[] = [];
      if (v.titulo) title.push({ properties: { text: { expr: { Literal: { Value: `'${v.titulo}'` } } } } });
      if (v.semTitulo) title.push({ properties: { show: { expr: { Literal: { Value: "false" } } } } });
      arquivos[`Report/definition/pages/p${i}/visuals/v${j}/visual.json`] = strToU8(
        JSON.stringify({
          name: `v${j}`,
          position: { x: v.x ?? 0, y: v.y ?? 0, width: v.w ?? 200, height: v.h ?? 150 },
          visual: {
            visualType: v.tipo,
            query: { queryState: { Values: { projections } } },
            visualContainerObjects: title.length ? { title } : {},
          },
        })
      );
    });
  });

  return zipSync(arquivos);
}

/* Um .pbit: o mesmo relatório, mais o modelo em DataModelSchema (UTF-16). */
function pbit(paginas: PaginaFake[], modelo: any) {
  return pbix(paginas, { DataModelSchema: utf16(JSON.stringify({ name: "Modelo", model: modelo })) });
}

/* Um .pbix no formato antigo, com o Layout único em UTF-16. */
function pbixAntigo(paginas: PaginaFake[]) {
  const sections = paginas.map((pg, i) => ({
    name: `s${i}`,
    displayName: pg.nome,
    width: pg.largura ?? 1280,
    height: pg.altura ?? 720,
    visualContainers: pg.visuais.map((v, j) => ({
      x: v.x ?? 0, y: v.y ?? 0, width: v.w ?? 200, height: v.h ?? 150,
      config: JSON.stringify({
        name: `v${j}`,
        singleVisual: {
          visualType: v.tipo,
          projections: { Values: (v.campos ?? []).map((c) => ({ queryRef: `${c.tabela}.${c.campo}` })) },
          prototypeQuery: {
            Select: (v.campos ?? []).map((c) => ({
              Name: `${c.tabela}.${c.campo}`,
              ...(c.medida
                ? { Measure: { Expression: { SourceRef: { Entity: c.tabela } }, Property: c.campo } }
                : { Column: { Expression: { SourceRef: { Entity: c.tabela } }, Property: c.campo } }),
            })),
          },
          vcObjects: v.titulo ? { title: [{ properties: { text: { expr: { Literal: { Value: `'${v.titulo}'` } } } } }] } : {},
        },
      }),
    })),
  }));
  return zipSync({ Version: strToU8("1.0"), "Report/Layout": utf16(JSON.stringify({ sections })) });
}

const grade = (n: number, tipo = "clusteredBarChart", titulo: string | null = "Receita por mês"): VisualFake[] =>
  Array.from({ length: n }, (_, i) => ({
    tipo, x: (i % 4) * 300, y: Math.floor(i / 4) * 160, w: 280, h: 140,
    titulo: titulo ?? undefined,
    campos: [{ tabela: "fVendas", campo: `Campo${i}`, medida: true }],
  }));

/* -------------------------------------------------------------------- testes */

let ok = 0;
let falhas = 0;

function laudoDe(bytes: Uint8Array, nome = "teste.pbix"): Laudo {
  return auditar(extrairRelatorio(nome, bytes));
}

function acusa(nome: string, laudo: Laudo, regra: string) {
  const achou = laudo.achados.some((a) => a.regra === regra);
  if (achou) { ok++; console.log(`  ok   ${nome}`); }
  else { falhas++; console.log(`  FALHA ${nome}: a regra "${regra}" não acusou (achados: ${laudo.achados.map((a) => a.regra).join(", ") || "nenhum"})`); }
}

function naoAcusa(nome: string, laudo: Laudo, regra: string) {
  const achou = laudo.achados.some((a) => a.regra === regra);
  if (!achou) { ok++; console.log(`  ok   ${nome}`); }
  else { falhas++; console.log(`  FALHA ${nome}: a regra "${regra}" acusou sem motivo`); }
}

function confere(nome: string, condicao: boolean, detalhe = "") {
  if (condicao) { ok++; console.log(`  ok   ${nome}`); }
  else { falhas++; console.log(`  FALHA ${nome}${detalhe ? ": " + detalhe : ""}`); }
}

console.log("\nLeitura dos formatos");
{
  const l = laudoDe(pbix([{ nome: "Visão geral", visuais: grade(4) }]));
  confere("pbix novo (PBIR) é lido", l.resumo.paginas === 1 && l.resumo.visuais === 4, `veio ${l.resumo.paginas}p/${l.resumo.visuais}v`);
  const antigo = laudoDe(pbixAntigo([{ nome: "Visão geral", visuais: grade(4) }]));
  confere("pbix antigo (Layout) é lido", antigo.resumo.paginas === 1 && antigo.resumo.visuais === 4, `veio ${antigo.resumo.paginas}p/${antigo.resumo.visuais}v`);
  let recusou = false;
  try { laudoDe(zipSync({ "qualquer.txt": strToU8("nada") })); } catch { recusou = true; }
  confere("arquivo que não é do Power BI é recusado", recusou);
}

console.log("\nRelatório limpo não leva bronca");
{
  const limpo = laudoDe(pbix([{ nome: "Visão geral", visuais: grade(6) }]));
  confere("nota alta no relatório limpo", limpo.nota >= 90, `nota ${limpo.nota}`);
  confere("nenhum achado no relatório limpo", limpo.achados.length === 0, limpo.achados.map((a) => a.regra).join(", "));
}

console.log("\nRegras de design");
{
  acusa("página com 16 visuais é grave", laudoDe(pbix([{ nome: "Painel", visuais: grade(16) }])), "pagina_lotada");
  acusa("visual fora da borda", laudoDe(pbix([{ nome: "Painel", visuais: [{ tipo: "card", x: 1200, y: 0, w: 400, h: 100, titulo: "x" }] }])), "fora_da_pagina");
  acusa("visuais empilhados", laudoDe(pbix([{ nome: "Painel", visuais: [
    { tipo: "card", x: 0, y: 0, w: 200, h: 200, titulo: "a" },
    { tipo: "lineChart", x: 10, y: 10, w: 200, h: 200, titulo: "b" },
  ] }])), "visuais_sobrepostos");
  acusa("visuais fora de grade", laudoDe(pbix([{ nome: "Painel", visuais: [
    { tipo: "card", x: 3, y: 7, w: 100, h: 100, titulo: "a" },
    { tipo: "card", x: 111, y: 7, w: 100, h: 100, titulo: "b" },
    { tipo: "card", x: 219, y: 9, w: 100, h: 100, titulo: "c" },
    { tipo: "card", x: 327, y: 11, w: 100, h: 100, titulo: "d" },
  ] }])), "desalinhado");
  acusa("página fora de 16:9", laudoDe(pbix([{ nome: "Painel", largura: 900, altura: 1600, visuais: grade(2) }])), "fora_16_9");
  acusa("cinco filtros na página", laudoDe(pbix([{ nome: "Painel", visuais: Array.from({ length: 5 }, (_, i) => ({ tipo: "slicer", x: i * 200, y: 0, w: 180, h: 80, titulo: "f" })) }])), "muitos_slicers");
  naoAcusa("botão e imagem não contam como visual", laudoDe(pbix([{ nome: "Painel", visuais: [
    ...grade(6),
    ...Array.from({ length: 8 }, (_, i) => ({ tipo: "actionButton", x: i * 100, y: 600, w: 90, h: 40 })),
  ] }])), "pagina_lotada");
}

console.log("\nRegras de clareza");
{
  acusa("títulos automáticos", laudoDe(pbix([{ nome: "Painel", visuais: grade(5, "clusteredBarChart", null) }])), "titulo_automatico");
  acusa("tabela com 12 colunas", laudoDe(pbix([{ nome: "Painel", visuais: [{
    tipo: "tableEx", titulo: "Detalhe", campos: Array.from({ length: 12 }, (_, i) => ({ tabela: "fVendas", campo: `Col${i}` })),
  }] }])), "tabela_larga");
  acusa("mesma medida em três visuais", laudoDe(pbix([{ nome: "Painel", visuais: Array.from({ length: 3 }, (_, i) => ({
    tipo: "card", x: i * 300, y: 0, w: 280, h: 140, titulo: "Receita", campos: [{ tabela: "Medidas", campo: "Receita", medida: true }],
  })) }])), "medida_repetida");
  acusa("duas pizzas na mesma página", laudoDe(pbix([{ nome: "Painel", visuais: [
    { tipo: "pieChart", x: 0, y: 0, w: 300, h: 300, titulo: "a" },
    { tipo: "donutChart", x: 320, y: 0, w: 300, h: 300, titulo: "b" },
  ] }])), "muitas_pizzas");
}

console.log("\nRegras de estrutura");
{
  acusa("página ainda chamada Página 1", laudoDe(pbix([{ nome: "Página 1", visuais: grade(3) }])), "pagina_sem_nome");
  acusa("visual customizado", laudoDe(pbix([{ nome: "Painel", visuais: grade(3) }], {
    "Report/CustomVisuals/algumVisual/package.json": strToU8("{}"),
  })), "visual_customizado");
  acusa("tabela chamada Planilha1", laudoDe(pbit([{ nome: "Painel", visuais: grade(3) }], {
    tables: [{ name: "Planilha1" }, { name: "dCalendario", dataCategory: "Time" }, { name: "fVendas" }],
    relationships: [],
  }), "teste.pbit"), "tabela_sem_nome");
}

console.log("\nRegras de modelo e DAX (.pbit)");
{
  const modeloRuim = {
    tables: [
      { name: "fVendas", measures: [
        { name: "Receita", expression: "CALCULATE(SUM(fVendas[Valor]), FILTER(fVendas, fVendas[Status] = \"OK\"))", formatString: "#,0.00" },
        { name: "Ticket", expression: "SUM(fVendas[Valor]) / COUNTROWS(fVendas)" },
        { name: "Margem", expression: "DIVIDE([Lucro], [Receita])" },
        { name: "Comissao", expression: "DIVIDE([Receita], 10)" },
        { name: "Meta", expression: "DIVIDE([Receita], 2)" },
      ], columns: [
        { name: "Valor", dataType: "double" },
        { name: "AnoMes", type: "calculated", expression: "FORMAT(fVendas[Data], \"YYYY-MM\")" },
        { name: "Semana", type: "calculated", expression: "WEEKNUM(fVendas[Data])" },
        { name: "Dia", type: "calculated", expression: "DAY(fVendas[Data])" },
        { name: "Mes", type: "calculated", expression: "MONTH(fVendas[Data])" },
        { name: "Ano", type: "calculated", expression: "YEAR(fVendas[Data])" },
        { name: "Trimestre", type: "calculated", expression: "QUARTER(fVendas[Data])" },
      ] },
      { name: "dCliente", columns: [{ name: "ID" }] },
      { name: "dProduto", columns: [{ name: "ID" }] },
    ],
    relationships: [
      { fromTable: "fVendas", fromColumn: "ClienteID", toTable: "dCliente", toColumn: "ID", crossFilteringBehavior: "bothDirections" },
      { fromTable: "fVendas", fromColumn: "ProdutoID", toTable: "dProduto", toColumn: "ID", fromCardinality: "many", toCardinality: "many" },
    ],
  };
  const l = laudoDe(pbit([{ nome: "Painel", visuais: grade(4) }], modeloRuim), "modelo-ruim.pbit");

  confere("o .pbit é reconhecido", l.formato === "pbit", `veio ${l.formato}`);
  confere("laudo do .pbit não é parcial", l.parcial === false);
  confere("as cinco dimensões entram na nota", l.notas.filter((n) => n.completa).length === 5, l.notas.map((n) => `${n.dimensao}:${n.completa}`).join(" "));
  confere("as medidas foram lidas", l.resumo.medidas === 5, `veio ${l.resumo.medidas}`);
  acusa("sem tabela de calendário", l, "sem_tabela_datas");
  acusa("relacionamento bidirecional", l, "bidirecional");
  acusa("muitos para muitos", l, "muitos_para_muitos");
  acusa("colunas calculadas demais", l, "colunas_calculadas");
  acusa("FILTER dentro de CALCULATE", l, "filter_em_calculate");
  acusa("divisão sem DIVIDE", l, "sem_divide");
  acusa("medida sem formato", l, "medida_sem_formato");
  confere("nota do modelo ruim é baixa", l.nota < 70, `nota ${l.nota}`);

  const modeloBom = {
    tables: [
      { name: "dCalendario", dataCategory: "Time", columns: [{ name: "Data", dataType: "dateTime", isKey: true }] },
      { name: "dCliente", columns: [{ name: "ID" }] },
      { name: "fVendas", measures: [
        { name: "Receita", expression: "SUM(fVendas[Valor])", formatString: "\\R$ #,0.00" },
        { name: "Ticket médio", expression: "DIVIDE([Receita], COUNTROWS(fVendas))", formatString: "\\R$ #,0.00" },
      ], columns: [{ name: "Valor" }] },
    ],
    relationships: [
      { fromTable: "fVendas", fromColumn: "Data", toTable: "dCalendario", toColumn: "Data", crossFilteringBehavior: "oneDirection", fromCardinality: "many", toCardinality: "one" },
      { fromTable: "fVendas", fromColumn: "ClienteID", toTable: "dCliente", toColumn: "ID", crossFilteringBehavior: "oneDirection", fromCardinality: "many", toCardinality: "one" },
    ],
  };
  const bom = laudoDe(pbit([{ nome: "Visão geral", visuais: grade(6) }], modeloBom), "modelo-bom.pbit");
  confere("modelo bem feito tira nota alta", bom.nota >= 90, `nota ${bom.nota} (${bom.achados.map((a) => a.regra).join(", ")})`);
}

console.log("\nNota parcial no .pbix");
{
  const l = laudoDe(pbix([{ nome: "Visão geral", visuais: grade(5) }], {
    DiagramLayout: strToU8(JSON.stringify({ diagrams: [{ nodes: [{ nodeIndex: "fVendas" }, { nodeIndex: "dCalendario" }, { nodeIndex: "dCliente" }] }] })),
  }));
  confere("laudo de .pbix é parcial", l.parcial === true);
  confere("tabelas saem do diagrama", l.resumo.tabelas === 3, `veio ${l.resumo.tabelas}`);
  const modelo = l.notas.find((n) => n.dimensao === "modelo");
  confere("modelo entra como parcial, sem valer nota", modelo?.completa === false);
  confere("DAX nem aparece sem o .pbit", !l.notas.some((n) => n.dimensao === "dax"));
}

/* Arquivos de verdade, se vierem por argumento. */
const reais = process.argv.slice(2);
if (reais.length) {
  console.log("\nArquivos de verdade");
  for (const caminho of reais) {
    try {
      const bytes = new Uint8Array(readFileSync(caminho));
      const inicio = Date.now();
      const l = laudoDe(bytes, basename(caminho));
      console.log(`  ok   ${basename(caminho)} (${(bytes.length / 1048576).toFixed(1)} MB, ${l.formato}, ${Date.now() - inicio}ms) nota ${l.nota}, ${l.achados.length} achados`);
      ok++;
    } catch (e: any) {
      console.log(`  FALHA ${basename(caminho)}: ${e?.message || e}`);
      falhas++;
    }
  }
}

console.log(`\n${ok}/${ok + falhas} verificações passaram.`);
process.exit(falhas ? 1 : 0);
