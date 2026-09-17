import type { Item } from "./tipos";

/* Power Query (linguagem M).

   Aqui mora a parte que quase ninguém documenta direito: a etapa que você
   escreve na barra de fórmulas quando o botão da interface não dá conta.

   Todo trecho assume que existe um passo anterior chamado Origem. Se o seu
   passo tem outro nome, troque só essa palavra. */

export const M: Item[] = [
  // ---------------------------------------------------------------- estrutura
  {
    id: "m-tipo",
    linguagem: "m",
    titulo: "Fixar o tipo das colunas",
    quando: "Sempre, no fim da consulta. É o passo que evita metade dos erros de atualização.",
    codigo: `= Table.TransformColumnTypes(
    Origem,
    {
      {"Data",      type date},
      {"Valor",     Currency.Type},
      {"Quantidade", Int64.Type},
      {"Cliente",   type text}
    },
    "pt-BR"
)`,
    explicacao: "O último argumento é a cultura, e é ele que faz o Power Query entender dia/mês/ano e vírgula decimal.",
    armadilha: "Sem a cultura, a conversão usa a configuração da máquina. Funciona no seu computador e quebra no serviço, que roda em inglês.",
    tags: ["obrigatório", "tipos"],
    nivel: "básico",
  },
  {
    id: "m-nao-alterado",
    linguagem: "m",
    titulo: "Selecionar coluna pelo que fica, não pelo que sai",
    quando: "A origem ganha colunas novas de vez em quando e a consulta quebra.",
    codigo: `= Table.SelectColumns(
    Origem,
    {"Data", "Cliente", "Produto", "Valor"},
    MissingField.UseNull
)`,
    explicacao: "Declarar o que você quer deixa a consulta imune a coluna nova, e a opção no fim evita o erro quando uma some.",
    armadilha: "Remover colunas pelo nome quebra a consulta inteira no dia em que a origem renomeia uma delas.",
    tags: ["estrutura", "manutenção"],
    nivel: "intermediário",
  },
  {
    id: "m-pasta",
    linguagem: "m",
    titulo: "Ler todos os arquivos de uma pasta",
    quando: "Um Excel por mês, todo mês, com o mesmo formato.",
    codigo: `let
    Origem   = Folder.Files("C:\\dados\\vendas"),
    Somente  = Table.SelectRows(Origem, each Text.EndsWith([Name], ".xlsx") and not Text.StartsWith([Name], "~$")),
    Ler      = Table.AddColumn(Somente, "Dados", each Excel.Workbook([Content], true)[Data]{0}),
    Expandir = Table.ExpandTableColumn(Ler, "Dados", {"Data", "Cliente", "Valor"})
in
    Expandir`,
    explicacao: "Uma consulta só lê a pasta inteira, e o arquivo do mês que vem entra sozinho.",
    armadilha: "O filtro do til é obrigatório: arquivo aberto no Excel gera um temporário oculto que derruba a atualização.",
    tags: ["origem", "arquivos"],
    nivel: "avançado",
  },
  {
    id: "m-parametro",
    linguagem: "m",
    titulo: "Caminho e servidor em parâmetro",
    quando: "Antes de publicar. Sempre.",
    codigo: `// Página inicial > Gerenciar parâmetros > Novo parâmetro: pCaminho
= Folder.Files(pCaminho)`,
    explicacao: "O caminho vira parâmetro e muda no serviço sem abrir o arquivo.",
    armadilha: "Caminho cravado na fórmula aponta para a sua máquina, e a atualização agendada não encontra nada.",
    tags: ["origem", "manutenção", "obrigatório"],
    nivel: "básico",
  },

  // ---------------------------------------------------------------- limpeza
  {
    id: "m-limpar-texto",
    linguagem: "m",
    titulo: "Limpar texto de verdade",
    quando: "O relacionamento não casa e o texto parece idêntico nos dois lados.",
    codigo: `= Table.TransformColumns(
    Origem,
    {{"Cliente", each Text.Upper(Text.Trim(Text.Clean(_))), type text}}
)`,
    explicacao: "Clean tira caractere invisível, Trim tira espaço nas pontas e Upper acaba com a diferença de maiúscula.",
    armadilha: "Trim sozinho não remove espaço não separável, que é o que vem colado de página web e de PDF.",
    tags: ["qualidade", "texto"],
    nivel: "intermediário",
  },
  {
    id: "m-preencher",
    linguagem: "m",
    titulo: "Preencher para baixo",
    quando: "A planilha tem o nome só na primeira linha do grupo, como todo relatório exportado.",
    codigo: `= Table.FillDown(Origem, {"Regiao", "Vendedor"})`,
    explicacao: "Repete o último valor não vazio para as linhas de baixo.",
    armadilha: "Célula com texto vazio não é nula, então o preenchimento pula. Substitua vazio por nulo antes.",
    tags: ["qualidade", "planilha"],
    nivel: "básico",
  },
  {
    id: "m-nulo",
    linguagem: "m",
    titulo: "Trocar nulo por zero",
    quando: "A soma some ou a coluna calculada dá erro por causa de nulo.",
    codigo: `= Table.ReplaceValue(Origem, null, 0, Replacer.ReplaceValue, {"Desconto"})`,
    explicacao: "Substitui só na coluna que você indicar, sem mexer no resto.",
    armadilha: "Nulo em conta contamina tudo: null + 10 dá null, não 10. Um desconto vazio zera a linha inteira.",
    tags: ["qualidade", "tipos"],
    nivel: "básico",
  },
  {
    id: "m-desdinamizar",
    linguagem: "m",
    titulo: "Transformar colunas de mês em linhas",
    quando: "A planilha veio com jan, fev, mar como colunas, e o Power BI precisa delas empilhadas.",
    codigo: `= Table.UnpivotOtherColumns(
    Origem,
    {"Produto", "Regiao"},
    "Mes",
    "Valor"
)`,
    explicacao: "Usar a versão outras colunas mantém o que é chave e desdinamiza tudo o mais, inclusive o mês que aparecer depois.",
    armadilha: "Desdinamizar listando as colunas quebra em abril, quando entra a coluna nova. A versão outras colunas não quebra.",
    tags: ["formato", "planilha", "obrigatório"],
    nivel: "intermediário",
  },

  // ---------------------------------------------------------------- lógica
  {
    id: "m-condicional",
    linguagem: "m",
    titulo: "Coluna condicional em cadeia",
    quando: "Faixas de valor, de prazo ou de nota.",
    codigo: `= Table.AddColumn(Origem, "Faixa", each
    if      [Valor] >= 10000 then "A"
    else if [Valor] >=  5000 then "B"
    else if [Valor] >=  1000 then "C"
    else                          "D",
    type text)`,
    explicacao: "Declarar o tipo no fim evita que a coluna nasça como qualquer e estrague o modelo.",
    armadilha: "M diferencia maiúscula de minúscula: If com I maiúsculo é erro de sintaxe, e a mensagem não ajuda nada.",
    tags: ["lógica", "tipos"],
    nivel: "básico",
  },
  {
    id: "m-mesclar",
    linguagem: "m",
    titulo: "Mesclar sem perder linha",
    quando: "Trazer um campo da tabela de cadastro para a de movimento.",
    codigo: `let
    Junta   = Table.NestedJoin(Origem, {"ClienteId"}, Clientes, {"Id"}, "cli", JoinKind.LeftOuter),
    Expande = Table.ExpandTableColumn(Junta, "cli", {"Nome", "Segmento"})
in
    Expande`,
    explicacao: "A junção à esquerda mantém toda linha de movimento, mesmo quando o cadastro não tem o cliente.",
    armadilha: "Se o cadastro tiver a chave repetida, a mesclagem multiplica as linhas de movimento e o total infla. Confira o cadastro antes.",
    tags: ["junção", "conciliação"],
    nivel: "intermediário",
  },
  {
    id: "m-agrupar",
    linguagem: "m",
    titulo: "Agrupar somando e contando de uma vez",
    quando: "Reduzir o volume antes de carregar, quando o detalhe não vai ser usado.",
    codigo: `= Table.Group(
    Origem,
    {"Mes", "Produto"},
    {
      {"Receita", each List.Sum([Valor]),  Currency.Type},
      {"Pedidos", each Table.RowCount(_),  Int64.Type},
      {"Clientes", each List.Count(List.Distinct([ClienteId])), Int64.Type}
    }
)`,
    explicacao: "Dentro do agrupamento, o sublinhado é a tabela do grupo e o colchete é a coluna como lista.",
    armadilha: "Agrupar no Power Query mata o detalhe para sempre. Se o usuário vai querer abrir a linha, agrupe com medida, não aqui.",
    tags: ["agregação", "desempenho"],
    nivel: "avançado",
  },
  {
    id: "m-indice-grupo",
    linguagem: "m",
    titulo: "Numerar dentro de cada grupo",
    quando: "Marcar a primeira compra de cada cliente, ou a última versão do registro.",
    codigo: `= Table.Group(Origem, {"ClienteId"}, {{"t", each
      Table.AddIndexColumn(Table.Sort(_, {{"Data", Order.Ascending}}), "Ordem", 1, 1),
      type table}})`,
    explicacao: "Agrupa, ordena dentro do grupo e numera. Depois é só expandir.",
    armadilha: "Ordenar a tabela toda antes de agrupar não garante a ordem dentro do grupo. A ordenação precisa estar dentro.",
    tags: ["lógica", "janela"],
    nivel: "avançado",
  },

  // ---------------------------------------------------------------- desempenho
  {
    id: "m-ordem-passos",
    linguagem: "m",
    titulo: "Filtrar antes de tudo",
    quando: "A atualização demora e você não sabe por quê.",
    codigo: `let
    Origem   = Sql.Database("servidor", "base"),
    Tabela   = Origem{[Schema="dbo", Item="pedidos"]}[Data],
    Filtra   = Table.SelectRows(Tabela, each [Data] >= #date(2024, 1, 1)),
    Colunas  = Table.SelectColumns(Filtra, {"Data", "ClienteId", "Valor"}),
    Tipos    = Table.TransformColumnTypes(Colunas, {{"Valor", Currency.Type}})
in
    Tipos`,
    explicacao: "Filtro e seleção de colunas primeiro, transformação depois. Assim o banco faz o trabalho pesado e não a sua máquina.",
    armadilha: "Um passo de coluna personalizada no meio quebra a dobra de consulta, e daí em diante tudo vem para o Power Query linha a linha.",
    tags: ["desempenho", "origem"],
    nivel: "avançado",
  },
  {
    id: "m-dobra",
    linguagem: "m",
    titulo: "Conferir se a dobra de consulta ainda está de pé",
    quando: "Sempre que a consulta puxa de banco de dados.",
    codigo: `// Clique direito no passo > Exibir consulta nativa.
// Habilitado = o banco ainda está fazendo o trabalho.
// Cinza = a dobra quebrou nesse passo, e é ele que você precisa mover.`,
    explicacao: "É o diagnóstico mais barato de desempenho no Power Query, e leva cinco segundos.",
    armadilha: "Table.Buffer, índice e muita coluna personalizada quebram a dobra. Use quando precisar, mas sabendo o preço.",
    tags: ["desempenho", "diagnóstico"],
    nivel: "avançado",
  },
  {
    id: "m-erro",
    linguagem: "m",
    titulo: "Segurar o erro na linha",
    quando: "Uma conversão falha em poucas linhas e derruba a consulta inteira.",
    codigo: `= Table.AddColumn(Origem, "Valor limpo", each
    try Number.From([Valor], "pt-BR") otherwise null,
    type number)`,
    explicacao: "O try devolve o valor quando dá certo e o alternativo quando falha, sem parar a atualização.",
    armadilha: "Engolir erro esconde problema de origem. Guarde as linhas que falharam em uma consulta separada, para alguém olhar.",
    tags: ["qualidade", "tipos"],
    nivel: "intermediário",
  },
  {
    id: "m-data-do-nome",
    linguagem: "m",
    titulo: "Tirar a data do nome do arquivo",
    quando: "Os arquivos da pasta são vendas_2026_03.xlsx e não existe coluna de mês dentro.",
    codigo: `= Table.AddColumn(Origem, "Competencia", each
    #date(
      Number.From(Text.Middle([Name], 7, 4)),
      Number.From(Text.Middle([Name], 12, 2)),
      1
    ),
    type date)`,
    explicacao: "O nome do arquivo é dado. Quando ele carrega a competência, use.",
    armadilha: "Posição fixa quebra no dia em que alguém renomeia o arquivo. Se o padrão for frágil, prefira Text.BetweenDelimiters.",
    tags: ["origem", "tempo", "arquivos"],
    nivel: "intermediário",
  },
  {
    id: "m-calendario",
    linguagem: "m",
    titulo: "Calendário direto no Power Query",
    quando: "Você prefere a tabela de datas como consulta e não como tabela calculada.",
    codigo: `let
    Inicio = #date(2023, 1, 1),
    Fim    = #date(2027, 12, 31),
    Dias   = List.Dates(Inicio, Duration.Days(Fim - Inicio) + 1, #duration(1, 0, 0, 0)),
    Tabela = Table.FromList(Dias, Splitter.SplitByNothing(), {"Data"}),
    Tipo   = Table.TransformColumnTypes(Tabela, {{"Data", type date}}),
    Ano    = Table.AddColumn(Tipo, "Ano",   each Date.Year([Data]),  Int64.Type),
    Mes    = Table.AddColumn(Ano,  "MesNum", each Date.Month([Data]), Int64.Type),
    Nome   = Table.AddColumn(Mes,  "Mes",   each Date.ToText([Data], "MMM", "pt-BR"), type text)
in
    Nome`,
    explicacao: "Gera a lista de dias e enriquece. O mais um no tamanho é o que inclui o último dia.",
    armadilha: "Esquecer o mais um deixa o calendário terminando um dia antes, e o último dia do ano fica sem linha.",
    tags: ["calendário", "tempo"],
    nivel: "intermediário",
  },
  {
    id: "m-anexar",
    linguagem: "m",
    titulo: "Empilhar consultas",
    quando: "Duas origens com o mesmo formato, como o histórico e o corrente.",
    codigo: `= Table.Combine({Historico, Corrente})`,
    explicacao: "Empilha as tabelas. Coluna que existe só em uma vira nula na outra, sem erro.",
    armadilha: "Nome de coluna com diferença de maiúscula gera duas colunas separadas. Padronize os cabeçalhos antes de empilhar.",
    tags: ["estrutura", "origem"],
    nivel: "básico",
  },
];
