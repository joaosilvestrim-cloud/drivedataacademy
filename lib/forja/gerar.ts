import { feriadosValidos } from "./feriados";

/* Forja DAX: gera o código que o aluno cola no Power BI.

   A régua aqui é uma só: o que sai daqui tem que ser o que a gente escreveria
   num projeto de cliente. Nome de coluna em português de gente, comentário
   explicando a decisão, ano fiscal tratado de verdade e feriado móvel no lugar
   certo. Gerador que cospe código que ninguém defenderia numa revisão não
   serve para ensinar. */

export type Idioma = "pt" | "en";

export type OpcoesCalendario = {
  tabela: string;
  coluna: string;
  /** De onde vem o intervalo: da tabela de fatos, ou dos anos escolhidos. */
  origem: "fato" | "anos";
  fatoTabela: string;
  fatoColuna: string;
  de: number;
  ate: number;
  /** 1 = janeiro. Ano fiscal diferente muda YTD e a numeração dos meses. */
  inicioAnoFiscal: number;
  idioma: Idioma;
  feriados: boolean;
  tabelaFeriados: string;
};

export type OpcoesMedidas = {
  base: string;
  expressaoBase: string;
  tabelaCalendario: string;
  colunaData: string;
  inicioAnoFiscal: number;
  escolhas: string[];
  formato: string;
};

export const PADROES = [
  { chave: "ytd", nome: "Acumulado no ano (YTD)", desc: "Soma do início do ano até a data em contexto." },
  { chave: "mtd", nome: "Acumulado no mês (MTD)", desc: "Soma do início do mês até a data em contexto." },
  { chave: "ano_anterior", nome: "Mesmo período do ano anterior", desc: "A base de comparação de quase todo painel." },
  { chave: "yoy", nome: "Variação contra o ano anterior (%)", desc: "Crescimento na mesma janela, um ano antes." },
  { chave: "mes_anterior", nome: "Mês anterior", desc: "O mês imediatamente anterior ao contexto." },
  { chave: "mom", nome: "Variação contra o mês anterior (%)", desc: "Crescimento mês a mês." },
  { chave: "media_movel", nome: "Média móvel de 3 meses", desc: "Alisa sazonalidade e ruído de calendário." },
  { chave: "acumulado", nome: "Acumulado desde sempre", desc: "Soma corrida, sem reiniciar no ano." },
];

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const ULTIMO_DIA = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/* Junta os argumentos do ADDCOLUMNS.

   Não dá para fazer isso com um join simples: a lista tem comentários no meio,
   e comentário não leva vírgula. Juntar tudo com vírgula empurra o separador
   para dentro do comentário, e aí o DAX perde a separação entre um argumento e
   o seguinte. O erro só apareceria quando o aluno colasse no Power BI, que é o
   pior lugar para descobrir. */
function juntarArgumentos(linhas: string[]): string {
  const ehComentario = (l: string) => l.trim().startsWith("//");
  return linhas
    .map((linha, i) => {
      if (ehComentario(linha)) return linha;
      const restam = linhas.slice(i + 1).some((l) => !ehComentario(l));
      return restam ? `${linha},` : linha;
    })
    .join("\n");
}

/** Nome com espaço ou acento precisa de aspas simples em DAX. */
export const ref = (tabela: string, coluna: string) =>
  (/^[A-Za-z_][A-Za-z0-9_]*$/.test(tabela) ? tabela : `'${tabela}'`) + `[${coluna}]`;

const nomes = (idioma: Idioma) =>
  idioma === "pt"
    ? {
        ano: "Ano", mes: "Mês", nomeMes: "Nome do mês", mesAbrev: "Mês abreviado", anoMes: "Ano mês",
        trimestre: "Trimestre", semestre: "Semestre", dia: "Dia", diaSemana: "Dia da semana",
        nomeDiaSemana: "Nome do dia", fimDeSemana: "É fim de semana", feriado: "Feriado",
        ehFeriado: "É feriado", diaUtil: "É dia útil", anoFiscal: "Ano fiscal", mesFiscal: "Mês fiscal",
        inicioMes: "Início do mês", ordemMes: "Ordem do mês",
      }
    : {
        ano: "Year", mes: "Month", nomeMes: "Month name", mesAbrev: "Month short", anoMes: "Year month",
        trimestre: "Quarter", semestre: "Semester", dia: "Day", diaSemana: "Weekday",
        nomeDiaSemana: "Weekday name", fimDeSemana: "Is weekend", feriado: "Holiday",
        ehFeriado: "Is holiday", diaUtil: "Is workday", anoFiscal: "Fiscal year", mesFiscal: "Fiscal month",
        inicioMes: "Month start", ordemMes: "Month order",
      };

/* ------------------------------------------------------------------ feriados */

export function feriadosDAX(o: OpcoesCalendario): string {
  const lista = feriadosValidos(o.de, o.ate);
  const linhas = lista.map((f) => `        { "${f.data}", "${f.nome}" }`).join(",\n");
  return `// Feriados nacionais de ${o.de} a ${o.ate}, com os móveis já calculados
// a partir da Páscoa de cada ano. Carnaval, Sexta-feira Santa e Corpus Christi
// mudam de data todo ano: é por isso que esta tabela existe em vez de uma
// regra fixa dentro do calendário.
${o.tabelaFeriados} =
DATATABLE (
    "Data", DATETIME,
    "Feriado", STRING,
    {
${linhas}
    }
)`;
}

/* ---------------------------------------------------------------- calendário */

export function calendarioDAX(o: OpcoesCalendario): string {
  const n = nomes(o.idioma);
  const col = `[${o.coluna}]`;
  const fiscal = o.inicioAnoFiscal !== 1;
  const idioma = o.idioma === "pt" ? "pt-BR" : "en-US";

  const intervalo =
    o.origem === "fato"
      ? `VAR PrimeiraData = MIN ( ${ref(o.fatoTabela, o.fatoColuna)} )
VAR UltimaData = MAX ( ${ref(o.fatoTabela, o.fatoColuna)} )
// O calendário precisa começar em 1º de janeiro e terminar em 31 de dezembro,
// senão a inteligência de tempo do DAX quebra nas bordas da série.
VAR Inicio = DATE ( YEAR ( PrimeiraData ), 1, 1 )
VAR Fim = DATE ( YEAR ( UltimaData ), 12, 31 )`
      : `VAR Inicio = DATE ( ${o.de}, 1, 1 )
VAR Fim = DATE ( ${o.ate}, 12, 31 )`;

  const colunas: string[] = [
    `    "${n.ano}", YEAR ( ${col} )`,
    `    "${n.mes}", MONTH ( ${col} )`,
    `    "${n.nomeMes}", FORMAT ( ${col}, "mmmm", "${idioma}" )`,
    `    "${n.mesAbrev}", FORMAT ( ${col}, "mmm", "${idioma}" )`,
    `    // Texto que ordena sozinho: 2026-03 vem depois de 2026-02 em qualquer visual.`,
    `    "${n.anoMes}", FORMAT ( ${col}, "yyyy-mm" )`,
    `    // Use esta coluna para ordenar "${n.nomeMes}" em Classificar por coluna.`,
    `    "${n.ordemMes}", YEAR ( ${col} ) * 100 + MONTH ( ${col} )`,
    `    "${n.inicioMes}", EOMONTH ( ${col}, -1 ) + 1`,
    `    "${n.trimestre}", "T" & QUARTER ( ${col} )`,
    `    "${n.semestre}", "S" & IF ( MONTH ( ${col} ) <= 6, 1, 2 )`,
    `    "${n.dia}", DAY ( ${col} )`,
    `    // Segunda = 1, domingo = 7. É a contagem que todo mundo espera ler.`,
    `    "${n.diaSemana}", WEEKDAY ( ${col}, 2 )`,
    `    "${n.nomeDiaSemana}", FORMAT ( ${col}, "dddd", "${idioma}" )`,
    `    "${n.fimDeSemana}", WEEKDAY ( ${col}, 2 ) > 5`,
  ];

  if (fiscal) {
    const mesInicio = o.inicioAnoFiscal;
    colunas.push(
      `    // Ano fiscal começa em ${MESES[mesInicio - 1]}: o ano é o do fechamento.`,
      `    "${n.anoFiscal}", YEAR ( ${col} ) + IF ( MONTH ( ${col} ) >= ${mesInicio}, 1, 0 )`,
      `    "${n.mesFiscal}", MOD ( MONTH ( ${col} ) - ${mesInicio}, 12 ) + 1`
    );
  }

  if (o.feriados) {
    const dataFeriado = ref(o.tabelaFeriados, "Data");
    const nomeFeriado = ref(o.tabelaFeriados, "Feriado");
    colunas.push(
      `    "${n.feriado}", LOOKUPVALUE ( ${nomeFeriado}, ${dataFeriado}, ${col} )`,
      `    "${n.ehFeriado}", NOT ISBLANK ( LOOKUPVALUE ( ${nomeFeriado}, ${dataFeriado}, ${col} ) )`,
      `    // Dia útil de verdade: fora do fim de semana e fora do feriado.`,
      `    "${n.diaUtil}", WEEKDAY ( ${col}, 2 ) <= 5 && ISBLANK ( LOOKUPVALUE ( ${nomeFeriado}, ${dataFeriado}, ${col} ) )`
    );
  }

  return `// Tabela de calendário do modelo.
// Depois de criar: marque como tabela de datas em Ferramentas de tabela,
// usando a coluna ${o.coluna}, e ligue ${ref(o.fatoTabela, o.fatoColuna)}
// a ${ref(o.tabela, o.coluna)} em um relacionamento de um para muitos.
${o.tabela} =
${intervalo}
VAR Dias = SELECTCOLUMNS ( CALENDAR ( Inicio, Fim ), "${o.coluna}", [Date] )
RETURN
ADDCOLUMNS (
    Dias,
${juntarArgumentos(colunas)}
)`;
}

export function calendarioM(o: OpcoesCalendario): string {
  const n = nomes(o.idioma);
  const cultura = o.idioma === "pt" ? "pt-BR" : "en-US";
  const fiscal = o.inicioAnoFiscal !== 1;

  const passos: string[] = [
    `    Inicio = #date(${o.de}, 1, 1),`,
    `    Fim = #date(${o.ate}, 12, 31),`,
    `    Dias = List.Dates(Inicio, Duration.Days(Fim - Inicio) + 1, #duration(1, 0, 0, 0)),`,
    `    Tabela = Table.FromList(Dias, Splitter.SplitByNothing(), {"${o.coluna}"}),`,
    `    Tipada = Table.TransformColumnTypes(Tabela, {{"${o.coluna}", type date}}),`,
    `    ComAno = Table.AddColumn(Tipada, "${n.ano}", each Date.Year([${o.coluna}]), Int64.Type),`,
    `    ComMes = Table.AddColumn(ComAno, "${n.mes}", each Date.Month([${o.coluna}]), Int64.Type),`,
    `    ComNomeMes = Table.AddColumn(ComMes, "${n.nomeMes}", each Date.MonthName([${o.coluna}], "${cultura}"), type text),`,
    `    ComAnoMes = Table.AddColumn(ComNomeMes, "${n.anoMes}", each Date.ToText([${o.coluna}], "yyyy-MM"), type text),`,
    `    ComOrdem = Table.AddColumn(ComAnoMes, "${n.ordemMes}", each Date.Year([${o.coluna}]) * 100 + Date.Month([${o.coluna}]), Int64.Type),`,
    `    ComTrimestre = Table.AddColumn(ComOrdem, "${n.trimestre}", each "T" & Text.From(Date.QuarterOfYear([${o.coluna}])), type text),`,
    `    ComDia = Table.AddColumn(ComTrimestre, "${n.dia}", each Date.Day([${o.coluna}]), Int64.Type),`,
    `    ComDiaSemana = Table.AddColumn(ComDia, "${n.diaSemana}", each Date.DayOfWeek([${o.coluna}], Day.Monday) + 1, Int64.Type),`,
    `    ComNomeDia = Table.AddColumn(ComDiaSemana, "${n.nomeDiaSemana}", each Date.DayOfWeekName([${o.coluna}], "${cultura}"), type text),`,
    `    ComFimDeSemana = Table.AddColumn(ComNomeDia, "${n.fimDeSemana}", each Date.DayOfWeek([${o.coluna}], Day.Monday) + 1 > 5, type logical)`,
  ];

  let ultimo = "ComFimDeSemana";

  if (fiscal) {
    passos[passos.length - 1] += ",";
    passos.push(
      `    // Ano fiscal começa em ${MESES[o.inicioAnoFiscal - 1]}: o ano é o do fechamento.`,
      `    ComAnoFiscal = Table.AddColumn(ComFimDeSemana, "${n.anoFiscal}", each Date.Year([${o.coluna}]) + (if Date.Month([${o.coluna}]) >= ${o.inicioAnoFiscal} then 1 else 0), Int64.Type),`,
      `    ComMesFiscal = Table.AddColumn(ComAnoFiscal, "${n.mesFiscal}", each Number.Mod(Date.Month([${o.coluna}]) - ${o.inicioAnoFiscal}, 12) + 1, Int64.Type)`
    );
    ultimo = "ComMesFiscal";
  }

  if (o.feriados) {
    const lista = feriadosValidos(o.de, o.ate)
      .map((f) => `        {#date(${f.data.slice(0, 4)}, ${Number(f.data.slice(5, 7))}, ${Number(f.data.slice(8, 10))}), "${f.nome}"}`)
      .join(",\n");
    passos[passos.length - 1] += ",";
    passos.push(
      `    // Feriados nacionais, com os móveis já calculados pela Páscoa de cada ano.`,
      `    Feriados = #table({"Data", "${n.feriado}"}, {\n${lista}\n    }),`,
      `    ComFeriado = Table.NestedJoin(${ultimo}, {"${o.coluna}"}, Feriados, {"Data"}, "f", JoinKind.LeftOuter),`,
      `    NomeFeriado = Table.AddColumn(ComFeriado, "${n.feriado}", each try Table.First([f])[${n.feriado}] otherwise null, type text),`,
      `    SemAuxiliar = Table.RemoveColumns(NomeFeriado, {"f"}),`,
      `    ComDiaUtil = Table.AddColumn(SemAuxiliar, "${n.diaUtil}", each Date.DayOfWeek([${o.coluna}], Day.Monday) + 1 <= 5 and [${n.feriado}] = null, type logical)`
    );
    ultimo = "ComDiaUtil";
  }

  return `// Tabela de calendário em Power Query.
// Cole em Página inicial, Transformar dados, Nova consulta, Consulta em branco,
// Editor avançado. Depois marque como tabela de datas no modelo.
let
${passos.join("\n")}
in
    ${ultimo}`;
}

/* ------------------------------------------------------------------ medidas */

export function medidasDAX(o: OpcoesMedidas): string {
  const data = ref(o.tabelaCalendario, o.colunaData);
  const base = `[${o.base}]`;
  const anoAnterior = `${o.base} ano anterior`;
  const mesAnterior = `${o.base} mês anterior`;
  const fiscal = o.inicioAnoFiscal !== 1;
  const fimFiscal = fiscal
    ? `, "${String(ULTIMO_DIA[(o.inicioAnoFiscal + 10) % 12]).padStart(2, "0")}/${String(((o.inicioAnoFiscal + 10) % 12) + 1).padStart(2, "0")}"`
    : "";

  const blocos: string[] = [];

  if (o.expressaoBase.trim()) {
    blocos.push(`// A medida base. Tudo abaixo se apoia nela: mude aqui e o resto acompanha.
${o.base} = ${o.expressaoBase.trim()}
// Formato sugerido: ${o.formato}`);
  }

  const quer = (c: string) => o.escolhas.includes(c);

  if (quer("ytd")) {
    blocos.push(`// Do primeiro dia do ano ${fiscal ? "fiscal " : ""}até a data em contexto.${fiscal ? `\n// O ano fiscal fecha em ${fimFiscal.replace(', "', "").replace('"', "")}, e é isso que o terceiro argumento diz.` : ""}
${o.base} YTD = TOTALYTD ( ${base}, ${data}${fimFiscal} )`);
  }

  if (quer("mtd")) {
    blocos.push(`// Do primeiro dia do mês até a data em contexto.
${o.base} MTD = TOTALMTD ( ${base}, ${data} )`);
  }

  if (quer("ano_anterior") || quer("yoy")) {
    blocos.push(`// A mesma janela de tempo, um ano antes. SAMEPERIODLASTYEAR respeita
// o filtro que estiver no visual, seja dia, mês ou trimestre.
${anoAnterior} = CALCULATE ( ${base}, SAMEPERIODLASTYEAR ( ${data} ) )`);
  }

  if (quer("yoy")) {
    blocos.push(`// DIVIDE em vez da barra: sem ano anterior, devolve vazio em vez de erro.
${o.base} YoY % = DIVIDE ( ${base} - [${anoAnterior}], [${anoAnterior}] )
// Formato sugerido: percentual com uma casa`);
  }

  if (quer("mes_anterior") || quer("mom")) {
    blocos.push(`// O mês anterior ao contexto. DATEADD anda no calendário, não na tabela.
${mesAnterior} = CALCULATE ( ${base}, DATEADD ( ${data}, -1, MONTH ) )`);
  }

  if (quer("mom")) {
    blocos.push(`${o.base} MoM % = DIVIDE ( ${base} - [${mesAnterior}], [${mesAnterior}] )
// Formato sugerido: percentual com uma casa`);
  }

  if (quer("media_movel")) {
    blocos.push(`// Média dos últimos três meses, contando a partir da data em contexto.
// Serve para tirar o ruído de mês curto e de sazonalidade.
${o.base} média 3 meses =
VAR Periodo = DATESINPERIOD ( ${data}, MAX ( ${data} ), -3, MONTH )
RETURN
    DIVIDE ( CALCULATE ( ${base}, Periodo ), 3 )`);
  }

  if (quer("acumulado")) {
    blocos.push(`// Soma corrida desde o começo da série, sem reiniciar no ano.
// ALL no calendário tira o filtro de data e deixa só o "até aqui".
${o.base} acumulado =
VAR Ultima = MAX ( ${data} )
RETURN
    CALCULATE ( ${base}, ${o.tabelaCalendario}, ${data} <= Ultima )`);
  }

  return blocos.join("\n\n");
}

/* ---------------------------------------------------------------- instruções */

export function passoAPasso(o: OpcoesCalendario): string[] {
  const passos = [
    o.feriados
      ? `Crie primeiro a tabela de feriados: Modelagem, Nova tabela, e cole o código de feriados. O calendário depende dela.`
      : `Abra o Power BI Desktop com o seu modelo.`,
    `Modelagem, Nova tabela, e cole o código do calendário. A tabela ${o.tabela} aparece no painel de dados.`,
    `Selecione ${o.tabela}, vá em Ferramentas de tabela, Marcar como tabela de datas, e escolha a coluna ${o.coluna}. Sem esta marcação, a inteligência de tempo do DAX não é confiável.`,
    `Em Modelo, ligue ${ref(o.fatoTabela, o.fatoColuna)} a ${ref(o.tabela, o.coluna)}. Cardinalidade um para muitos, direção do filtro simples, do calendário para o fato.`,
    `Esconda a coluna de data da tabela de fatos. A partir de agora, todo eixo de tempo do relatório sai do calendário, e não do fato.`,
  ];
  if (o.inicioAnoFiscal !== 1) {
    passos.push(`Nos visuais que usam ano fiscal, use as colunas Ano fiscal e Mês fiscal, e ordene Mês fiscal por ele mesmo.`);
  }
  passos.push(`Cole as medidas em uma tabela de medidas, ou na tabela de fatos, e defina o formato de cada uma.`);
  return passos;
}
