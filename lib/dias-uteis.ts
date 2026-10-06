/* Dias úteis no Brasil, para o prazo de reembolso.

   A regra da Academy: o aluno pode pedir reembolso em até 7 dias úteis depois
   da compra. O dia da compra não conta; o primeiro dia útil seguinte é o dia 1.
   Sábado, domingo e feriado nacional não contam. Carnaval e Corpus Christi são
   ponto facultativo federal, mas entram como não úteis: na dúvida, o prazo
   fica a favor de quem comprou.

   Tudo no fuso de Brasília, para uma compra às 22h não virar o dia seguinte. */

const FUSO = "America/Sao_Paulo";
export const PRAZO_REEMBOLSO_DIAS_UTEIS = 7;

/** "2026-10-06" no fuso de Brasília. */
export function diaLocal(d: Date | string): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: FUSO }).format(typeof d === "string" ? new Date(d) : d);
}

function somaDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/* Domingo de Páscoa pelo algoritmo de Meeus/Jones/Butcher. */
function pascoa(ano: number): string {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

const cache = new Map<number, Set<string>>();
function feriados(ano: number): Set<string> {
  if (cache.has(ano)) return cache.get(ano)!;
  const fixos = ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"].map((md) => `${ano}-${md}`);
  const p = pascoa(ano);
  const moveis = [somaDias(p, -48), somaDias(p, -47), somaDias(p, -2), somaDias(p, 60)]; // carnaval (2), sexta santa, corpus christi
  const s = new Set([...fixos, ...moveis]);
  cache.set(ano, s);
  return s;
}

export function ehDiaUtil(dia: string): boolean {
  const semana = new Date(`${dia}T12:00:00Z`).getUTCDay();
  if (semana === 0 || semana === 6) return false;
  return !feriados(Number(dia.slice(0, 4))).has(dia);
}

/** Dias úteis completos depois do dia da compra até o dia de `fim` (inclusive). */
export function diasUteisDepois(compra: Date | string, fim: Date | string): number {
  const ini = diaLocal(compra);
  const ate = diaLocal(fim);
  let n = 0;
  for (let dia = somaDias(ini, 1); dia <= ate; dia = somaDias(dia, 1)) if (ehDiaUtil(dia)) n++;
  return n;
}

/** Último dia (YYYY-MM-DD) em que ainda dá para pedir reembolso. */
export function ultimoDiaDeReembolso(compra: Date | string, dias = PRAZO_REEMBOLSO_DIAS_UTEIS): string {
  let dia = diaLocal(compra);
  let n = 0;
  while (n < dias) {
    dia = somaDias(dia, 1);
    if (ehDiaUtil(dia)) n++;
  }
  return dia;
}

/** "15/10" a partir de "2026-10-15". */
export function diaCurto(dia: string): string {
  return `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
}

/** Situação do prazo hoje (ou num momento dado, como a data do pedido de cancelamento). */
export function prazoDeReembolso(compra: Date | string, momento: Date | string = new Date()) {
  const ultimo = ultimoDiaDeReembolso(compra);
  const decorridos = diasUteisDepois(compra, momento);
  return { decorridos, ultimo, dentro: diaLocal(momento) <= ultimo };
}
