import type { Achado, Dimensao, Laudo, NotaDimensao, Pagina, Relatorio, Visual } from "./tipos";
import { PESO } from "./tipos";

/* As regras do Raio-X.

   Cada regra é determinística e explicável: o aluno consegue ver o que foi
   medido e conferir no arquivo dele. Nada de IA em tempo de execução, nada de
   nota que ninguém sabe de onde veio.

   Toda regra responde três coisas na mesma ordem: o que foi encontrado, por
   que isso importa e como arrumar. Achado sem "como arrumar" vira cobrança,
   não ensino. */

/* Gráficos e tabelas: o que responde pergunta e pede título. */
const VISUAL_DE_DADOS = new Set([
  "barChart", "clusteredBarChart", "clusteredColumnChart", "columnChart", "hundredPercentStackedBarChart",
  "hundredPercentStackedColumnChart", "lineChart", "lineClusteredColumnComboChart", "lineStackedColumnComboChart",
  "areaChart", "stackedAreaChart", "scatterChart", "pieChart", "donutChart", "treemap", "map", "filledMap",
  "funnel", "gauge", "waterfallChart", "ribbonChart", "tableEx", "pivotTable", "matrix", "decompositionTreeVisual",
  "keyDriversVisual", "azureMap", "kpi", "multiRowCard",
]);

/* Enfeite e navegação não contam na densidade da página: botão, seta, imagem e
   retângulo de fundo não consultam o modelo nem disputam a leitura. Contar
   tudo junto dava "42 visuais" numa página que tem doze gráficos. */
const DECORATIVO = new Set([
  "actionButton", "pageNavigator", "bookmarkNavigator", "image", "shape", "basicShape", "textbox", "logo",
]);
const TABELAS = new Set(["tableEx", "pivotTable", "matrix", "table"]);
const PIZZAS = new Set(["pieChart", "donutChart"]);

/* O tipo interno do visual não diz nada para o aluno: "clusteredBarChart" e
   "tableEx" são nome de código. O achado fala a língua do Power BI em
   português, e o que não estiver no mapa vira "visual". */
const NOME_VISUAL: Record<string, string> = {
  card: "cartão", cardVisual: "cartão", multiRowCard: "cartão de várias linhas", kpi: "KPI",
  slicer: "filtro", tableEx: "tabela", table: "tabela", pivotTable: "matriz", matrix: "matriz",
  barChart: "gráfico de barras", clusteredBarChart: "gráfico de barras", columnChart: "gráfico de colunas",
  clusteredColumnChart: "gráfico de colunas", hundredPercentStackedBarChart: "barras 100%",
  hundredPercentStackedColumnChart: "colunas 100%", lineChart: "gráfico de linhas",
  lineClusteredColumnComboChart: "combinado", lineStackedColumnComboChart: "combinado",
  areaChart: "gráfico de área", stackedAreaChart: "gráfico de área", scatterChart: "dispersão",
  pieChart: "pizza", donutChart: "rosca", treemap: "treemap", map: "mapa", filledMap: "mapa",
  azureMap: "mapa", funnel: "funil", gauge: "velocímetro", waterfallChart: "cascata",
  ribbonChart: "fita", decompositionTreeVisual: "árvore de decomposição", keyDriversVisual: "principais influenciadores",
};
const nomeDoVisual = (t: string) => NOME_VISUAL[t] || (t.startsWith("htmlContent") ? "visual HTML" : t === "desconhecido" ? "visual" : "visual customizado");

const NOME_GENERICO = /^(página|pagina|page|sheet|planilha|folha|tabela|table|query|consulta)\s*\d*$/i;
const PARECE_CALENDARIO = /(calend|data|date|dim.?tempo|d.?tempo|time)/i;

function area(v: Visual) {
  return Math.max(0, v.largura) * Math.max(0, v.altura);
}

function sobreposicao(a: Visual, b: Visual) {
  const larg = Math.min(a.x + a.largura, b.x + b.largura) - Math.max(a.x, b.x);
  const alt = Math.min(a.y + a.altura, b.y + b.altura) - Math.max(a.y, b.y);
  if (larg <= 0 || alt <= 0) return 0;
  const menor = Math.min(area(a), area(b)) || 1;
  return (larg * alt) / menor;
}

function achado(
  regra: string,
  dimensao: Dimensao,
  severidade: Achado["severidade"],
  titulo: string,
  onde: string,
  porque: string,
  comoArrumar: string
): Achado {
  return { regra, dimensao, severidade, titulo, onde, porque, comoArrumar };
}

function regrasDaPagina(p: Pagina): Achado[] {
  const saida: Achado[] = [];
  const emPagina = `Página "${p.nome}"`;
  const comDados = p.visuais.filter((v) => VISUAL_DE_DADOS.has(v.tipo));
  const pesados = p.visuais.filter((v) => !DECORATIVO.has(v.tipo) && v.tipo !== "slicer");

  if (pesados.length > 14) {
    saida.push(achado("pagina_lotada", "design", "alta",
      `${pesados.length} visuais de dados em uma página só`, emPagina,
      "Cada visual é uma consulta ao modelo. Acima de doze, a página demora a abrir e o leitor não sabe para onde olhar primeiro.",
      "Quebre em duas páginas ou use drill-through: uma página de visão geral e outra de detalhe."));
  } else if (pesados.length > 9) {
    saida.push(achado("pagina_lotada", "design", "media",
      `${pesados.length} visuais de dados nesta página`, emPagina,
      "Oito visuais já é o limite em que o leitor consegue ler a página em um golpe de vista.",
      "Junte o que responde à mesma pergunta e mande o resto para uma página de detalhe."));
  }

  const paresSobrepostos: string[] = [];
  for (let i = 0; i < pesados.length; i++) {
    for (let j = i + 1; j < pesados.length; j++) {
      if (sobreposicao(pesados[i], pesados[j]) > 0.35) {
        paresSobrepostos.push(`${nomeDoVisual(pesados[i].tipo)} sobre ${nomeDoVisual(pesados[j].tipo)}`);
      }
    }
  }
  if (paresSobrepostos.length) {
    saida.push(achado("visuais_sobrepostos", "design", "media",
      `${paresSobrepostos.length} ${paresSobrepostos.length === 1 ? "par de visuais sobrepostos" : "pares de visuais sobrepostos"}`,
      `${emPagina}: ${paresSobrepostos.slice(0, 3).join(", ")}`,
      "Visual em cima de visual costuma ser sobra de edição. Some no publicado, atrapalha o foco e ainda consulta o modelo à toa.",
      "Abra o painel de seleção do Power BI e confira a ordem das camadas. Apague o que virou sobra."));
  }

  const fora = p.visuais.filter((v) => v.x + v.largura > p.largura + 1 || v.y + v.altura > p.altura + 1);
  if (fora.length) {
    saida.push(achado("fora_da_pagina", "design", "alta",
      `${fora.length} ${fora.length === 1 ? "visual passa" : "visuais passam"} da borda da página`, emPagina,
      "O que passa da borda some ou vira barra de rolagem para quem abre no navegador ou no celular.",
      "Selecione o visual e ajuste posição e tamanho para caber na área da página."));
  }

  if (pesados.length >= 4) {
    const desalinhados = pesados.filter((v) => v.x % 4 !== 0 || v.y % 4 !== 0).length;
    if (desalinhados / pesados.length > 0.5) {
      saida.push(achado("desalinhado", "design", "baixa",
        `${desalinhados} de ${pesados.length} visuais fora de uma grade`, emPagina,
        "Alinhamento é o detalhe que separa o painel caseiro do profissional, e não custa nada.",
        "Use Formatar, Alinhar no Power BI, ou digite a posição na aba Geral para encaixar todos na mesma grade."));
    }
  }

  const proporcao = p.largura / (p.altura || 1);
  if (p.visuais.length > 0 && Math.abs(proporcao - 16 / 9) > 0.35) {
    saida.push(achado("fora_16_9", "design", "baixa",
      `Página em ${Math.round(p.largura)}x${Math.round(p.altura)}`, emPagina,
      "Fora de 16:9 a página ganha barras nas laterais na maioria das telas em que ela vai ser aberta.",
      "Use 1280x720 ou 1920x1080, a não ser que o painel seja feito para um totem ou para impressão."));
  }

  if (NOME_GENERICO.test(p.nome.trim())) {
    saida.push(achado("pagina_sem_nome", "estrutura", "media",
      `Página ainda chamada "${p.nome}"`, emPagina,
      "O nome da página é a aba que o usuário clica. Nome genérico obriga ele a abrir para descobrir o que tem lá.",
      "Renomeie pelo que a página responde: \"Visão geral\", \"Margem por produto\", \"Detalhe do pedido\"."));
  }

  const semTitulo = comDados.filter((v) => !v.tituloProprio && v.tituloVisivel);
  if (comDados.length >= 3 && semTitulo.length / comDados.length > 0.6) {
    saida.push(achado("titulo_automatico", "clareza", "media",
      `${semTitulo.length} de ${comDados.length} visuais com o título automático`, emPagina,
      "O título automático descreve o cálculo (\"Soma de Valor por Mês\"), não a pergunta que o visual responde.",
      "Troque por um título que afirme algo: \"Receita cresce no segundo semestre\"."));
  }

  const escondidos = comDados.filter((v) => !v.tituloVisivel && !v.tituloProprio);
  if (escondidos.length >= 3) {
    saida.push(achado("titulo_escondido", "clareza", "baixa",
      `${escondidos.length} visuais sem título nenhum`, emPagina,
      "Sem título, quem recebe um print do painel não sabe o que está vendo.",
      "Deixe o título visível, ou use uma caixa de texto que sirva de título para o bloco."));
  }

  const contagem = new Map<string, number>();
  for (const v of p.visuais) for (const c of v.campos) if (c.medida) contagem.set(c.ref, (contagem.get(c.ref) || 0) + 1);
  const repetida = [...contagem.entries()].filter(([, n]) => n >= 3);
  if (repetida.length) {
    saida.push(achado("medida_repetida", "clareza", "baixa",
      `A medida ${repetida[0][0]} aparece em ${repetida[0][1]} visuais`, emPagina,
      "A mesma medida repetida na página costuma ser o mesmo número dito três vezes, tirando espaço de outra informação.",
      "Deixe o número em um cartão só e use os outros visuais para abrir a medida por tempo, produto ou região."));
  }

  const tabelasLargas = p.visuais.filter((v) => TABELAS.has(v.tipo) && v.campos.length > 8);
  if (tabelasLargas.length) {
    saida.push(achado("tabela_larga", "clareza", "media",
      `Tabela com ${tabelasLargas[0].campos.length} colunas`, emPagina,
      "Tabela larga vira planilha: ninguém lê, e a página fica pesada.",
      "Deixe as colunas que respondem à pergunta da página e leve o resto para uma página de detalhe ou para exportação."));
  }

  const pizzas = p.visuais.filter((v) => PIZZAS.has(v.tipo));
  if (pizzas.length >= 2) {
    saida.push(achado("muitas_pizzas", "clareza", "baixa",
      `${pizzas.length} gráficos de pizza ou rosca na mesma página`, emPagina,
      "O olho compara comprimento muito melhor que ângulo. Duas pizzas lado a lado quase nunca se comparam.",
      "Troque por barras ordenadas. Guarde a pizza para quando forem duas ou três fatias e a parte do todo for o assunto."));
  }

  const slicers = p.visuais.filter((v) => v.tipo === "slicer").length;
  if (slicers > 4) {
    saida.push(achado("muitos_slicers", "design", "baixa",
      `${slicers} filtros soltos na página`, emPagina,
      "Muito filtro na tela toma o espaço do conteúdo e empurra a decisão para quem só queria uma resposta.",
      "Deixe dois ou três filtros na página e mande o resto para o painel de filtros lateral."));
  }

  return saida;
}

function regrasDoModelo(r: Relatorio): Achado[] {
  const saida: Achado[] = [];

  if (r.tabelas.length >= 3 && !r.tabelas.some((t) => PARECE_CALENDARIO.test(t))) {
    saida.push(achado("sem_tabela_datas", "modelo", "alta",
      "Nenhuma tabela de calendário no modelo", `${r.tabelas.length} tabelas`,
      "Sem tabela de datas própria, a inteligência de tempo do DAX não funciona direito e comparações com o ano passado saem erradas.",
      "Crie uma tabela de calendário, relacione com as datas dos fatos e marque como tabela de datas."));
  }

  const genericas = r.tabelas.filter((t) => NOME_GENERICO.test(t.trim()));
  if (genericas.length) {
    saida.push(achado("tabela_sem_nome", "estrutura", "media",
      `${genericas.length} ${genericas.length === 1 ? "tabela com nome genérico" : "tabelas com nome genérico"}`,
      genericas.slice(0, 4).join(", "),
      "Nome de tabela aparece no painel de campos e nas fórmulas. \"Planilha1\" espalha confusão por todo o arquivo.",
      "Renomeie pelo que a tabela é: dCliente, dCalendario, fVendas."));
  }

  const bidirecionais = r.relacionamentos.filter((x) => x.cruzado === "bothDirections");
  if (bidirecionais.length) {
    saida.push(achado("bidirecional", "modelo", "alta",
      `${bidirecionais.length} ${bidirecionais.length === 1 ? "relacionamento bidirecional" : "relacionamentos bidirecionais"}`,
      bidirecionais.slice(0, 3).map((x) => `${x.de} ↔ ${x.para}`).join(", "),
      "Filtro nos dois sentidos abre caminho ambíguo entre as tabelas, derruba a performance e produz número que muda sem explicação.",
      "Deixe o filtro em um sentido só e resolva o caso específico com CROSSFILTER dentro da medida que precisa."));
  }

  const muitosParaMuitos = r.relacionamentos.filter((x) => x.cardinalidade.startsWith("many-many"));
  if (muitosParaMuitos.length) {
    saida.push(achado("muitos_para_muitos", "modelo", "alta",
      `${muitosParaMuitos.length} ${muitosParaMuitos.length === 1 ? "relacionamento muitos para muitos" : "relacionamentos muitos para muitos"}`,
      muitosParaMuitos.slice(0, 3).map((x) => `${x.de} ↔ ${x.para}`).join(", "),
      "Muitos para muitos quase sempre é sintoma de dimensão faltando, e o resultado fica difícil de auditar.",
      "Crie a tabela dimensão que falta, com a chave única, e ligue as duas pontas nela."));
  }

  if (r.colunasCalculadas.length > 5) {
    saida.push(achado("colunas_calculadas", "modelo", "media",
      `${r.colunasCalculadas.length} colunas calculadas em DAX`,
      r.colunasCalculadas.slice(0, 3).map((c) => `${c.tabela}[${c.nome}]`).join(", "),
      "Coluna calculada ocupa memória no modelo e é calculada na atualização. Em tabela grande, pesa.",
      "Traga o cálculo para o Power Query ou para a origem, e deixe em DAX só o que depende do contexto do relatório."));
  }

  return saida;
}

function regrasDoDax(r: Relatorio): Achado[] {
  const saida: Achado[] = [];
  if (!r.medidas.length) return saida;

  const comFilterEmCalculate = r.medidas.filter((m) => /CALCULATE\s*\(/i.test(m.dax) && /FILTER\s*\(\s*'?[A-Za-zÀ-ú]/i.test(m.dax));
  if (comFilterEmCalculate.length) {
    saida.push(achado("filter_em_calculate", "dax", "media",
      `${comFilterEmCalculate.length} ${comFilterEmCalculate.length === 1 ? "medida usa" : "medidas usam"} FILTER dentro de CALCULATE`,
      comFilterEmCalculate.slice(0, 3).map((m) => `[${m.nome}]`).join(", "),
      "FILTER sobre a tabela inteira varre linha a linha. Com milhões de linhas, é a diferença entre instantâneo e cinco segundos.",
      "Quando o filtro for simples, escreva a condição direto no CALCULATE. Se precisar do FILTER, aplique sobre a coluna e não sobre a tabela."));
  }

  const semDivide = r.medidas.filter((m) => /[^/]\/[^/]/.test(m.dax) && !/DIVIDE\s*\(/i.test(m.dax));
  if (semDivide.length) {
    saida.push(achado("sem_divide", "dax", "media",
      `${semDivide.length} ${semDivide.length === 1 ? "medida divide" : "medidas dividem"} com a barra`,
      semDivide.slice(0, 3).map((m) => `[${m.nome}]`).join(", "),
      "Divisão por zero no meio de um painel vira erro na cara do usuário, e a barra não trata isso.",
      "Use DIVIDE(numerador, denominador), que devolve vazio em vez de erro e ainda é mais rápido."));
  }

  const semFormato = r.medidas.filter((m) => !m.formato);
  if (semFormato.length > 3) {
    saida.push(achado("medida_sem_formato", "dax", "baixa",
      `${semFormato.length} medidas sem formatação definida`,
      semFormato.slice(0, 3).map((m) => `[${m.nome}]`).join(", "),
      "Sem formato, o mesmo número aparece com casas decimais diferentes em cada visual.",
      "Defina o formato na própria medida: moeda, percentual ou número com as casas certas."));
  }

  const gigantes = r.medidas.filter((m) => m.dax.split("\n").length > 30);
  if (gigantes.length) {
    saida.push(achado("dax_gigante", "dax", "baixa",
      `${gigantes.length} ${gigantes.length === 1 ? "medida com mais de 30 linhas" : "medidas com mais de 30 linhas"}`,
      gigantes.slice(0, 3).map((m) => `[${m.nome}]`).join(", "),
      "Medida gigante é difícil de testar e de corrigir seis meses depois.",
      "Quebre em medidas menores, com nome próprio, e monte a final com elas."));
  }

  return saida;
}

export function auditar(r: Relatorio): Laudo {
  const achados: Achado[] = [
    ...r.paginas.flatMap(regrasDaPagina),
    ...regrasDoModelo(r),
    ...regrasDoDax(r),
  ];

  if (r.temVisualCustomizado) {
    achados.push(achado("visual_customizado", "estrutura", "media",
      "O relatório usa visual customizado", "Pasta CustomVisuals dentro do arquivo",
      "Visual de terceiro pode não estar liberado no ambiente da empresa e costuma travar publicação e exportação.",
      "Confirme se o visual é certificado. Se não for, veja se o nativo resolve antes de depender dele."));
  }

  // Dimensões sem matéria-prima não entram na conta: um .pbix não tem modelo,
  // e dar nota zero em DAX por isso seria mentira.
  const completo = r.formato === "pbit" && r.medidas.length > 0;
  const temModelo = r.tabelas.length > 0;
  const dimensoes: Dimensao[] = ["estrutura", "design", "clareza", ...(temModelo ? (["modelo"] as Dimensao[]) : []), ...(completo ? (["dax"] as Dimensao[]) : [])];

  /* Duas contas de propósito.

     A primeira: a mesma regra repetida em nove páginas não vale nove vezes o
     peso. Vale o peso, mais um terço a cada repetição, até dobrar. Senão um
     relatório de dez páginas nasce com zero em design por um problema só.

     A segunda: a nota cai em curva, não em linha reta. Assim ela nunca chega a
     zero, e a diferença entre um relatório ruim e um péssimo continua visível.
     Relatório limpo fica acima de 90, um com três problemas sérios fica na
     casa dos 60, e um com quinze fica na dos 20. */
  const notas: NotaDimensao[] = dimensoes.map((d) => {
    const meus = achados.filter((a) => a.dimensao === d);
    const porRegra = new Map<string, Achado[]>();
    for (const a of meus) porRegra.set(a.regra, [...(porRegra.get(a.regra) ?? []), a]);
    let perda = 0;
    for (const lista of porRegra.values()) {
      const fator = Math.min(2, 1 + (lista.length - 1) / 3);
      perda += PESO[lista[0].severidade] * fator;
    }
    /* Modelo e DAX só são julgados por inteiro quando o arquivo é .pbit. No
       .pbix dá para ver o nome das tabelas pelo diagrama, e mais nada: dar 100
       por falta de evidência seria elogio que o aluno não ganhou. */
    const completa = d === "modelo" || d === "dax" ? completo : true;
    return { dimensao: d, nota: Math.round(100 * Math.exp(-perda / 110)), achados: meus.length, completa };
  });

  const contam = notas.filter((n) => n.completa);
  const nota = Math.round(contam.reduce((s, n) => s + n.nota, 0) / (contam.length || 1));
  const ordem = { alta: 0, media: 1, baixa: 2 };

  return {
    arquivo: r.arquivo,
    formato: r.formato,
    parcial: !completo,
    nota,
    notas,
    achados: achados.sort((a, b) => ordem[a.severidade] - ordem[b.severidade]),
    resumo: {
      paginas: r.paginas.length,
      visuais: r.paginas.reduce((s, p) => s + p.visuais.length, 0),
      tabelas: r.tabelas.length,
      medidas: r.medidas.length,
    },
  };
}
