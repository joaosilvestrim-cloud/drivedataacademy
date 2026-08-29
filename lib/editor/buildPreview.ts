import type { VisualDocument } from "./types";
import { buildScene, corDasRegras } from "./render";
import { amostraFormatada } from "./format";

const TOKEN = /\{\{([^}]+)\}\}/g;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const CELL = "padding:6px 8px;border-top:1px solid rgba(148,163,184,.18)";

/** Documento HTML do preview, com os valores literais atuais. */
export function buildPreview(doc: VisualDocument): string {
  const { css, htmlTemplate, conteudos, tabelas, sparklines, coresCond } = buildScene(doc);
  const porId = Object.fromEntries(conteudos.map((c) => [c.id, c]));

  // cores condicionais resolvidas pelo valor de amostra
  const amostraCor = Object.fromEntries(coresCond.map((c) => [c.corKey, corDasRegras(c.regras, c.amostra)]));

  // barras de amostra para sparklines dinâmicos (no preview não há dados reais)
  const amostraSpark = Object.fromEntries(
    sparklines.map((s) => {
      const vals = [45, 70, 35, 85, 55, 60, 40, 75];
      const max = Math.max(...vals);
      const bars = vals
        .map((v) => `<div style='flex:1;min-width:2px;border-radius:${s.radius}px;background:${s.cor};height:${Math.round((v / max) * 100)}%'></div>`)
        .join("");
      return [s.rowsKey, bars];
    }),
  );

  // linhas de amostra para cada tabela (no preview não há dados reais)
  const amostra = Object.fromEntries(
    tabelas.map((t) => {
      const linhas = Array.from({ length: 3 }, (_, i) =>
        "<tr>" +
        t.colunas
          .map((c, ci) => `<td style='${CELL}'>${ci === 0 ? `Item ${i + 1}` : `${(i + 1) * 100}`}</td>`)
          .join("") +
        "</tr>",
      ).join("");
      return [t.rowsKey, linhas];
    }),
  );

  const html = htmlTemplate.replace(TOKEN, (_, key: string) => {
    if (amostra[key] !== undefined) return amostra[key];
    if (amostraSpark[key] !== undefined) return amostraSpark[key];
    if (amostraCor[key] !== undefined) return amostraCor[key];
    const c = porId[key];
    return c ? escapeHtml(amostraFormatada(c.binding.valor, c.binding)) : "";
  });

  return (
    "<!DOCTYPE html><html lang='pt-br'><head><meta charset='UTF-8'>" +
    "<meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
    "<style>" +
    css +
    "</style></head><body>" +
    html +
    "</body></html>"
  );
}
