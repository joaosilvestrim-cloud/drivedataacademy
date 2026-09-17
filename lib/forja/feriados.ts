/* Feriados nacionais brasileiros, calculados.

   Os fixos qualquer um escreve. O problema são os móveis: Carnaval, Sexta-feira
   Santa e Corpus Christi andam junto com a Páscoa, que muda todo ano. Quase
   toda tabela de calendário que se vê por aí ignora isso, e aí "dia útil" fica
   errado em cinco dias do ano, justamente os que mais aparecem em análise de
   venda e de produção.

   A data da Páscoa sai do algoritmo de Meeus/Jones/Butcher, o mesmo que a
   Igreja usa desde 1583: aritmética pura, sem tabela decorada, válido para
   qualquer ano do calendário gregoriano. */

export type Feriado = { data: string; nome: string; movel: boolean };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const somaDias = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

export function pascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

export function feriadosBR(ano: number): Feriado[] {
  const p = pascoa(ano);
  const fixos: [number, number, string][] = [
    [1, 1, "Confraternização Universal"],
    [4, 21, "Tiradentes"],
    [5, 1, "Dia do Trabalho"],
    [9, 7, "Independência"],
    [10, 12, "Nossa Senhora Aparecida"],
    [11, 2, "Finados"],
    [11, 15, "Proclamação da República"],
    [11, 20, "Consciência Negra"],
    [12, 25, "Natal"],
  ];

  const lista: Feriado[] = fixos.map(([mes, dia, nome]) => ({
    data: iso(new Date(Date.UTC(ano, mes - 1, dia))),
    nome,
    movel: false,
  }));

  // Os móveis, contados a partir do domingo de Páscoa.
  lista.push(
    { data: iso(somaDias(p, -48)), nome: "Carnaval (segunda)", movel: true },
    { data: iso(somaDias(p, -47)), nome: "Carnaval", movel: true },
    { data: iso(somaDias(p, -46)), nome: "Quarta-feira de Cinzas", movel: true },
    { data: iso(somaDias(p, -2)), nome: "Sexta-feira Santa", movel: true },
    { data: iso(p), nome: "Páscoa", movel: true },
    { data: iso(somaDias(p, 60)), nome: "Corpus Christi", movel: true }
  );

  return lista.sort((a, b) => a.data.localeCompare(b.data));
}

export function feriadosNoIntervalo(de: number, ate: number): Feriado[] {
  const anos = [];
  for (let ano = Math.min(de, ate); ano <= Math.max(de, ate); ano++) anos.push(ano);
  return anos.flatMap(feriadosBR);
}

/* O Consciência Negra virou feriado nacional só em 2024. Antes disso era
   estadual em parte do país, então gerar para trás distorce a série. */
export function feriadosValidos(de: number, ate: number): Feriado[] {
  return feriadosNoIntervalo(de, ate).filter((f) => !(f.nome === "Consciência Negra" && Number(f.data.slice(0, 4)) < 2024));
}
