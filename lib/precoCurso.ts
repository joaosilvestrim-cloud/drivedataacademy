/* Preço de treinamento. Só assinante compra, e paga o preço de assinante.
   Sem "server-only": o catálogo, a página do curso e o admin usam o mesmo cálculo.

   subscriber_price vazio = ainda não está à venda
   subscriber_price 0     = incluso na assinatura
   subscriber_price >= 5  = preço cobrado do assinante (mínimo do Asaas) */

export const VALOR_MINIMO_CURSO = 5;

// Cartão parcela em até 12x, sem parcela abaixo do mínimo do Asaas.
export const MAX_PARCELAS = 12;
export function parcelasPossiveis(preco: number): number {
  return Math.max(1, Math.min(MAX_PARCELAS, Math.floor(preco / VALOR_MINIMO_CURSO)));
}

export function descontoCurso(cheio: number, assinante: number | null): number {
  if (!(cheio > 0) || assinante == null || !(assinante >= 0) || assinante >= cheio) return 0;
  return Math.floor((1 - assinante / cheio) * 100);
}

export function brl(v: number): string {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
