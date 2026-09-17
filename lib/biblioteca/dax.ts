import type { Item } from "./tipos";

/* Os padrões de DAX que aparecem em quase todo projeto.

   Estão escritos com nomes que dão para trocar: fVendas, dCalendario, [Receita].
   Quem colar vai precisar trocar dois ou três nomes, e nada mais.

   A armadilha de cada um não é enfeite: é o que separa a medida que funciona na
   demonstração da medida que funciona no fechamento. */

export const DAX: Item[] = [
  // ---------------------------------------------------------------- tempo
  {
    id: "dax-ytd",
    linguagem: "dax",
    titulo: "Acumulado no ano",
    quando: "O diretor quer saber quanto já foi faturado do dia 1º de janeiro até hoje.",
    codigo: `Receita YTD = TOTALYTD ( [Receita], dCalendario[Data] )`,
    explicacao: "TOTALYTD respeita o filtro do visual e reinicia a contagem a cada ano.",
    armadilha: "Só funciona com uma tabela de calendário marcada como tabela de datas. Sem isso o número parece certo e erra nas bordas do ano.",
    tags: ["tempo", "acumulado"],
    nivel: "básico",
  },
  {
    id: "dax-ytd-fiscal",
    linguagem: "dax",
    titulo: "Acumulado no ano fiscal",
    quando: "A empresa fecha o ano em junho, e não em dezembro.",
    codigo: `Receita YTD fiscal = TOTALYTD ( [Receita], dCalendario[Data], "30/06" )`,
    explicacao: "O terceiro argumento é o último dia do ano fiscal, no formato dia barra mês.",
    armadilha: "Muita gente tenta resolver ano fiscal com filtro no visual. Não resolve: o acumulado continua reiniciando em janeiro.",
    tags: ["tempo", "acumulado", "calendário"],
    nivel: "intermediário",
  },
  {
    id: "dax-ano-anterior",
    linguagem: "dax",
    titulo: "Mesmo período do ano anterior",
    quando: "Comparar com o ano passado, seja o filtro dia, mês ou trimestre.",
    codigo: `Receita ano anterior = CALCULATE ( [Receita], SAMEPERIODLASTYEAR ( dCalendario[Data] ) )`,
    explicacao: "SAMEPERIODLASTYEAR desloca a janela inteira que estiver em contexto, sem você precisar saber qual é.",
    armadilha: "Se o calendário não cobrir o ano anterior inteiro, o resultado vem vazio e ninguém percebe. Gere o calendário do primeiro ao último dia.",
    tags: ["tempo", "comparação"],
    nivel: "básico",
  },
  {
    id: "dax-yoy",
    linguagem: "dax",
    titulo: "Variação contra o ano anterior",
    quando: "Mostrar crescimento em percentual, do jeito que vai para a diretoria.",
    codigo: `Receita YoY % =
VAR Atual = [Receita]
VAR Anterior = [Receita ano anterior]
RETURN
    DIVIDE ( Atual - Anterior, Anterior )`,
    explicacao: "As variáveis deixam a fórmula legível e calculam cada medida uma vez só.",
    armadilha: "Sem DIVIDE, o primeiro mês da série vira erro na cara do usuário, porque não existe ano anterior para dividir.",
    tags: ["tempo", "comparação", "percentual"],
    nivel: "básico",
  },
  {
    id: "dax-mes-anterior",
    linguagem: "dax",
    titulo: "Mês anterior",
    quando: "Comparar com o mês passado em um gráfico de linha.",
    codigo: `Receita mês anterior = CALCULATE ( [Receita], DATEADD ( dCalendario[Data], -1, MONTH ) )`,
    explicacao: "DATEADD anda no calendário, e não na tabela de fatos, então funciona mesmo em mês sem venda.",
    armadilha: "PREVIOUSMONTH ignora o dia e pega o mês inteiro. Se o visual está em dia, o número fica estranho.",
    tags: ["tempo", "comparação"],
    nivel: "básico",
  },
  {
    id: "dax-media-movel",
    linguagem: "dax",
    titulo: "Média móvel de três meses",
    quando: "Tirar o ruído de mês curto e de sazonalidade de uma série que pula muito.",
    codigo: `Receita média 3 meses =
VAR Periodo = DATESINPERIOD ( dCalendario[Data], MAX ( dCalendario[Data] ), -3, MONTH )
RETURN
    DIVIDE ( CALCULATE ( [Receita], Periodo ), 3 )`,
    explicacao: "DATESINPERIOD monta a janela de três meses terminando na data em contexto.",
    armadilha: "Dividir por 3 fixo distorce os dois primeiros meses da série. Se isso importar, divida pela contagem de meses que realmente vieram.",
    tags: ["tempo", "indicador"],
    nivel: "intermediário",
  },
  {
    id: "dax-acumulado",
    linguagem: "dax",
    titulo: "Acumulado desde sempre",
    quando: "Curva de estoque, de caixa ou de base de clientes, que não reinicia no ano.",
    codigo: `Receita acumulada =
VAR Ultima = MAX ( dCalendario[Data] )
RETURN
    CALCULATE ( [Receita], dCalendario, dCalendario[Data] <= Ultima )`,
    explicacao: "Citar a tabela dentro do CALCULATE remove o filtro de data dela e deixa só a condição de até aqui.",
    armadilha: "Usar ALL na tabela inteira também apaga o filtro de qualquer outra coluna, como ano ou mês do visual.",
    tags: ["tempo", "acumulado"],
    nivel: "intermediário",
  },
  {
    id: "dax-dias-uteis",
    linguagem: "dax",
    titulo: "Média por dia útil",
    quando: "Comparar meses com quantidade diferente de dias trabalhados.",
    codigo: `Receita por dia útil =
VAR Uteis = CALCULATE ( COUNTROWS ( dCalendario ), dCalendario[É dia útil] = TRUE () )
RETURN
    DIVIDE ( [Receita], Uteis )`,
    explicacao: "Depende de uma coluna de dia útil no calendário, que já considera feriado.",
    armadilha: "Contar dia útil só tirando sábado e domingo ignora feriado, e aí fevereiro com carnaval fica inflado.",
    tags: ["tempo", "calendário"],
    nivel: "intermediário",
  },

  // ---------------------------------------------------------------- agregação
  {
    id: "dax-receita",
    linguagem: "dax",
    titulo: "Receita a partir dos itens",
    quando: "O valor não está pronto: está em quantidade vezes preço, linha a linha.",
    codigo: `Receita = SUMX ( fItens, fItens[Quantidade] * fItens[Valor unitário] )`,
    explicacao: "SUMX multiplica linha a linha e só depois soma, que é a única forma correta aqui.",
    armadilha: "SUM ( Quantidade ) * SUM ( Valor ) dá um número maior e completamente sem sentido. É o erro mais caro desta lista.",
    tags: ["agregação", "vendas"],
    nivel: "básico",
  },
  {
    id: "dax-distintos",
    linguagem: "dax",
    titulo: "Clientes que compraram",
    quando: "Contar cliente, produto ou pedido sem repetir.",
    codigo: `Clientes ativos = DISTINCTCOUNT ( fVendas[ClienteID] )`,
    explicacao: "Conta valores diferentes da coluna dentro do filtro atual.",
    armadilha: "DISTINCTCOUNT ignora linhas com valor vazio. Se existe venda sem cliente, ela some da conta e ninguém avisa.",
    tags: ["agregação", "clientes"],
    nivel: "básico",
  },
  {
    id: "dax-ticket",
    linguagem: "dax",
    titulo: "Ticket médio",
    quando: "Saber quanto vale um pedido, em média, no recorte que estiver na tela.",
    codigo: `Ticket médio = DIVIDE ( [Receita], DISTINCTCOUNT ( fVendas[PedidoID] ) )`,
    explicacao: "Divide a receita pela quantidade de pedidos distintos, e não pela quantidade de linhas.",
    armadilha: "Usar COUNTROWS da tabela de itens infla o denominador: um pedido com cinco itens vira cinco pedidos.",
    tags: ["agregação", "vendas", "indicador"],
    nivel: "básico",
  },
  {
    id: "dax-percentual-total",
    linguagem: "dax",
    titulo: "Participação no total",
    quando: "Mostrar quanto cada categoria representa do todo.",
    codigo: `% do total =
VAR Tudo = CALCULATE ( [Receita], REMOVEFILTERS ( dProduto[Categoria] ) )
RETURN
    DIVIDE ( [Receita], Tudo )`,
    explicacao: "REMOVEFILTERS tira só o filtro da coluna citada, mantendo período e região do visual.",
    armadilha: "Com ALL na tabela inteira, o total ignora até o filtro de ano, e a soma das participações deixa de dar 100%.",
    tags: ["agregação", "percentual"],
    nivel: "intermediário",
  },
  {
    id: "dax-ranking",
    linguagem: "dax",
    titulo: "Ranking dentro do visual",
    quando: "Numerar produtos ou vendedores do maior para o menor.",
    codigo: `Posição = RANKX ( ALLSELECTED ( dProduto[Nome] ), [Receita], , DESC, DENSE )`,
    explicacao: "ALLSELECTED respeita os filtros que o usuário escolheu, mas ignora a linha atual do visual.",
    armadilha: "Com ALL, o ranking considera produtos que o usuário filtrou fora, e ele vê a posição 7 sem ver as seis primeiras.",
    tags: ["agregação", "ranking"],
    nivel: "avançado",
  },
  {
    id: "dax-top-n",
    linguagem: "dax",
    titulo: "Quanto vem dos dez maiores",
    quando: "Medir concentração de carteira, que é conversa de risco.",
    codigo: `Receita dos 10 maiores =
VAR Dez = TOPN ( 10, VALUES ( dCliente[Nome] ), [Receita], DESC )
RETURN
    CALCULATE ( [Receita], KEEPFILTERS ( Dez ) )`,
    explicacao: "TOPN devolve uma tabela com os dez primeiros, e KEEPFILTERS soma dentro do que já estava filtrado.",
    armadilha: "Sem KEEPFILTERS, os filtros do visual podem ser sobrescritos e o número não fecha com o total da página.",
    tags: ["agregação", "ranking", "qualidade"],
    nivel: "avançado",
  },
  {
    id: "dax-media-ponderada",
    linguagem: "dax",
    titulo: "Média ponderada",
    quando: "Preço médio, margem média, nota média. Toda média que não pode ser média simples.",
    codigo: `Preço médio ponderado =
DIVIDE (
    SUMX ( fItens, fItens[Quantidade] * fItens[Valor unitário] ),
    SUM ( fItens[Quantidade] )
)`,
    explicacao: "Pondera pelo volume: item vendido mil vezes pesa mais que item vendido uma.",
    armadilha: "AVERAGE do preço trata a venda de uma unidade igual à de mil, e o número fica errado sem parecer errado.",
    tags: ["agregação", "indicador"],
    nivel: "intermediário",
  },

  // ---------------------------------------------------------------- contexto
  {
    id: "dax-crossfilter",
    linguagem: "dax",
    titulo: "Filtrar nos dois sentidos, só nesta medida",
    quando: "Você precisa do filtro cruzado em um caso específico e não quer bidirecional no modelo.",
    codigo: `Clientes com pedido =
CALCULATE (
    DISTINCTCOUNT ( dCliente[ClienteID] ),
    CROSSFILTER ( fVendas[ClienteID], dCliente[ClienteID], BOTH )
)`,
    explicacao: "Liga o filtro nos dois sentidos dentro da medida, e só dela.",
    armadilha: "Ligar bidirecional no relacionamento resolve na hora e cria caminho ambíguo, número instável e lentidão no modelo inteiro.",
    tags: ["contexto", "modelagem"],
    nivel: "avançado",
  },
  {
    id: "dax-userelationship",
    linguagem: "dax",
    titulo: "Usar a segunda data",
    quando: "O pedido tem data de venda e data de entrega, e você precisa das duas.",
    codigo: `Receita por entrega =
CALCULATE ( [Receita], USERELATIONSHIP ( fVendas[Data entrega], dCalendario[Data] ) )`,
    explicacao: "Ativa o relacionamento inativo só durante este cálculo.",
    armadilha: "Criar um segundo calendário resolve, mas espalha filtro duplicado pelo relatório inteiro e confunde quem usa.",
    tags: ["contexto", "tempo", "modelagem"],
    nivel: "avançado",
  },
  {
    id: "dax-transicao",
    linguagem: "dax",
    titulo: "Somar por cliente e comparar",
    quando: "Contar quantos clientes compraram acima de um valor.",
    codigo: `Clientes acima de 10 mil =
COUNTROWS (
    FILTER (
        VALUES ( dCliente[ClienteID] ),
        [Receita] > 10000
    )
)`,
    explicacao: "Dentro do FILTER, cada linha de cliente vira contexto, e a medida é calculada para aquele cliente.",
    armadilha: "Comparar com SUM direto dá o total geral em toda linha, e o resultado vira zero ou tudo.",
    tags: ["contexto", "clientes"],
    nivel: "avançado",
  },
  {
    id: "dax-selectedvalue",
    linguagem: "dax",
    titulo: "Título que muda com o filtro",
    quando: "O usuário filtra uma região e o título do visual precisa dizer qual é.",
    codigo: `Título do gráfico =
"Receita em " & SELECTEDVALUE ( dLoja[Região], "todas as regiões" )`,
    explicacao: "SELECTEDVALUE devolve o valor quando só um está selecionado, e o texto de reserva quando há vários.",
    armadilha: "VALUES sozinho quebra com mais de um item selecionado e derruba o visual inteiro com erro.",
    tags: ["texto", "visual"],
    nivel: "básico",
  },

  // ---------------------------------------------------------------- qualidade
  {
    id: "dax-divide",
    linguagem: "dax",
    titulo: "Dividir sem quebrar",
    quando: "Qualquer divisão. Sem exceção.",
    codigo: `Margem % = DIVIDE ( [Lucro], [Receita] )`,
    explicacao: "DIVIDE devolve vazio quando o denominador é zero, em vez de erro, e ainda é mais rápido.",
    armadilha: "A barra normal quebra o visual inteiro quando aparece um zero, e sempre aparece um zero.",
    tags: ["qualidade", "obrigatório"],
    nivel: "básico",
  },
  {
    id: "dax-coalesce",
    linguagem: "dax",
    titulo: "Vazio que vira zero",
    quando: "Cartão que mostra em branco quando não houve venda, e deveria mostrar zero.",
    codigo: `Receita exibida = COALESCE ( [Receita], 0 )`,
    explicacao: "Troca o vazio por zero só na exibição, sem mexer no cálculo.",
    armadilha: "Fazer isso na medida base enche o visual de linhas com zero para todo cliente que nunca comprou.",
    tags: ["qualidade", "visual"],
    nivel: "básico",
  },
  {
    id: "dax-meta",
    linguagem: "dax",
    titulo: "Atingimento da meta",
    quando: "Comparar realizado com meta, com o farol do lado.",
    codigo: `Atingimento % = DIVIDE ( [Receita], [Meta] )

Farol =
VAR Ating = [Atingimento %]
RETURN
    SWITCH (
        TRUE (),
        ISBLANK ( Ating ), "sem meta",
        Ating >= 1, "verde",
        Ating >= 0.9, "amarelo",
        "vermelho"
    )`,
    explicacao: "SWITCH com TRUE lê de cima para baixo e para na primeira condição verdadeira.",
    armadilha: "Sem tratar o vazio primeiro, quem não tem meta cai no vermelho e o gestor cobra o que não foi combinado.",
    tags: ["indicador", "visual"],
    nivel: "intermediário",
  },
  {
    id: "dax-novos-recorrentes",
    linguagem: "dax",
    titulo: "Cliente novo ou recorrente",
    quando: "Saber quanto do faturamento do mês veio de quem já era cliente.",
    codigo: `Receita de clientes novos =
VAR Inicio = MIN ( dCalendario[Data] )
RETURN
    CALCULATE (
        [Receita],
        FILTER (
            VALUES ( dCliente[ClienteID] ),
            CALCULATE ( MIN ( fVendas[Data] ), REMOVEFILTERS ( dCalendario ) ) >= Inicio
        )
    )`,
    explicacao: "Compara a primeira compra do cliente, em toda a história, com o início do período em contexto.",
    armadilha: "Sem remover o filtro do calendário, a primeira compra passa a ser a primeira do próprio mês, e todo cliente vira novo.",
    tags: ["clientes", "indicador"],
    nivel: "avançado",
  },

  // ---------------------------------------------------------------- performance
  {
    id: "dax-filter-coluna",
    linguagem: "dax",
    titulo: "Filtrar sem varrer a tabela",
    quando: "Toda vez que você for escrever FILTER dentro de CALCULATE.",
    codigo: `Receita paga = CALCULATE ( [Receita], fVendas[Status] = "pago" )

// Quando precisar mesmo de FILTER, aplique sobre a coluna:
Receita alta = CALCULATE ( [Receita], FILTER ( VALUES ( fVendas[Faixa] ), fVendas[Faixa] = "A" ) )`,
    explicacao: "A condição direta no CALCULATE já é um filtro sobre a coluna, que é o caminho rápido.",
    armadilha: "FILTER sobre a tabela inteira varre linha a linha. Em tabela grande é a diferença entre instantâneo e cinco segundos.",
    tags: ["desempenho", "filtro", "obrigatório"],
    nivel: "intermediário",
  },
  {
    id: "dax-variaveis",
    linguagem: "dax",
    titulo: "Calcular uma vez e reaproveitar",
    quando: "A mesma medida aparece duas ou mais vezes na fórmula.",
    codigo: `Crescimento =
VAR Atual = [Receita]
VAR Anterior = [Receita ano anterior]
VAR Diferenca = Atual - Anterior
RETURN
    IF ( Anterior = 0, BLANK (), DIVIDE ( Diferenca, Anterior ) )`,
    explicacao: "A variável é calculada uma vez só, no ponto em que foi declarada.",
    armadilha: "Repetir [Receita] quatro vezes na fórmula manda o motor calcular quatro vezes, e a medida fica quatro vezes mais lenta.",
    tags: ["desempenho", "modelagem"],
    nivel: "básico",
  },
  {
    id: "dax-medida-tabela",
    linguagem: "dax",
    titulo: "Tabela só de medidas",
    quando: "O modelo passou de vinte medidas e ninguém acha nada.",
    codigo: `// Modelagem, Inserir dados, tabela vazia chamada "_Medidas".
// Mova todas as medidas para lá e esconda a coluna que veio junto.
// Ela sobe para o topo do painel de campos e organiza o modelo inteiro.`,
    explicacao: "Uma tabela vazia serve de pasta. É a organização mais barata que existe no Power BI.",
    armadilha: "Deixar medida espalhada pelas tabelas de fato faz o usuário procurar receita dentro de três lugares diferentes.",
    tags: ["modelagem", "obrigatório"],
    nivel: "básico",
  },
];
