import type { VisualDocument } from "./types";
import { buildScene, esc, sanitizarCor, type ConteudoMapa } from "./render";
import { daxFormatado } from "./format";

const TOKEN = /\{\{([^}]+)\}\}/g;
const CELL = "padding:6px 8px;border-top:1px solid rgba(148,163,184,.18)";

function escapeDax(s: string): string {
  return s.replace(/"/g, '""');
}

function ident(nome: string): string {
  const limpo = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "");
  return limpo || "Campo";
}

export function nomeMedida(doc: VisualDocument): string {
  const base = doc.nome.trim().replace(/[^A-Za-z0-9_ ]/g, "");
  return base || "CARD_VISUAL";
}

function varNames(conteudos: ConteudoMapa[]): Record<string, string> {
  const usados = new Map<string, number>();
  const out: Record<string, string> = {};
  for (const c of conteudos) {
    const base = ident(c.nome);
    const n = (usados.get(base) ?? 0) + 1;
    usados.set(base, n);
    out[c.id] = "_" + base + (n > 1 ? String(n) : "");
  }
  return out;
}

function templateParaDax(str: string, varPorChave: Record<string, string>): string {
  const corpo = escapeDax(str).replace(
    TOKEN,
    (_, k: string) => `" & ${varPorChave[k] ?? '""'} & "`,
  );
  return `"${corpo}"`;
}

export function generateDax(doc: VisualDocument): string {
  const { css, htmlTemplate, conteudos, tabelas, sparklines, coresCond } = buildScene(doc);
  const varPorChave = varNames(conteudos);

  const largura = Math.max(8, ...conteudos.map((c) => varPorChave[c.id].length), 1);

  const linhasVar = conteudos
    .map((c) => {
      const nomeVar = varPorChave[c.id].padEnd(largura);
      if (c.binding.dinamico) {
        const ref = c.binding.ref.trim() || `[${c.nome}]`;
        const expr = daxFormatado(ref, c.binding);
        if (expr.includes("\n")) {
          // formato multi-linha (ex.: milhar K/M) — comentário na 1ª linha, corpo indentado
          return `VAR ${nomeVar} =`.padEnd(46) + `// dinâmico (${c.nome})\n    ${expr}`;
        }
        return `VAR ${nomeVar} = ${expr}`.padEnd(46) + `// dinâmico (${c.nome})`;
      }
      // valor fixo é texto literal → escapa HTML (números não são afetados) e
      // depois a camada de string DAX. Fecha o XSS via visual da comunidade.
      return `VAR ${nomeVar} = "${escapeDax(esc(c.binding.valor))}"`.padEnd(46) + `// fixo (${c.nome})`;
    })
    .join("\n");

  // Tabelas: cada uma vira um CONCATENATEX que monta as <tr> a partir da
  // tabela do usuário. O placeholder {{id__rows}} recebe essa VAR.
  const blocosTabela: string[] = [];
  tabelas.forEach((t, i) => {
    const nomeVar = `_TabRows${i + 1}`;
    varPorChave[t.rowsKey] = nomeVar;
    const celulas = (t.colunas.length ? t.colunas : [{ coluna: t.tabela + "[Coluna]", rotulo: "Coluna" }])
      .map((c) => `        "<td style='${CELL}'>" & ${c.coluna} & "</td>"`)
      .join(" &\n");
    blocosTabela.push(
      `VAR ${nomeVar} =\n` +
        `    CONCATENATEX (\n` +
        `        ${t.tabela},\n` +
        `        "<tr>" &\n${celulas} &\n        "</tr>",\n` +
        `        ""\n` +
        `    )`,
    );
  });

  // Sparklines dinâmicos: uma barra por linha, altura = valor ÷ maior valor.
  const blocosSpark: string[] = [];
  sparklines.forEach((s, i) => {
    const maxVar = `_SparkMax${i + 1}`;
    const rowsVar = `_SparkRows${i + 1}`;
    varPorChave[s.rowsKey] = rowsVar;
    blocosSpark.push(
      `VAR ${maxVar} = MAXX ( ${s.tabela}, ${s.coluna} )\n` +
        `VAR ${rowsVar} =\n` +
        `    CONCATENATEX (\n` +
        `        ${s.tabela},\n` +
        `        "<div style='flex:1;min-width:2px;border-radius:${s.radius}px;background:${sanitizarCor(s.cor)};height:" &\n` +
        `            FORMAT ( DIVIDE ( ${s.coluna}, ${maxVar} ) * 100, "0" ) & "%'></div>",\n` +
        `        ""\n` +
        `    )`,
    );
  });

  // Cores condicionais: SWITCH que escolhe a cor conforme o valor da medida.
  const blocosCor: string[] = [];
  coresCond.forEach((c, i) => {
    const nomeVar = `_Cor${i + 1}`;
    varPorChave[c.corKey] = nomeVar;
    const condicoes = c.regras.slice(0, -1).map((r) => {
      const op = r.op ?? "<=";
      const cond = op === "entre"
        ? `AND ( ${c.ref} >= ${r.ate}, ${c.ref} <= ${r.ate2 ?? r.ate} )`
        : `${c.ref} ${op} ${r.ate}`;
      return `        ${cond}, "${sanitizarCor(r.cor)}"`;
    });
    const senao = `        "${sanitizarCor(c.regras[c.regras.length - 1].cor)}"`;
    blocosCor.push(
      `VAR ${nomeVar} =\n    SWITCH ( TRUE (),\n` +
        (condicoes.length ? condicoes.join(",\n") + ",\n" : "") +
        senao +
        `\n    )` +
        `  // cor por valor (${c.nome})`,
    );
  });

  const cssDax = templateParaDax("<style>" + css + "</style>", varPorChave);
  const bodyDax = templateParaDax(htmlTemplate, varPorChave);

  const semConteudo = conteudos.length === 0 && tabelas.length === 0 && sparklines.length === 0 && coresCond.length === 0 ? "// (sem campos de conteúdo)\n" : "";
  const blocoTabelas = blocosTabela.length
    ? "\n// ───────── TABELAS (CONCATENATEX) ─────────\n" + blocosTabela.join("\n\n") + "\n"
    : "";
  const blocoSpark = blocosSpark.length
    ? "\n// ───────── MINI-GRÁFICOS (CONCATENATEX) ─────────\n" + blocosSpark.join("\n\n") + "\n"
    : "";
  const blocoCor = blocosCor.length
    ? "\n// ───────── CORES CONDICIONAIS (SWITCH) ─────────\n" + blocosCor.join("\n\n") + "\n"
    : "";

  return `${nomeMedida(doc)} =
// ╔══════════════════════════════════════════════════╗
// ║  PARÂMETROS — edite à vontade                     ║
// ║  Fixo = texto entre aspas · Dinâmico = [Medida]   ║
// ╚══════════════════════════════════════════════════╝
${semConteudo}${linhasVar}
${blocoTabelas}${blocoSpark}${blocoCor}
// ───────── HTML/CSS — não precisa mexer ─────────
VAR _Css =
    ${cssDax}

VAR _Body =
    ${bodyDax}

RETURN
    "<!DOCTYPE html><html lang='pt-br'><head><meta charset='UTF-8'>" &
    "<meta name='viewport' content='width=device-width, initial-scale=1.0'>" &
    _Css & "</head><body>" & _Body & "</body></html>"
`;
}
