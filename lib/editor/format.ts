import type { Binding, FormatoNum } from "./types";

/** Tipos de elemento cujo valor dinâmico é exibido como TEXTO (seguro formatar).
 *  Os demais (gauge, progresso, waffle…) usam o valor como número dentro do CSS
 *  e NÃO podem receber FORMAT, senão o SVG/estilo quebra. */
export const TIPOS_FORMATAVEIS = new Set([
  "texto", "kpi", "badge", "cartao", "chip", "tendencia",
  "divisorRotulo", "comparativo", "kpiCompleto", "comparaAB", "botao",
]);

export const FORMATOS: { id: FormatoNum; rotulo: string }[] = [
  { id: "auto", rotulo: "Automático" },
  { id: "moeda", rotulo: "Moeda (R$)" },
  { id: "percent", rotulo: "Percentual (fração)" },
  { id: "percentPronto", rotulo: "Percentual (já em %)" },
  { id: "milhar", rotulo: "Milhar (K/M)" },
  { id: "inteiro", rotulo: "Inteiro" },
  { id: "dec1", rotulo: "1 casa decimal" },
  { id: "dec2", rotulo: "2 casas decimais" },
  { id: "custom", rotulo: "Máscara própria…" },
];

/** Expressão DAX que devolve a referência dinâmica já formatada como texto. */
export function daxFormatado(ref: string, b: Binding): string {
  switch (b.formato ?? "auto") {
    case "moeda":
      return `"R$ " & FORMAT ( ${ref}, "#,##0.00" )`;
    case "percent":
      return `FORMAT ( ${ref}, "0%" )`;
    case "percentPronto":
      return `FORMAT ( ${ref}, "#,##0" ) & "%"`;
    case "inteiro":
      return `FORMAT ( ${ref}, "#,##0" )`;
    case "dec1":
      return `FORMAT ( ${ref}, "#,##0.0" )`;
    case "dec2":
      return `FORMAT ( ${ref}, "#,##0.00" )`;
    case "milhar":
      return (
        `SWITCH ( TRUE (),\n` +
        `        ABS ( ${ref} ) >= 1000000, FORMAT ( ${ref} / 1000000, "#,##0.0" ) & "M",\n` +
        `        ABS ( ${ref} ) >= 1000,    FORMAT ( ${ref} / 1000, "#,##0.0" ) & "K",\n` +
        `        FORMAT ( ${ref}, "#,##0" ) )`
      );
    case "custom": {
      const m = (b.mascara ?? "").trim();
      return m ? `FORMAT ( ${ref}, "${m.replace(/"/g, '""')}" )` : ref;
    }
    default:
      return ref; // auto → valor bruto
  }
}

/** Formata o valor de AMOSTRA no preview (JS), aproximando o resultado da DAX. */
export function amostraFormatada(valor: string, b: Binding): string {
  if (!b.dinamico) return valor;
  const f = b.formato ?? "auto";
  if (f === "auto" || f === "custom") return valor;
  // interpreta o texto de amostra como número (aceita "1.234,56" pt-BR ou "1234.56")
  const bruto = String(valor).trim().replace(/[^\d.,-]/g, "");
  const norm = bruto.includes(",") ? bruto.replace(/\./g, "").replace(",", ".") : bruto;
  const n = Number(norm);
  if (!isFinite(n) || bruto === "") return valor;
  const br = (x: number, d: number) =>
    x.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
  switch (f) {
    case "moeda":
      return "R$ " + br(n, 2);
    case "percent":
      return br(n * 100, 0) + "%";
    case "percentPronto":
      return br(Math.round(n), 0) + "%";
    case "inteiro":
      return br(Math.round(n), 0);
    case "dec1":
      return br(n, 1);
    case "dec2":
      return br(n, 2);
    case "milhar":
      if (Math.abs(n) >= 1e6) return br(n / 1e6, 1) + "M";
      if (Math.abs(n) >= 1e3) return br(n / 1e3, 1) + "K";
      return br(n, 0);
    default:
      return valor;
  }
}
