import type { Item } from "./tipos";

/* Protheus (TOTVS): o mapa que ninguém entrega junto com o acesso ao banco.

   Extrair dado do Protheus é fácil depois que se sabem três coisas: o nome da
   tabela vem do dicionário, todo registro apagado continua lá, e quase todo
   filtro precisa da filial. Quem não sabe isso soma nota cancelada, mistura
   empresa e entrega relatório errado com toda a confiança do mundo.

   Os nomes de tabela aqui usam o sufixo 010 (SD1010), que é o padrão de
   empresa 01. No seu ambiente pode ser outro: confira no SX2. */

export const PROTHEUS: Item[] = [
  // ------------------------------------------------------- o que salva a vida
  {
    id: "pro-deletado",
    linguagem: "protheus",
    titulo: "Ignorar registro apagado",
    quando: "Sempre. É a primeira linha do WHERE de qualquer consulta no Protheus.",
    codigo: `SELECT *
FROM SD2010 d
WHERE d.D_E_L_E_T_ = ' ';   -- também aparece como <> '*'`,
    explicacao: "O Protheus não apaga registro: marca a coluna D_E_L_E_T_ com asterisco. Sem esse filtro, o cancelado volta para o relatório.",
    armadilha: "É a causa número um de relatório que fecha maior que o ERP. A tela do sistema esconde o apagado; a consulta no banco, não.",
    tags: ["protheus", "obrigatório", "qualidade"],
    nivel: "básico",
  },
  {
    id: "pro-filial",
    linguagem: "protheus",
    titulo: "Filtrar por filial",
    quando: "Toda consulta em ambiente com mais de uma filial.",
    codigo: `SELECT *
FROM SC5010 c
WHERE c.D_E_L_E_T_ = ' '
  AND c.C5_FILIAL = '01';`,
    explicacao: "Quase toda tabela começa com a coluna de filial, com o prefixo da tabela (C5_FILIAL, D1_FILIAL, E1_FILIAL).",
    armadilha: "Tabela compartilhada tem filial em branco, e tabela exclusiva tem o código. Filtrar errado zera o resultado ou soma empresas diferentes. O modo de compartilhamento está no SX2, campo X2_MODO.",
    tags: ["protheus", "obrigatório"],
    nivel: "básico",
  },
  {
    id: "pro-dicionario-sx2",
    linguagem: "protheus",
    titulo: "Descobrir o nome da tabela",
    quando: "Você sabe o nome na tela, mas não sabe onde o dado mora.",
    codigo: `SELECT X2_CHAVE  AS tabela,
       X2_NOME   AS descricao,
       X2_ARQUIVO AS nome_fisico,
       X2_MODO    AS modo   -- C = compartilhado, E = exclusivo por filial
FROM SX2010
WHERE X2_NOME LIKE '%Pedido%';`,
    explicacao: "O SX2 é o índice de todas as tabelas do Protheus: nome lógico, nome físico e modo de compartilhamento.",
    armadilha: "Procurar tabela por tentativa e erro custa horas. O SX2 responde em um SELECT, inclusive para tabela customizada.",
    tags: ["protheus", "dicionário", "exploração"],
    nivel: "básico",
  },
  {
    id: "pro-dicionario-sx3",
    linguagem: "protheus",
    titulo: "Descobrir o nome do campo",
    quando: "Achou a tabela e agora precisa saber o que é cada coluna.",
    codigo: `SELECT X3_CAMPO AS campo,
       X3_TITULO AS titulo,
       X3_DESCRIC AS descricao,
       X3_TIPO, X3_TAMANHO, X3_DECIMAL
FROM SX3010
WHERE X3_ARQUIVO = 'SD1' AND D_E_L_E_T_ = ' '
ORDER BY X3_ORDEM;`,
    explicacao: "O SX3 traz o título que aparece na tela para cada coluna. É o de-para entre o que o usuário fala e o que existe no banco.",
    armadilha: "Campo customizado do cliente tem prefixo próprio e não está em documentação nenhuma. Só o SX3 conta essa história.",
    tags: ["protheus", "dicionário", "exploração"],
    nivel: "básico",
  },
  {
    id: "pro-datas",
    linguagem: "protheus",
    titulo: "Data no Protheus é texto",
    quando: "Filtrar período em qualquer tabela.",
    codigo: `-- Oracle / SQL Server: a coluna é CHAR(8) no formato AAAAMMDD
SELECT *
FROM SD2010
WHERE D_E_L_E_T_ = ' '
  AND D2_EMISSAO BETWEEN '20260301' AND '20260331';

-- virando data de verdade
SELECT TO_DATE(D2_EMISSAO, 'YYYYMMDD') AS emissao FROM SD2010;   -- Oracle
SELECT CONVERT(date, D2_EMISSAO, 112)  AS emissao FROM SD2010;   -- SQL Server`,
    explicacao: "A data é armazenada como texto AAAAMMDD, então a comparação de texto já funciona como ordem cronológica.",
    armadilha: "Data vazia vem como oito espaços, não como nulo. Converter direto quebra a consulta: teste o branco antes.",
    tags: ["protheus", "tempo", "obrigatório"],
    nivel: "básico",
  },

  // ---------------------------------------------------------- os módulos
  {
    id: "pro-faturamento",
    linguagem: "protheus",
    titulo: "Faturamento: nota e item",
    quando: "Receita por produto, cliente ou período.",
    codigo: `SELECT d.D2_FILIAL, d.D2_DOC, d.D2_SERIE, d.D2_EMISSAO,
       d.D2_CLIENTE, d.D2_LOJA, d.D2_COD, d.D2_QUANT, d.D2_TOTAL,
       f.F2_VALFAT
FROM SD2010 d
JOIN SF2010 f ON f.F2_FILIAL = d.D2_FILIAL AND f.F2_DOC = d.D2_DOC
             AND f.F2_SERIE = d.D2_SERIE AND f.F2_CLIENTE = d.D2_CLIENTE
             AND f.F2_LOJA = d.D2_LOJA AND f.D_E_L_E_T_ = ' '
WHERE d.D_E_L_E_T_ = ' '
  AND d.D2_EMISSAO >= '20260101';`,
    explicacao: "SF2 é a nota de saída e SD2 são os itens dela. A junção é pela chave inteira: filial, documento, série, cliente e loja.",
    armadilha: "Somar F2_VALFAT junto com os itens multiplica o total da nota pelo número de itens. Some um dos dois, nunca os dois na mesma consulta.",
    tags: ["protheus", "faturamento", "conciliação"],
    nivel: "intermediário",
  },
  {
    id: "pro-pedidos",
    linguagem: "protheus",
    titulo: "Pedido de venda e saldo a entregar",
    quando: "Carteira de pedidos, backlog, o que falta faturar.",
    codigo: `SELECT c.C6_FILIAL, c.C6_NUM, c.C6_CLI, c.C6_PRODUTO,
       c.C6_QTDVEN, c.C6_QTDENT,
       (c.C6_QTDVEN - c.C6_QTDENT) AS saldo,
       c.C6_PRCVEN, c.C6_VALOR
FROM SC6010 c
WHERE c.D_E_L_E_T_ = ' '
  AND c.C6_BLQ <> 'R'              -- item bloqueado/residual
  AND c.C6_QTDVEN > c.C6_QTDENT;`,
    explicacao: "SC5 é a capa do pedido e SC6 são os itens. O saldo é a quantidade vendida menos a entregue.",
    armadilha: "Item com C6_BLQ igual a R foi eliminado do resíduo e não vai ser entregue, mas continua na tabela. Sem esse filtro, a carteira fica inflada.",
    tags: ["protheus", "vendas"],
    nivel: "intermediário",
  },
  {
    id: "pro-financeiro",
    linguagem: "protheus",
    titulo: "Contas a receber em aberto",
    quando: "Inadimplência, aging, previsão de caixa.",
    codigo: `SELECT e.E1_FILIAL, e.E1_PREFIXO, e.E1_NUM, e.E1_PARCELA, e.E1_TIPO,
       e.E1_CLIENTE, e.E1_LOJA, e.E1_EMISSAO, e.E1_VENCREA,
       e.E1_VALOR, e.E1_SALDO
FROM SE1010 e
WHERE e.D_E_L_E_T_ = ' '
  AND e.E1_SALDO > 0
  AND e.E1_TIPO NOT IN ('NCC', 'RA');   -- crédito e adiantamento não são título a receber`,
    explicacao: "SE1 é o contas a receber e SE2 o a pagar. O saldo maior que zero é o que está em aberto de verdade.",
    armadilha: "Usar E1_VENCTO em vez de E1_VENCREA erra o aging, porque a data real é a que considera feriado e prorrogação.",
    tags: ["protheus", "financeiro", "conciliação"],
    nivel: "intermediário",
  },
  {
    id: "pro-estoque",
    linguagem: "protheus",
    titulo: "Saldo em estoque por produto",
    quando: "Posição de estoque, cobertura, ruptura.",
    codigo: `SELECT b.B2_FILIAL, b.B2_COD, b.B2_LOCAL,
       b.B2_QATU   AS quantidade,
       b.B2_VATU1  AS valor,
       p.B1_DESC, p.B1_UM
FROM SB2010 b
JOIN SB1010 p ON p.B1_COD = b.B2_COD AND p.D_E_L_E_T_ = ' '
WHERE b.D_E_L_E_T_ = ' '
  AND b.B2_QATU <> 0;`,
    explicacao: "SB1 é o cadastro do produto e SB2 o saldo por armazém. SD3 guarda a movimentação, se precisar do histórico.",
    armadilha: "SB2 é a foto de agora, não tem data. Saldo de um dia passado só reconstituindo pelo SD3, movimento a movimento.",
    tags: ["protheus", "estoque", "cadastro"],
    nivel: "intermediário",
  },
  {
    id: "pro-compras",
    linguagem: "protheus",
    titulo: "Compras: pedido e entrada",
    quando: "Gasto por fornecedor, prazo de entrega, nota de entrada.",
    codigo: `SELECT c.C7_FILIAL, c.C7_NUM, c.C7_FORNECE, c.C7_LOJA, c.C7_PRODUTO,
       c.C7_QUANT, c.C7_PRECO, c.C7_TOTAL, c.C7_DATPRF AS previsao,
       d.D1_DOC AS nota_entrada, d.D1_DTDIGIT AS entrada
FROM SC7010 c
LEFT JOIN SD1010 d ON d.D1_FILIAL = c.C7_FILIAL AND d.D1_PEDIDO = c.C7_NUM
                  AND d.D1_ITEMPC = c.C7_ITEM AND d.D_E_L_E_T_ = ' '
WHERE c.D_E_L_E_T_ = ' ';`,
    explicacao: "SC7 é o pedido de compra e SD1 são os itens das notas de entrada, ligados pelo número do pedido e pelo item.",
    armadilha: "Um item de pedido pode ter várias entradas parciais. Sem agrupar, a linha do pedido se repete e o total de compras dobra.",
    tags: ["protheus", "compras", "junção", "estoque"],
    nivel: "avançado",
  },
  {
    id: "pro-cliente",
    linguagem: "protheus",
    titulo: "Cliente e fornecedor",
    quando: "Trazer nome, CNPJ, cidade e estado para o relatório.",
    codigo: `SELECT a.A1_COD, a.A1_LOJA, a.A1_NOME, a.A1_NREDUZ,
       a.A1_CGC, a.A1_MUN, a.A1_EST, a.A1_VEND
FROM SA1010 a
WHERE a.D_E_L_E_T_ = ' ';
-- SA2 = fornecedores, SA3 = vendedores, SB1 = produtos`,
    explicacao: "SA1 é cliente e a chave dele é sempre código mais loja, nunca só o código.",
    armadilha: "Juntar só por A1_COD duplica o cliente que tem mais de uma loja. A chave completa é código e loja.",
    tags: ["protheus", "cadastro", "junção"],
    nivel: "básico",
  },
  {
    id: "pro-cc",
    linguagem: "protheus",
    titulo: "Centro de custo e contabilidade",
    quando: "Relatório gerencial por área ou conta contábil.",
    codigo: `SELECT t.CTT_CUSTO, t.CTT_DESC01
FROM CTT010 t WHERE t.D_E_L_E_T_ = ' ';

SELECT l.CT2_FILIAL, l.CT2_DATA, l.CT2_DEBITO, l.CT2_CREDIT,
       l.CT2_VALOR, l.CT2_CCD, l.CT2_CCC, l.CT2_HIST
FROM CT2010 l
WHERE l.D_E_L_E_T_ = ' '
  AND l.CT2_DATA BETWEEN '20260101' AND '20261231';`,
    explicacao: "CTT é o cadastro de centro de custo, CT1 o plano de contas e CT2 os lançamentos contábeis.",
    armadilha: "CT2 tem lançamento de partida dobrada: somar a coluna de valor sem separar débito e crédito dá o dobro do movimento.",
    tags: ["protheus", "contabilidade", "financeiro"],
    nivel: "avançado",
  },

  // ------------------------------------------------------------ na prática
  {
    id: "pro-indice",
    linguagem: "protheus",
    titulo: "Consulta grande sem derrubar o ERP",
    quando: "Extração para BI em banco de produção.",
    codigo: `/* 1. Filtre sempre por FILIAL + a coluna de data, nessa ordem: é o índice que existe.
   2. Traga só as colunas do relatório, nunca SELECT *.
   3. Agrupe no banco, não no Power Query.
   4. Rode fora do horário de pico e combine a janela com o time do ERP. */
SELECT D2_FILIAL, D2_EMISSAO, D2_COD, SUM(D2_TOTAL) AS total
FROM SD2010
WHERE D_E_L_E_T_ = ' '
  AND D2_FILIAL = '01'
  AND D2_EMISSAO BETWEEN '20260101' AND '20261231'
GROUP BY D2_FILIAL, D2_EMISSAO, D2_COD;`,
    explicacao: "Os índices do Protheus quase sempre começam pela filial. Respeitar essa ordem é o que separa três segundos de três minutos.",
    armadilha: "Consulta pesada em produção trava a tela do usuário do ERP. Se existir base de réplica, extraia de lá.",
    tags: ["protheus", "desempenho", "obrigatório"],
    nivel: "avançado",
  },
  {
    id: "pro-recno",
    linguagem: "protheus",
    titulo: "R_E_C_N_O_ e o registro repetido",
    quando: "Conferir duplicata ou ligar uma tabela à outra com segurança.",
    codigo: `SELECT D2_DOC, D2_SERIE, D2_ITEM, COUNT(*) AS vezes
FROM SD2010
WHERE D_E_L_E_T_ = ' '
GROUP BY D2_DOC, D2_SERIE, D2_ITEM
HAVING COUNT(*) > 1;`,
    explicacao: "R_E_C_N_O_ é o número físico da linha, único por tabela. Serve para identificar a linha exata quando a chave de negócio se repete.",
    armadilha: "Guardar R_E_C_N_O_ como chave no BI é furada: ele muda em reindexação e em restore. Use a chave de negócio.",
    tags: ["protheus", "qualidade"],
    nivel: "intermediário",
  },
  {
    id: "pro-numero",
    linguagem: "protheus",
    titulo: "Código com zero à esquerda",
    quando: "Juntar Protheus com planilha ou com outro sistema.",
    codigo: `-- Protheus guarda como texto: '000123'
SELECT LPAD('123', 6, '0') FROM dual;                      -- Oracle
SELECT RIGHT('000000' + '123', 6);                          -- SQL Server`,
    explicacao: "Código de produto, cliente e pedido é texto de tamanho fixo, com zeros na frente.",
    armadilha: "A planilha do usuário perde o zero à esquerda e a junção não casa. Padronize os dois lados antes de comparar.",
    tags: ["protheus", "qualidade", "junção", "sintaxe"],
    nivel: "básico",
  },
  {
    id: "pro-status",
    linguagem: "protheus",
    titulo: "Nota cancelada e devolvida",
    quando: "Receita líquida de verdade.",
    codigo: `SELECT SUM(CASE WHEN f.F2_TIPO = 'N' THEN d.D2_TOTAL ELSE 0 END)  AS vendas,
       SUM(CASE WHEN f.F2_TIPO = 'D' THEN d.D2_TOTAL ELSE 0 END)  AS devolucoes
FROM SD2010 d
JOIN SF2010 f ON f.F2_FILIAL = d.D2_FILIAL AND f.F2_DOC = d.D2_DOC
             AND f.F2_SERIE = d.D2_SERIE AND f.D_E_L_E_T_ = ' '
WHERE d.D_E_L_E_T_ = ' ';`,
    explicacao: "O tipo da nota separa venda de devolução, e a nota cancelada sai pelo D_E_L_E_T_ ou pelo campo de cancelamento.",
    armadilha: "Relatório que soma tudo sem olhar o tipo entrega receita maior que a do ERP, e a diferença é exatamente a devolução.",
    tags: ["protheus", "faturamento", "conciliação"],
    nivel: "avançado",
  },
  {
    id: "pro-powerbi",
    linguagem: "protheus",
    titulo: "Modelo no Power BI a partir do Protheus",
    quando: "Montar o modelo depois de extrair.",
    codigo: `/* Fato:      SD2 (faturamento), SE1 (receber), SC6 (carteira)
   Dimensão:  SA1 (cliente), SB1 (produto), SA3 (vendedor), CTT (centro de custo)
   Calendário: gerado no Power BI, nunca a data do Protheus

   Chaves: sempre concatene FILIAL + código, porque o mesmo código
   existe em filiais diferentes com significados diferentes. */
SELECT D2_FILIAL || D2_CLIENTE || D2_LOJA AS chave_cliente
FROM SD2010;`,
    explicacao: "A modelagem estrela funciona normalmente, desde que a chave carregue a filial.",
    armadilha: "Relacionar só pelo código do cliente junta filiais diferentes e espalha venda no cliente errado.",
    tags: ["protheus", "modelagem", "power bi"],
    nivel: "avançado",
  },
];
