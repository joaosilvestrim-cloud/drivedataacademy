import type { Item } from "./tipos";

/* Os trechos de SQL que resolvem o dia a dia de quem trabalha com dados.

   Escritos em SQL padrão, que roda em SQL Server, Postgres, Snowflake e
   BigQuery com ajuste mínimo. Onde o dialeto muda de verdade, a armadilha avisa.

   A tabela de exemplo é sempre a mesma: pedidos, itens, clientes e produtos. */

export const SQL: Item[] = [
  // ---------------------------------------------------------------- qualidade
  {
    id: "sql-duplicatas",
    linguagem: "sql",
    titulo: "Achar duplicata por chave",
    quando: "O total está maior que o esperado e você desconfia de linha repetida.",
    codigo: `SELECT pedido_id, COUNT(*) AS vezes
FROM pedidos
GROUP BY pedido_id
HAVING COUNT(*) > 1
ORDER BY vezes DESC;`,
    explicacao: "Agrupa pela chave que deveria ser única e mostra o que apareceu mais de uma vez.",
    armadilha: "Conferir só a contagem total não acusa duplicata. Compare COUNT(*) com COUNT(DISTINCT chave): se diferirem, tem repetido.",
    tags: ["qualidade", "conciliação"],
    nivel: "básico",
  },
  {
    id: "sql-deduplicar",
    linguagem: "sql",
    titulo: "Ficar com a versão mais recente",
    quando: "A tabela tem várias versões do mesmo registro e você quer a última.",
    codigo: `WITH ordenado AS (
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY pedido_id ORDER BY atualizado_em DESC) AS versao
  FROM pedidos
)
SELECT * FROM ordenado WHERE versao = 1;`,
    explicacao: "ROW_NUMBER numera dentro de cada chave, e a versão 1 é a mais recente.",
    armadilha: "DISTINCT não resolve isso: ele tira linha idêntica, e aqui as linhas são diferentes de propósito.",
    tags: ["qualidade", "janela"],
    nivel: "intermediário",
  },
  {
    id: "sql-orfaos",
    linguagem: "sql",
    titulo: "Achar chave órfã",
    quando: "O painel perdeu linhas e você suspeita de junção comendo registro.",
    codigo: `SELECT p.pedido_id, p.cliente_id
FROM pedidos p
LEFT JOIN clientes c ON c.id = p.cliente_id
WHERE c.id IS NULL;`,
    explicacao: "A junção à esquerda mantém todo pedido, e o filtro por nulo isola quem não encontrou par.",
    armadilha: "Com junção comum essas linhas simplesmente somem, e o relatório fecha menor sem nenhum aviso.",
    tags: ["qualidade", "junção", "conciliação"],
    nivel: "básico",
  },
  {
    id: "sql-nulos",
    linguagem: "sql",
    titulo: "Mapa de nulos da tabela",
    quando: "Recebeu uma base nova e precisa saber onde estão os buracos antes de confiar nela.",
    codigo: `SELECT
  COUNT(*)                                             AS linhas,
  SUM(CASE WHEN cliente_id IS NULL THEN 1 ELSE 0 END)  AS sem_cliente,
  SUM(CASE WHEN valor      IS NULL THEN 1 ELSE 0 END)  AS sem_valor,
  SUM(CASE WHEN data       IS NULL THEN 1 ELSE 0 END)  AS sem_data
FROM pedidos;`,
    explicacao: "Uma passada só na tabela devolve o diagnóstico de todas as colunas que te preocupam.",
    armadilha: "COUNT(coluna) já ignora nulo, então contar coluna e achar que contou linha é o engano clássico.",
    tags: ["qualidade", "diagnóstico"],
    nivel: "básico",
  },

  // ---------------------------------------------------------------- junções
  {
    id: "sql-anti-join",
    linguagem: "sql",
    titulo: "Quem nunca comprou",
    quando: "Lista de clientes para a campanha de reativação.",
    codigo: `SELECT c.id, c.nome
FROM clientes c
WHERE NOT EXISTS (
  SELECT 1 FROM pedidos p WHERE p.cliente_id = c.id
);`,
    explicacao: "NOT EXISTS para na primeira linha que encontra, então costuma ser mais rápido que NOT IN.",
    armadilha: "NOT IN com uma subconsulta que devolve nulo retorna vazio, sempre, sem erro nenhum. É o bug mais silencioso do SQL.",
    tags: ["junção", "clientes"],
    nivel: "intermediário",
  },
  {
    id: "sql-left-zero",
    linguagem: "sql",
    titulo: "Todo cliente, comprando ou não",
    quando: "A lista precisa mostrar quem tem zero, e não só quem tem venda.",
    codigo: `SELECT c.nome, COUNT(p.id) AS pedidos, COALESCE(SUM(p.valor), 0) AS total
FROM clientes c
LEFT JOIN pedidos p ON p.cliente_id = c.id
GROUP BY c.id, c.nome
ORDER BY total DESC;`,
    explicacao: "COUNT de uma coluna do lado direito conta zero quando não houve par, que é o que se espera.",
    armadilha: "COUNT(*) devolve 1 para quem não comprou, porque a junção à esquerda cria uma linha com o outro lado vazio.",
    tags: ["junção", "agregação"],
    nivel: "básico",
  },
  {
    id: "sql-fan-out",
    linguagem: "sql",
    titulo: "Somar sem multiplicar linha",
    quando: "Juntar pedido com itens e o total do pedido aparece dobrado.",
    codigo: `SELECT p.pedido_id, p.frete, i.total_itens
FROM pedidos p
JOIN (
  SELECT pedido_id, SUM(quantidade * valor_unitario) AS total_itens
  FROM itens
  GROUP BY pedido_id
) i ON i.pedido_id = p.pedido_id;`,
    explicacao: "Agregue o lado de muitos antes de juntar, e o pedido continua sendo uma linha só.",
    armadilha: "Juntar direto com itens repete o frete uma vez por item, e o total do frete vira o triplo do real.",
    tags: ["junção", "agregação", "conciliação"],
    nivel: "avançado",
  },

  // ---------------------------------------------------------------- janelas
  {
    id: "sql-top-por-grupo",
    linguagem: "sql",
    titulo: "Os três maiores de cada categoria",
    quando: "Ranking dentro de grupo, e não do geral.",
    codigo: `WITH receita AS (
  SELECT pr.categoria, pr.nome, SUM(i.quantidade * i.valor_unitario) AS total
  FROM itens i
  JOIN produtos pr ON pr.id = i.produto_id
  GROUP BY pr.categoria, pr.nome
)
SELECT *
FROM (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY categoria ORDER BY total DESC) AS posicao
  FROM receita
) r
WHERE posicao <= 3
ORDER BY categoria, posicao;`,
    explicacao: "PARTITION BY reinicia a numeração a cada categoria.",
    armadilha: "ORDER BY com LIMIT 3 devolve os três do geral. É o erro mais comum em entrevista de SQL.",
    tags: ["janela", "ranking"],
    nivel: "avançado",
  },
  {
    id: "sql-lag",
    linguagem: "sql",
    titulo: "Comparar com a linha anterior",
    quando: "Crescimento mês a mês direto no SQL, sem levar para a ferramenta.",
    codigo: `SELECT
  mes,
  receita,
  LAG(receita) OVER (ORDER BY mes) AS receita_anterior,
  receita - LAG(receita) OVER (ORDER BY mes) AS variacao
FROM receita_mensal
ORDER BY mes;`,
    explicacao: "LAG olha a linha anterior na ordem que você definir, sem precisar juntar a tabela com ela mesma.",
    armadilha: "Se algum mês não tem venda, ele não existe na tabela e o LAG pula para dois meses atrás sem avisar. Gere a série de meses antes.",
    tags: ["janela", "tempo"],
    nivel: "intermediário",
  },
  {
    id: "sql-acumulado",
    linguagem: "sql",
    titulo: "Acumulado corrido",
    quando: "Curva de caixa, de estoque ou de base de clientes.",
    codigo: `SELECT
  mes,
  receita,
  SUM(receita) OVER (ORDER BY mes ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS acumulado
FROM receita_mensal
ORDER BY mes;`,
    explicacao: "A janela vai do começo da série até a linha atual.",
    armadilha: "Sem a cláusula ROWS, alguns bancos somam todas as linhas com o mesmo valor de ordenação, e o acumulado dá saltos.",
    tags: ["janela", "tempo", "acumulado"],
    nivel: "avançado",
  },
  {
    id: "sql-participacao",
    linguagem: "sql",
    titulo: "Participação de cada linha no total",
    quando: "Mostrar percentual sem precisar de subconsulta.",
    codigo: `SELECT
  categoria,
  total,
  total * 1.0 / SUM(total) OVER () AS participacao
FROM receita_por_categoria;`,
    explicacao: "OVER sem partição usa o total geral do resultado.",
    armadilha: "Em banco que divide inteiro por inteiro, o resultado vira zero. Multiplicar por 1.0 força a conta decimal.",
    tags: ["janela", "percentual"],
    nivel: "intermediário",
  },

  // ---------------------------------------------------------------- tempo
  {
    id: "sql-serie-mensal",
    linguagem: "sql",
    titulo: "Série mês a mês que ordena sozinha",
    quando: "Levar a série para um gráfico sem que dezembro venha antes de fevereiro.",
    codigo: `SELECT
  TO_CHAR(data, 'YYYY-MM') AS mes,     -- Postgres
  -- FORMAT(data, 'yyyy-MM')          -- SQL Server
  SUM(valor) AS receita
FROM pedidos
WHERE status = 'pago'
GROUP BY TO_CHAR(data, 'YYYY-MM')
ORDER BY mes;`,
    explicacao: "O texto no formato ano e mês ordena corretamente em qualquer ferramenta.",
    armadilha: "Agrupar só pelo número do mês soma anos diferentes na mesma linha, e o gráfico fica lindo e errado.",
    tags: ["tempo", "agregação"],
    nivel: "básico",
  },
  {
    id: "sql-ultimo-dia",
    linguagem: "sql",
    titulo: "Fechamento no último dia do mês",
    quando: "O filtro de data precisa pegar o mês inteiro, inclusive o dia 31 às 23h59.",
    codigo: `WHERE data >= DATE '2026-03-01'
  AND data <  DATE '2026-04-01';`,
    explicacao: "Maior ou igual ao primeiro dia e menor que o primeiro do mês seguinte pega tudo, inclusive hora.",
    armadilha: "BETWEEN com o dia 31 corta tudo que aconteceu depois da meia-noite daquele dia, e o fechamento perde um dia de venda.",
    tags: ["tempo", "conciliação", "obrigatório"],
    nivel: "básico",
  },
  {
    id: "sql-calendario",
    linguagem: "sql",
    titulo: "Gerar a série de meses",
    quando: "O gráfico precisa mostrar o mês sem venda como zero, e não pular.",
    codigo: `-- Postgres
SELECT generate_series(DATE '2026-01-01', DATE '2026-12-01', INTERVAL '1 month') AS mes;

-- SQL Server
WITH meses AS (
  SELECT CAST('2026-01-01' AS date) AS mes
  UNION ALL
  SELECT DATEADD(MONTH, 1, mes) FROM meses WHERE mes < '2026-12-01'
)
SELECT * FROM meses;`,
    explicacao: "Gere o calendário e junte os dados nele, nunca o contrário.",
    armadilha: "Sem a série, o mês sem movimento some do gráfico e a queda vira um buraco que ninguém enxerga.",
    tags: ["tempo", "calendário"],
    nivel: "intermediário",
  },

  // ---------------------------------------------------------------- formato
  {
    id: "sql-pivot",
    linguagem: "sql",
    titulo: "Virar linha em coluna",
    quando: "Precisa de uma matriz de meses em coluna para exportar.",
    codigo: `SELECT
  categoria,
  SUM(CASE WHEN mes = '2026-01' THEN valor ELSE 0 END) AS jan,
  SUM(CASE WHEN mes = '2026-02' THEN valor ELSE 0 END) AS fev,
  SUM(CASE WHEN mes = '2026-03' THEN valor ELSE 0 END) AS mar
FROM vendas_mensais
GROUP BY categoria;`,
    explicacao: "CASE dentro do SUM é o pivô que funciona em qualquer banco, sem sintaxe proprietária.",
    armadilha: "Pivô com coluna fixa quebra quando entra um mês novo. Se a coluna muda, deixe para a ferramenta de visualização girar.",
    tags: ["formato", "agregação"],
    nivel: "intermediário",
  },
  {
    id: "sql-texto",
    linguagem: "sql",
    titulo: "Casar texto que não casa",
    quando: "A junção por nome não encontra par e você jura que o nome é igual.",
    codigo: `SELECT *
FROM clientes c
JOIN cadastro x
  ON UPPER(TRIM(c.nome)) = UPPER(TRIM(x.nome));`,
    explicacao: "Tira espaço sobrando e diferença de maiúscula, que são as duas causas de quase todo texto que não casa.",
    armadilha: "Junção por texto é remendo. Se acontece com frequência, o problema é falta de chave, e o conserto é no cadastro.",
    tags: ["qualidade", "junção"],
    nivel: "básico",
  },
  {
    id: "sql-having",
    linguagem: "sql",
    titulo: "Filtrar depois de somar",
    quando: "Mostrar só clientes que passaram de um valor no período.",
    codigo: `SELECT cliente_id, SUM(valor) AS total
FROM pedidos
WHERE status = 'pago'
GROUP BY cliente_id
HAVING SUM(valor) > 10000
ORDER BY total DESC;`,
    explicacao: "WHERE filtra linha antes de agrupar, HAVING filtra o resultado do grupo.",
    armadilha: "Tentar usar o apelido da coluna somada no WHERE dá erro, porque naquele momento a soma ainda não existe.",
    tags: ["agregação", "filtro"],
    nivel: "básico",
  },
  {
    id: "sql-conciliacao",
    linguagem: "sql",
    titulo: "Conferir dois lados de uma vez",
    quando: "O painel não bate com o sistema e você quer ver onde a diferença mora.",
    codigo: `SELECT
  COALESCE(a.mes, b.mes)                       AS mes,
  COALESCE(a.total, 0)                         AS sistema,
  COALESCE(b.total, 0)                         AS painel,
  COALESCE(b.total, 0) - COALESCE(a.total, 0)  AS diferenca
FROM totais_sistema a
FULL OUTER JOIN totais_painel b ON b.mes = a.mes
ORDER BY ABS(COALESCE(b.total, 0) - COALESCE(a.total, 0)) DESC;`,
    explicacao: "A junção completa mantém os meses que existem em um lado só, que é justamente onde a divergência costuma estar.",
    armadilha: "Junção comum esconde o grupo que só existe de um lado, que é a causa mais comum de diferença de escopo.",
    tags: ["conciliação", "junção"],
    nivel: "avançado",
  },
];
