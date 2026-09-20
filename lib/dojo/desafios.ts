import { Base, Venda, bruto, custoTotal, liquido, maiorDe, margem, mes, somaPor } from "./dados";

/* Os desafios do treino.

   Cada um cobra duas coisas: o número certo e a fórmula certa. O número prova
   que a pessoa entendeu o problema; a fórmula prova que ela sabe escrever a
   solução na ferramenta. Uma sem a outra deixa passar quem chutou e quem
   decorou.

   `precisa` são os pedaços que a fórmula tem que ter, `evitar` são os atalhos
   que dão o número certo por acaso e quebram no dia seguinte. */

export type Trilha = "dax" | "excel";

export type Desafio = {
  id: string;
  trilha: Trilha;
  nivel: 1 | 2 | 3;
  titulo: string;
  enunciado: string;
  dica: string;
  /** O valor certo, calculado da base do próprio aluno. */
  valor: (b: Base) => number;
  /** Como o número aparece: dinheiro, número puro ou percentual. */
  formato: "moeda" | "numero" | "percentual";
  precisa: { padrao: RegExp; nome: string }[];
  /* Quais linhas da base entram na conta. Serve para a tela acender o recorte
     quando o aluno pede ajuda: ler o critério na tabela é metade do exercício. */
  recorte?: { rotulo: string; linha: (v: Venda) => boolean };
  evitar?: { padrao: RegExp; recado: string }[];
  gabarito: string;
  porque: string;
};

const arred = (n: number) => Math.round(n * 100) / 100;

export const DESAFIOS: Desafio[] = [
  /* ------------------------------------------------------------------ DAX */
  {
    id: "dax-receita-bruta",
    trilha: "dax",
    nivel: 1,
    titulo: "Receita bruta",
    enunciado: "Qual é a receita bruta de toda a base, quantidade vezes preço, sem considerar desconto?",
    dica: "A multiplicação é linha a linha. Existe uma função que soma a expressão calculada em cada linha.",
    valor: (b) => arred(b.vendas.reduce((t, v) => t + bruto(v), 0)),
    formato: "moeda",
    precisa: [{ padrao: /\bSUMX\s*\(/i, nome: "SUMX" }, { padrao: /\*/, nome: "a multiplicação de quantidade por preço" }],
    evitar: [{ padrao: /\bSUM\s*\(\s*[^)]*quantidade[^)]*\)\s*\*\s*SUM\s*\(/i, recado: "SUM ( Quantidade ) * SUM ( Preço ) multiplica os totais e dá um número maior e sem sentido." }],
    gabarito: "Receita Bruta = SUMX ( Vendas, Vendas[Quantidade] * Vendas[Preço] )",
    porque: "A conta é por linha: cada venda tem sua quantidade e seu preço. SUMX percorre a tabela, calcula cada linha e só depois soma.",
  },
  {
    id: "dax-receita-liquida",
    trilha: "dax",
    nivel: 1,
    titulo: "Receita líquida",
    enunciado: "Qual é a receita depois do desconto de cada venda?",
    dica: "Desconto é fração: 0,1 significa 10% a menos. Continua sendo conta de linha.",
    valor: (b) => arred(b.vendas.reduce((t, v) => t + liquido(v), 0)),
    formato: "moeda",
    precisa: [{ padrao: /\bSUMX\s*\(/i, nome: "SUMX" }, { padrao: /1\s*-/, nome: "o fator (1 - desconto)" }],
    gabarito: "Receita Líquida = SUMX ( Vendas, Vendas[Quantidade] * Vendas[Preço] * ( 1 - Vendas[Desconto] ) )",
    porque: "Aplicar o desconto no total só daria certo se todas as vendas tivessem o mesmo percentual. Como não têm, o desconto entra na linha.",
  },
  {
    id: "dax-ticket",
    trilha: "dax",
    nivel: 1,
    titulo: "Ticket médio",
    enunciado: "Qual é o ticket médio por venda, usando a receita líquida dividida pelo número de vendas?",
    dica: "Divisão em DAX tem uma função própria, que já resolve a divisão por zero.",
    valor: (b) => arred(b.vendas.reduce((t, v) => t + liquido(v), 0) / b.vendas.length),
    formato: "moeda",
    precisa: [{ padrao: /\bDIVIDE\s*\(/i, nome: "DIVIDE" }, { padrao: /\bCOUNTROWS\s*\(|\bCOUNT\s*\(/i, nome: "a contagem de vendas" }],
    evitar: [{ padrao: /\)\s*\/\s*COUNT/i, recado: "A barra de divisão quebra quando o denominador é zero. DIVIDE devolve vazio em vez de erro." }],
    gabarito: "Ticket Médio = DIVIDE ( [Receita Líquida], COUNTROWS ( Vendas ) )",
    porque: "DIVIDE existe justamente para o dia em que o filtro deixa o denominador em zero: o visual mostra vazio em vez de erro.",
  },
  {
    id: "dax-periféricos",
    trilha: "dax",
    nivel: 2,
    titulo: "Receita de uma categoria",
    enunciado: "Qual é a receita líquida só da categoria Periféricos?",
    dica: "A medida já existe. Falta mudar o contexto de filtro dela.",
    valor: (b) => arred(b.vendas.filter((v) => v.categoria === "Periféricos").reduce((t, v) => t + liquido(v), 0)),
    formato: "moeda",
    recorte: { rotulo: "categoria Periféricos", linha: (v) => v.categoria === "Periféricos" },
    precisa: [{ padrao: /\bCALCULATE\s*\(/i, nome: "CALCULATE" }, { padrao: /Periféricos|Perifericos/i, nome: "o filtro da categoria" }],
    gabarito: 'Receita Periféricos = CALCULATE ( [Receita Líquida], Vendas[Categoria] = "Periféricos" )',
    porque: "CALCULATE é a única função que muda o contexto de filtro. O filtro simples dentro dela vira um FILTER na tabela inteira.",
  },
  {
    id: "dax-participacao",
    trilha: "dax",
    nivel: 2,
    titulo: "Participação da categoria",
    enunciado: "Quanto a categoria Periféricos representa da receita líquida total? Responda em percentual, como 23,5.",
    dica: "O total precisa ignorar o filtro de categoria que está na tela.",
    valor: (b) => {
      const total = b.vendas.reduce((t, v) => t + liquido(v), 0);
      const parte = b.vendas.filter((v) => v.categoria === "Periféricos").reduce((t, v) => t + liquido(v), 0);
      return arred((parte / total) * 100);
    },
    formato: "percentual",
    recorte: { rotulo: "categoria Periféricos", linha: (v) => v.categoria === "Periféricos" },
    precisa: [{ padrao: /\bDIVIDE\s*\(/i, nome: "DIVIDE" }, { padrao: /\bALL\s*\(|\bREMOVEFILTERS\s*\(|\bALLSELECTED\s*\(/i, nome: "ALL ou REMOVEFILTERS no denominador" }],
    gabarito: "% da Categoria = DIVIDE ( [Receita Líquida], CALCULATE ( [Receita Líquida], REMOVEFILTERS ( Vendas[Categoria] ) ) )",
    porque: "Sem tirar o filtro, o denominador é o mesmo do numerador e todo percentual dá 100%. É o erro mais comum de participação.",
  },
  {
    id: "dax-maior-vendedor",
    trilha: "dax",
    nivel: 3,
    titulo: "O vendedor que mais vendeu",
    enunciado: "Qual é a receita líquida do vendedor que mais vendeu?",
    dica: "Existe uma função que calcula a medida para cada valor de uma coluna e devolve o maior.",
    valor: (b) => {
      const m = maiorDe(somaPor(b.vendas, (v: Venda) => v.vendedor, liquido));
      return arred(m?.valor ?? 0);
    },
    formato: "moeda",
    precisa: [{ padrao: /\bMAXX\s*\(|\bTOPN\s*\(/i, nome: "MAXX ou TOPN" }, { padrao: /\bVALUES\s*\(|\bALL\s*\(|\bSUMMARIZE\s*\(/i, nome: "a tabela de vendedores" }],
    gabarito: "Maior Vendedor = MAXX ( VALUES ( Vendas[Vendedor] ), [Receita Líquida] )",
    porque: "MAXX itera a lista de vendedores, calcula a medida dentro do contexto de cada um e devolve o maior valor. MAX na coluna só olharia o texto.",
  },
  {
    id: "dax-margem",
    trilha: "dax",
    nivel: 2,
    titulo: "Margem percentual",
    enunciado: "Qual é a margem percentual, ou seja, receita líquida menos custo, dividido pela receita líquida? Responda em percentual.",
    dica: "Custo também é conta de linha: quantidade vezes custo unitário.",
    valor: (b) => {
      const rec = b.vendas.reduce((t, v) => t + liquido(v), 0);
      const mg = b.vendas.reduce((t, v) => t + margem(v), 0);
      return arred((mg / rec) * 100);
    },
    formato: "percentual",
    precisa: [{ padrao: /\bDIVIDE\s*\(/i, nome: "DIVIDE" }, { padrao: /\bSUMX\s*\(/i, nome: "SUMX para o custo" }],
    gabarito: "Margem % = DIVIDE ( [Receita Líquida] - SUMX ( Vendas, Vendas[Quantidade] * Vendas[Custo] ), [Receita Líquida] )",
    porque: "Margem é sempre sobre a receita líquida, não sobre a bruta. Trocar o denominador infla o indicador e engana a diretoria.",
  },
  {
    id: "dax-mes-maior",
    trilha: "dax",
    nivel: 3,
    titulo: "O melhor mês",
    enunciado: "Qual é a receita líquida do melhor mês da base?",
    dica: "Mesma ideia do maior vendedor, trocando a coluna que a função percorre.",
    valor: (b) => {
      const m = maiorDe(somaPor(b.vendas, (v: Venda) => mes(v), liquido));
      return arred(m?.valor ?? 0);
    },
    formato: "moeda",
    precisa: [{ padrao: /\bMAXX\s*\(|\bTOPN\s*\(/i, nome: "MAXX ou TOPN" }, { padrao: /\bVALUES\s*\(|\bSUMMARIZE\s*\(|MONTH\s*\(/i, nome: "a lista de meses" }],
    gabarito: "Melhor Mês = MAXX ( VALUES ( Calendario[Mês] ), [Receita Líquida] )",
    porque: "Com uma tabela de calendário ligada, a lista de meses vem dela. Sem calendário, dá para usar VALUES na coluna de data do próprio fato.",
  },
  {
    id: "dax-clientes-distintos",
    trilha: "dax",
    nivel: 1,
    titulo: "Quantos produtos diferentes",
    enunciado: "Quantos produtos diferentes aparecem na base?",
    dica: "Contar linhas não serve: o mesmo produto aparece várias vezes.",
    valor: (b) => new Set(b.vendas.map((v) => v.produto)).size,
    formato: "numero",
    precisa: [{ padrao: /\bDISTINCTCOUNT\s*\(/i, nome: "DISTINCTCOUNT" }],
    evitar: [{ padrao: /\bCOUNTROWS\s*\(\s*Vendas\s*\)/i, recado: "COUNTROWS conta as vendas, não os produtos diferentes." }],
    gabarito: "Produtos Diferentes = DISTINCTCOUNT ( Vendas[Produto] )",
    porque: "DISTINCTCOUNT olha os valores únicos da coluna. É a mesma lógica de clientes ativos, que é onde ela mais aparece.",
  },
  {
    id: "dax-acima-media",
    trilha: "dax",
    nivel: 3,
    titulo: "Vendas acima da média",
    enunciado: "Qual é a receita líquida somada apenas das vendas cujo valor líquido está acima da média das vendas?",
    dica: "Primeiro guarde a média numa variável, depois filtre a tabela por ela.",
    valor: (b) => {
      const valores = b.vendas.map(liquido);
      const media = valores.reduce((t, x) => t + x, 0) / valores.length;
      return arred(valores.filter((x) => x > media).reduce((t, x) => t + x, 0));
    },
    formato: "moeda",
    precisa: [{ padrao: /\bVAR\b/i, nome: "uma variável (VAR)" }, { padrao: /\bFILTER\s*\(/i, nome: "FILTER" }],
    gabarito: `Acima da Média =
VAR Media = AVERAGEX ( Vendas, Vendas[Quantidade] * Vendas[Preço] * ( 1 - Vendas[Desconto] ) )
RETURN SUMX ( FILTER ( Vendas, Vendas[Quantidade] * Vendas[Preço] * ( 1 - Vendas[Desconto] ) > Media ), Vendas[Quantidade] * Vendas[Preço] * ( 1 - Vendas[Desconto] ) )`,
    porque: "A variável calcula a média uma vez só. Sem ela, a média seria recalculada dentro do filtro, linha a linha, e o resultado mudaria de sentido.",
  },

  /* ---------------------------------------------------------------- Excel */
  {
    id: "xls-somarproduto",
    trilha: "excel",
    nivel: 1,
    titulo: "Receita bruta na planilha",
    enunciado: "Qual é a receita bruta, quantidade vezes preço, somando todas as linhas?",
    dica: "Existe uma função que multiplica duas colunas linha a linha e já soma o resultado.",
    valor: (b) => arred(b.vendas.reduce((t, v) => t + bruto(v), 0)),
    formato: "moeda",
    precisa: [{ padrao: /SOMARPRODUTO|SUMPRODUCT/i, nome: "SOMARPRODUTO" }],
    gabarito: "=SOMARPRODUTO(F2:F19;G2:G19)",
    porque: "SOMARPRODUTO evita a coluna auxiliar. Sem ela, você criaria uma coluna de total por linha só para somar depois.",
  },
  {
    id: "xls-somases",
    trilha: "excel",
    nivel: 1,
    titulo: "Quantidade de uma região",
    enunciado: "Qual é a soma da coluna Qtd apenas das vendas da região Sul?",
    dica: "Soma com condição tem função própria, no plural, que aceita vários critérios.",
    valor: (b) => b.vendas.filter((v) => v.regiao === "Sul").reduce((t, v) => t + v.quantidade, 0),
    formato: "numero",
    recorte: { rotulo: "região Sul", linha: (v) => v.regiao === "Sul" },
    precisa: [{ padrao: /SOMASES|SUMIFS|SOMASE|SUMIF/i, nome: "SOMASES" }, { padrao: /Sul/i, nome: "o critério Sul" }],
    gabarito: '=SOMASES(F2:F19;C2:C19;"Sul")',
    porque: "SOMASES aceita quantos critérios você precisar. É o que substitui filtrar na mão e olhar a barra de status.",
  },
  {
    id: "xls-contases",
    trilha: "excel",
    nivel: 1,
    titulo: "Quantas vendas com desconto",
    enunciado: "Quantas linhas têm desconto maior que zero?",
    dica: "Contar com condição também tem função no plural.",
    valor: (b) => b.vendas.filter((v) => v.desconto > 0).length,
    formato: "numero",
    recorte: { rotulo: "linhas com desconto", linha: (v) => v.desconto > 0 },
    precisa: [{ padrao: /CONT\.SES|COUNTIFS|CONT\.SE|COUNTIF/i, nome: "CONT.SES" }, { padrao: />\s*0|">0"/, nome: "o critério maior que zero" }],
    gabarito: '=CONT.SES(H2:H19;">0")',
    porque: "O critério vai entre aspas, inclusive o sinal de maior. É a pegadinha que faz a fórmula devolver zero sem dar erro.",
  },
  {
    id: "xls-procx",
    trilha: "excel",
    nivel: 2,
    titulo: "Preço de um produto",
    enunciado: "Qual é o preço unitário do produto Monitor?",
    dica: "Procura na coluna de produto e devolve a coluna de preço.",
    valor: (b) => b.vendas.find((v) => v.produto === "Monitor")?.preco ?? 0,
    formato: "moeda",
    recorte: { rotulo: "produto Monitor", linha: (v) => v.produto === "Monitor" },
    precisa: [{ padrao: /PROCX|XLOOKUP|ÍNDICE|INDICE|INDEX|PROCV|VLOOKUP/i, nome: "PROCX, ÍNDICE+CORRESP ou PROCV" }, { padrao: /Monitor/i, nome: "o produto procurado" }],
    evitar: [{ padrao: /PROCV\s*\([^;,]*[;,][^;,]*[;,]\s*\d+\s*\)/i, recado: "PROCV sem o último argumento FALSO faz busca aproximada e devolve o valor errado quando a lista não está ordenada." }],
    gabarito: '=PROCX("Monitor";E2:E19;G2:G19)',
    porque: "PROCX procura e devolve sem depender da posição da coluna. Se o time ainda usa PROCV, o último argumento precisa ser FALSO.",
  },
  {
    id: "xls-mediases",
    trilha: "excel",
    nivel: 2,
    titulo: "Média de uma categoria",
    enunciado: "Qual é a média da coluna Preço nas linhas da categoria Telas?",
    dica: "Média com condição segue o mesmo padrão de SOMASES.",
    valor: (b) => {
      const lista = b.vendas.filter((v) => v.categoria === "Telas").map((v) => v.preco);
      return lista.length ? arred(lista.reduce((t, x) => t + x, 0) / lista.length) : 0;
    },
    formato: "moeda",
    recorte: { rotulo: "categoria Telas", linha: (v) => v.categoria === "Telas" },
    precisa: [{ padrao: /MÉDIASES|MEDIASES|AVERAGEIFS|MÉDIASE|MEDIASE|AVERAGEIF/i, nome: "MÉDIASES" }, { padrao: /Telas/i, nome: "o critério Telas" }],
    gabarito: '=MÉDIASES(G2:G19;D2:D19;"Telas")',
    porque: "MÉDIASES ignora as linhas que não atendem ao critério. Somar e dividir na mão pelo total de linhas dá um número menor e errado.",
  },
  {
    id: "xls-liquido",
    trilha: "excel",
    nivel: 2,
    titulo: "Receita líquida na planilha",
    enunciado: "Qual é a receita já com o desconto aplicado em cada linha?",
    dica: "São três colunas na mesma conta, linha a linha.",
    valor: (b) => arred(b.vendas.reduce((t, v) => t + liquido(v), 0)),
    formato: "moeda",
    precisa: [{ padrao: /SOMARPRODUTO|SUMPRODUCT/i, nome: "SOMARPRODUTO" }, { padrao: /1\s*-/, nome: "o fator (1 - desconto)" }],
    gabarito: "=SOMARPRODUTO(F2:F19;G2:G19;1-H2:H19)",
    porque: "SOMARPRODUTO aceita mais de duas matrizes e faz a conta inteira de uma vez, sem coluna auxiliar.",
  },
  {
    id: "xls-maximo-condicional",
    trilha: "excel",
    nivel: 3,
    titulo: "Maior venda de um vendedor",
    enunciado: "Qual é o maior valor líquido de uma única venda da Ana? Se não houver venda dela, responda 0.",
    dica: "Dá para resolver com MÁXIMOSES sobre uma coluna auxiliar, ou com MÁXIMO e SE em matriz.",
    valor: (b) => {
      const lista = b.vendas.filter((v) => v.vendedor === "Ana").map(liquido);
      return lista.length ? arred(Math.max(...lista)) : 0;
    },
    formato: "moeda",
    recorte: { rotulo: "vendas da Ana", linha: (v) => v.vendedor === "Ana" },
    precisa: [{ padrao: /MÁXIMOSES|MAXIMOSES|MAXIFS|MÁXIMO|MAXIMO|\bMAX\b/i, nome: "MÁXIMO ou MÁXIMOSES" }, { padrao: /Ana/i, nome: "o critério Ana" }],
    gabarito: '=MÁXIMO(SE(B2:B19="Ana";F2:F19*G2:G19*(1-H2:H19)))   (matriz)',
    porque: "MÁXIMOSES não aceita expressão calculada, só coluna. Por isso entra o MÁXIMO com SE em matriz, ou uma coluna auxiliar com o líquido.",
  },
  {
    id: "xls-participacao",
    trilha: "excel",
    nivel: 2,
    titulo: "Participação de um vendedor",
    enunciado: "Quanto o Bruno representa da quantidade total vendida? Responda em percentual, como 23,5.",
    dica: "É uma divisão de dois totais, um deles com critério.",
    valor: (b) => {
      const total = b.vendas.reduce((t, v) => t + v.quantidade, 0);
      const dele = b.vendas.filter((v) => v.vendedor === "Bruno").reduce((t, v) => t + v.quantidade, 0);
      return arred((dele / total) * 100);
    },
    formato: "percentual",
    recorte: { rotulo: "vendas do Bruno", linha: (v) => v.vendedor === "Bruno" },
    precisa: [{ padrao: /SOMASES|SUMIFS|SOMASE|SUMIF/i, nome: "SOMASES no numerador" }, { padrao: /SOMA\s*\(|SUM\s*\(/i, nome: "a soma total no denominador" }],
    gabarito: '=SOMASES(F2:F19;B2:B19;"Bruno")/SOMA(F2:F19)',
    porque: "O denominador precisa ser o total sem critério. Repetir o critério nos dois lados sempre dá 100%.",
  },
  {
    id: "xls-mes",
    trilha: "excel",
    nivel: 3,
    titulo: "Vendas de um mês",
    enunciado: "Qual é a soma da coluna Qtd apenas das vendas de fevereiro?",
    dica: "Data em critério funciona por faixa: maior ou igual ao primeiro dia e menor que o primeiro dia do mês seguinte.",
    valor: (b) => b.vendas.filter((v) => mes(v) === 2).reduce((t, v) => t + v.quantidade, 0),
    formato: "numero",
    recorte: { rotulo: "fevereiro", linha: (v) => mes(v) === 2 },
    precisa: [{ padrao: /SOMASES|SUMIFS/i, nome: "SOMASES" }, { padrao: />=|>/, nome: "o critério de data inicial" }, { padrao: /<\s*"?\d|</, nome: "o critério de data final" }],
    gabarito: '=SOMASES(F2:F19;A2:A19;">="&DATA(2026;2;1);A2:A19;"<"&DATA(2026;3;1))',
    porque: "Comparar o mês com texto quebra na virada do ano. A faixa de datas funciona sempre e usa o formato real da célula.",
  },
  {
    id: "xls-unicos",
    trilha: "excel",
    nivel: 3,
    titulo: "Quantos vendedores diferentes",
    enunciado: "Quantos vendedores diferentes aparecem na base?",
    dica: "No Excel moderno existe uma função que devolve a lista sem repetição. Dá para contar o que ela devolve.",
    valor: (b) => new Set(b.vendas.map((v) => v.vendedor)).size,
    formato: "numero",
    precisa: [{ padrao: /ÚNICO|UNICO|UNIQUE|SOMARPRODUTO|SUMPRODUCT/i, nome: "ÚNICO ou a combinação com SOMARPRODUTO" }],
    gabarito: "=CONT.VALORES(ÚNICO(B2:B19))",
    porque: "ÚNICO resolve em uma função no Excel 365. Na versão antiga, a saída é SOMARPRODUTO com 1 dividido por CONT.SE.",
  },
];

export const DESAFIOS_DA_TRILHA = (t: Trilha) => DESAFIOS.filter((d) => d.trilha === t).sort((a, b) => a.nivel - b.nivel);
