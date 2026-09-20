import type { Item } from "./tipos";

/* Oracle: o que muda quando o banco do cliente não é SQL Server nem Postgres.

   Quase todo relatório de ERP grande no Brasil sai de um Oracle, e é ali que o
   SQL "normal" começa a dar erro. Cada verbete aqui é uma diferença que já
   custou uma tarde de alguém: função com outro nome, data que não é data,
   paginação com outra sintaxe.

   Testado na sintaxe do 12c em diante, que é o que se encontra em produção. */

export const ORACLE: Item[] = [
  // ------------------------------------------------------------------ básico
  {
    id: "ora-dual",
    linguagem: "oracle",
    titulo: "SELECT sem tabela",
    quando: "Testar uma função ou ver a data do servidor.",
    codigo: `SELECT SYSDATE, USER, 1 + 1 FROM dual;`,
    explicacao: "No Oracle todo SELECT precisa de um FROM, e dual é a tabela de uma linha que existe para isso.",
    armadilha: "SELECT 1 sem FROM funciona em SQL Server e Postgres e dá erro aqui. É o primeiro tropeço de quem chega.",
    tags: ["oracle", "sintaxe"],
    nivel: "básico",
  },
  {
    id: "ora-nulo",
    linguagem: "oracle",
    titulo: "Tratar nulo",
    quando: "Campo opcional que precisa virar zero ou texto padrão.",
    codigo: `SELECT
  NVL(desconto, 0)                    AS desconto,
  NVL2(vendedor_id, 'com vendedor', 'sem vendedor') AS origem,
  COALESCE(apelido, nome, 'sem nome') AS exibicao
FROM pedidos;`,
    explicacao: "NVL troca o nulo, NVL2 escolhe entre dois caminhos e COALESCE pega o primeiro que não for nulo.",
    armadilha: "ISNULL não existe no Oracle. E atenção: texto vazio ('') é NULL aqui, diferente dos outros bancos.",
    tags: ["qualidade", "oracle"],
    nivel: "básico",
  },
  {
    id: "ora-concat",
    linguagem: "oracle",
    titulo: "Juntar texto",
    quando: "Montar um rótulo com código e nome.",
    codigo: `SELECT codigo || ' - ' || nome AS produto FROM produtos;`,
    explicacao: "O operador de concatenação é a barra dupla.",
    armadilha: "O sinal de mais soma e o CONCAT do Oracle só aceita dois argumentos. Para três pedaços, use a barra dupla.",
    tags: ["texto", "oracle", "sintaxe"],
    nivel: "básico",
  },

  // -------------------------------------------------------------------- data
  {
    id: "ora-data-texto",
    linguagem: "oracle",
    titulo: "Converter data e texto",
    quando: "Filtrar por data ou mostrar a data formatada.",
    codigo: `SELECT
  TO_CHAR(emissao, 'DD/MM/YYYY')                AS emissao_br,
  TO_CHAR(emissao, 'YYYY-MM')                   AS competencia
FROM notas
WHERE emissao >= TO_DATE('01/03/2026', 'DD/MM/YYYY')
  AND emissao <  TO_DATE('01/04/2026', 'DD/MM/YYYY');`,
    explicacao: "Sempre diga o formato na conversão: TO_DATE e TO_CHAR com a máscara explícita.",
    armadilha: "Comparar data com texto solto depende do NLS_DATE_FORMAT da sessão. Funciona no seu usuário e quebra no do servidor.",
    tags: ["tempo", "oracle", "obrigatório"],
    nivel: "básico",
  },
  {
    id: "ora-truncar-data",
    linguagem: "oracle",
    titulo: "Data sem a hora",
    quando: "Agrupar por dia quando o campo tem hora junto.",
    codigo: `SELECT TRUNC(emissao) AS dia, SUM(valor) AS total
FROM notas
GROUP BY TRUNC(emissao)
ORDER BY dia;`,
    explicacao: "DATE no Oracle sempre carrega hora. TRUNC zera a hora e deixa o dia limpo.",
    armadilha: "Filtrar com igual a uma data traz zero linha, porque as horas não batem. Use TRUNC ou a faixa de um dia.",
    tags: ["tempo", "oracle"],
    nivel: "básico",
  },
  {
    id: "ora-meses",
    linguagem: "oracle",
    titulo: "Andar no calendário",
    quando: "Mês anterior, fim de mês, diferença entre datas.",
    codigo: `SELECT
  ADD_MONTHS(SYSDATE, -1)          AS mes_passado,
  LAST_DAY(SYSDATE)                AS fim_do_mes,
  TRUNC(SYSDATE, 'MM')             AS inicio_do_mes,
  MONTHS_BETWEEN(SYSDATE, emissao) AS meses,
  SYSDATE - emissao                AS dias
FROM notas;`,
    explicacao: "Subtrair duas datas dá dias direto. Para mês, use as funções próprias, que respeitam mês de 28 a 31 dias.",
    armadilha: "DATEADD e DATEDIFF não existem no Oracle. MONTHS_BETWEEN devolve número quebrado, então arredonde quando for contar mês cheio.",
    tags: ["tempo", "oracle"],
    nivel: "intermediário",
  },

  // -------------------------------------------------------- consulta do dia
  {
    id: "ora-paginacao",
    linguagem: "oracle",
    titulo: "Os 10 primeiros",
    quando: "Amostra rápida ou ranking com corte.",
    codigo: `-- 12c em diante
SELECT * FROM pedidos ORDER BY valor DESC
FETCH FIRST 10 ROWS ONLY;

-- versões antigas
SELECT * FROM (SELECT * FROM pedidos ORDER BY valor DESC)
WHERE ROWNUM <= 10;`,
    explicacao: "FETCH FIRST é o jeito moderno. Em banco antigo, o ROWNUM precisa estar do lado de fora da ordenação.",
    armadilha: "ROWNUM no mesmo SELECT do ORDER BY numera antes de ordenar: traz 10 linhas quaisquer, não as 10 maiores.",
    tags: ["ranking", "oracle", "obrigatório"],
    nivel: "intermediário",
  },
  {
    id: "ora-janela",
    linguagem: "oracle",
    titulo: "Última posição de cada chave",
    quando: "Pegar o registro mais recente por cliente, produto ou contrato.",
    codigo: `SELECT *
FROM (
  SELECT p.*, ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY emissao DESC) AS rn
  FROM pedidos p
)
WHERE rn = 1;`,
    explicacao: "Mesma ideia dos outros bancos: numera dentro do grupo e fica com a primeira linha.",
    armadilha: "Usar MAX(emissao) com GROUP BY devolve a data certa e os outros campos errados, misturando linhas diferentes.",
    tags: ["janela", "oracle"],
    nivel: "intermediário",
  },
  {
    id: "ora-listagg",
    linguagem: "oracle",
    titulo: "Juntar valores em uma linha",
    quando: "Listar os produtos de um pedido em uma célula só.",
    codigo: `SELECT pedido_id,
       LISTAGG(produto, ', ') WITHIN GROUP (ORDER BY produto) AS produtos
FROM itens
GROUP BY pedido_id;`,
    explicacao: "É o STRING_AGG do Oracle, com a ordenação declarada dentro.",
    armadilha: "O resultado estoura em 4000 caracteres e derruba a consulta. Em lista longa, use LISTAGG com ON OVERFLOW TRUNCATE.",
    tags: ["agregação", "texto", "oracle"],
    nivel: "intermediário",
  },
  {
    id: "ora-pivot",
    linguagem: "oracle",
    titulo: "Virar linha em coluna",
    quando: "Matriz de meses ou de status para exportar.",
    codigo: `SELECT * FROM (
  SELECT categoria, TO_CHAR(emissao, 'MM') AS mes, valor FROM notas
)
PIVOT (SUM(valor) FOR mes IN ('01' AS jan, '02' AS fev, '03' AS mar));`,
    explicacao: "O Oracle tem PIVOT nativo: a subconsulta entrega as três colunas, chave, coluna e valor.",
    armadilha: "A lista do IN é fixa. Mês novo não aparece sozinho, e é por isso que girar no Power BI costuma ser melhor.",
    tags: ["formato", "oracle"],
    nivel: "avançado",
  },
  {
    id: "ora-merge",
    linguagem: "oracle",
    titulo: "Atualizar ou inserir de uma vez",
    quando: "Carga incremental em tabela de destino.",
    codigo: `MERGE INTO dim_cliente d
USING (SELECT id, nome, cidade FROM stg_cliente) s
   ON (d.id = s.id)
WHEN MATCHED THEN UPDATE SET d.nome = s.nome, d.cidade = s.cidade
WHEN NOT MATCHED THEN INSERT (id, nome, cidade) VALUES (s.id, s.nome, s.cidade);`,
    explicacao: "Um comando resolve a carga: o que existe atualiza, o que não existe entra.",
    armadilha: "Se a consulta de origem tiver a chave repetida, o MERGE aborta no meio. Deduplique a origem antes.",
    tags: ["carga", "oracle", "modelagem"],
    nivel: "avançado",
  },
  {
    id: "ora-hierarquia",
    linguagem: "oracle",
    titulo: "Estrutura em árvore",
    quando: "Centro de custo, plano de contas, estrutura de produto.",
    codigo: `SELECT LPAD(' ', 2 * (LEVEL - 1)) || nome AS estrutura, LEVEL
FROM centros
START WITH pai_id IS NULL
CONNECT BY PRIOR id = pai_id
ORDER SIBLINGS BY nome;`,
    explicacao: "CONNECT BY é a navegação hierárquica nativa do Oracle, e LEVEL diz a profundidade.",
    armadilha: "Dado com ciclo trava a consulta. Se pode haver laço, use CONNECT BY NOCYCLE.",
    tags: ["modelagem", "oracle"],
    nivel: "avançado",
  },

  // ----------------------------------------------------------- desempenho
  {
    id: "ora-plano",
    linguagem: "oracle",
    titulo: "Ver o plano da consulta",
    quando: "A consulta demora e você precisa saber por quê.",
    codigo: `EXPLAIN PLAN FOR
SELECT * FROM pedidos WHERE cliente_id = 100;

SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);`,
    explicacao: "O plano mostra se o banco usou índice ou leu a tabela inteira.",
    armadilha: "FULL TABLE SCAN em tabela grande é o sinal. Costuma ser função aplicada na coluna filtrada, que anula o índice.",
    tags: ["desempenho", "oracle", "diagnóstico"],
    nivel: "avançado",
  },
  {
    id: "ora-funcao-indice",
    linguagem: "oracle",
    titulo: "Não estrague o índice",
    quando: "Filtro por data ou por texto em tabela grande.",
    codigo: `-- ruim: a função na coluna ignora o índice
WHERE TRUNC(emissao) = TO_DATE('01/03/2026', 'DD/MM/YYYY')

-- bom: a faixa usa o índice
WHERE emissao >= TO_DATE('01/03/2026', 'DD/MM/YYYY')
  AND emissao <  TO_DATE('02/03/2026', 'DD/MM/YYYY')`,
    explicacao: "Índice serve a coluna crua. Deixe a coluna sozinha de um lado e a conta do outro.",
    armadilha: "UPPER na coluna tem o mesmo efeito. Se a busca sem caixa é frequente, peça um índice por função.",
    tags: ["desempenho", "oracle", "obrigatório"],
    nivel: "avançado",
  },
  {
    id: "ora-dicionario",
    linguagem: "oracle",
    titulo: "Descobrir tabelas e colunas",
    quando: "Chegou em um banco que você nunca viu.",
    codigo: `SELECT table_name, num_rows
FROM all_tables
WHERE owner = 'PROTHEUS' AND table_name LIKE 'SD1%'
ORDER BY num_rows DESC;

SELECT column_name, data_type, data_length
FROM all_tab_columns
WHERE owner = 'PROTHEUS' AND table_name = 'SD1010'
ORDER BY column_id;`,
    explicacao: "O dicionário do Oracle responde o que existe, sem depender de ninguém explicar.",
    armadilha: "num_rows vem da última coleta de estatística e pode estar velho. Serve para ordem de grandeza, não para conferência.",
    tags: ["exploração", "oracle", "diagnóstico"],
    nivel: "intermediário",
  },
  {
    id: "ora-sessoes",
    linguagem: "oracle",
    titulo: "Quem está travando o banco",
    quando: "Tudo lento e alguém precisa saber quem é o dono da consulta.",
    codigo: `SELECT s.sid, s.username, s.status, s.machine, s.program,
       q.sql_text, s.last_call_et AS segundos
FROM v$session s
LEFT JOIN v$sql q ON q.sql_id = s.sql_id
WHERE s.type = 'USER' AND s.status = 'ACTIVE'
ORDER BY s.last_call_et DESC;`,
    explicacao: "Mostra a consulta que cada sessão está rodando e há quanto tempo.",
    armadilha: "Essa visão costuma exigir permissão que o usuário de BI não tem. Peça ao DBA em vez de insistir.",
    tags: ["diagnóstico", "oracle"],
    nivel: "avançado",
  },
  {
    id: "ora-powerbi",
    linguagem: "oracle",
    titulo: "Oracle no Power BI sem sofrimento",
    quando: "Montar a consulta que vai virar fonte do relatório.",
    codigo: `/* 1. Traga só o período e as colunas usadas.
   2. Deixe o Oracle agregar o que der.
   3. Converta data para DATE limpo com TRUNC.
   4. Evite LISTAGG e CLOB: o conector engasga. */
SELECT TRUNC(d.d1_emissao) AS emissao,
       d.d1_cod            AS produto,
       SUM(d.d1_total)     AS total
FROM sd1010 d
WHERE d.d_e_l_e_t_ = ' '
  AND d.d1_emissao >= TO_DATE('01/01/2026', 'DD/MM/YYYY')
GROUP BY TRUNC(d.d1_emissao), d.d1_cod;`,
    explicacao: "Quem agrega é o banco. O Power BI recebe o resultado pronto e atualiza rápido.",
    armadilha: "Importar a tabela inteira e filtrar no Power Query traz milhões de linhas pela rede e estoura a atualização agendada.",
    tags: ["desempenho", "oracle", "power bi"],
    nivel: "intermediário",
  },
];
