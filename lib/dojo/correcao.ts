import type { Base } from "./dados";
import type { Desafio } from "./desafios";

/* Correção do treino.

   Duas notas separadas, de propósito. O número diz se a pessoa entendeu o
   problema. A fórmula diz se ela sabe escrever a solução. Acertar o número com
   a fórmula errada é o caso mais comum, e é justamente o que costuma quebrar
   quando a base cresce: por isso o retorno aponta os dois.

   A leitura da fórmula é por pedaço obrigatório, não por texto idêntico:
   existe mais de um jeito certo de escrever a mesma medida. */

export type Veredito = {
  acertou: boolean;
  valorOk: boolean;
  formulaOk: boolean;
  esperado: number;
  faltou: string[];
  alertas: string[];
  recado: string;
};

/** Aceita "1.234,56", "1234.56" e "R$ 1.234,56". */
export function numeroDigitado(bruto: string): number | null {
  const limpo = String(bruto ?? "").replace(/[^\d,.-]/g, "").trim();
  if (!limpo) return null;
  const temVirgula = limpo.includes(",");
  const normal = temVirgula ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

export function formatar(valor: number, formato: Desafio["formato"]): string {
  if (formato === "moeda") return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  if (formato === "percentual") return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

/** Tira comentário e espaço extra, para o teste de conteúdo não se perder no formato. */
export function normalizar(formula: string): string {
  return String(formula ?? "")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|\s)\/\/.*$/gm, " ")
    .replace(/--.*$/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function corrigir(desafio: Desafio, base: Base, resposta: { valor: string; formula: string }): Veredito {
  const esperado = desafio.valor(base);
  const digitado = numeroDigitado(resposta.valor);

  /* Tolerância proporcional: um centavo em conta de milhar é arredondamento,
     não erro. Em número pequeno, a folga vira meio ponto. */
  const folga = Math.max(0.02, Math.abs(esperado) * 0.001);
  const valorOk = digitado != null && Math.abs(digitado - esperado) <= folga;

  const formula = normalizar(resposta.formula);
  const faltou = formula ? desafio.precisa.filter((p) => !p.padrao.test(formula)).map((p) => p.nome) : desafio.precisa.map((p) => p.nome);
  const alertas = (desafio.evitar ?? []).filter((e) => e.padrao.test(formula)).map((e) => e.recado);
  const formulaOk = !!formula && faltou.length === 0 && alertas.length === 0;

  let recado: string;
  if (valorOk && formulaOk) recado = "Número certo e fórmula certa. É isso.";
  else if (valorOk && !formula) recado = "O número está certo. Escreva a fórmula para fechar o desafio: é ela que você vai usar no trabalho.";
  else if (valorOk && alertas.length) recado = "O número bateu, mas a fórmula tem um atalho que quebra na base real.";
  else if (valorOk) recado = `O número está certo, mas a fórmula não usa ${faltou.join(" e ")}.`;
  else if (digitado == null) recado = "Faltou o número. Calcule a resposta e escreva no campo.";
  else if (formulaOk) recado = "A fórmula está certa, então o erro está na conta ou na leitura da base. Confira coluna por coluna.";
  else recado = "Ainda não. Compare o que o enunciado pede com o que a sua fórmula está somando.";

  return { acertou: valorOk && formulaOk, valorOk, formulaOk, esperado, faltou, alertas, recado };
}
