import type { Base } from "./gerador";

/* As famílias de desafio.

   Cada uma carrega três coisas: o enunciado, a consulta de referência e as
   consultas erradas que a gente sabe que o aluno vai escrever. A de referência
   roda na base gerada e vira o gabarito, sem ninguém digitar resposta. As
   erradas rodam também: quando o resultado do aluno bate com uma delas, a
   Arena não diz "errado", diz exatamente em qual buraco ele caiu.

   O enunciado nunca cita função de SQL. Quem traduz a pergunta de negócio para
   a linguagem é o aluno, que é justamente o que a entrevista cobra. */

export type Armadilha = { sql: string; diagnostico: string };

export type Desafio = {
  id: string;
  titulo: string;
  nivel: "iniciante" | "intermediário" | "avançado";
  assunto: string;
  enunciado: string;
  /** Verdadeiro quando a ordem das linhas faz parte da resposta. */
  ordenado: boolean;
  dica: string;
  referencia: string;
  armadilhas: Armadilha[];
};

export type Familia = { id: string; nivel: Desafio["nivel"]; assunto: string; montar: (base: Base) => Desafio };

export const FAMILIAS: Familia[] = [
  {
    id: "agregacao",
    nivel: "iniciante",
    assunto: "Agregação e filtro",
    montar: (b) => ({
      id: "agregacao",
      titulo: "Receita por categoria",
      nivel: "iniciante",
      assunto: "Agregação e filtro",
      enunciado: `A diretoria quer saber quanto cada categoria de produto faturou em ${b.ano}. Só conta venda que foi paga: pedido cancelado ou devolvido fica de fora. A receita de um item é a quantidade vezes o valor unitário.\n\nTraga duas colunas: a categoria e a receita, da maior para a menor.`,
      ordenado: true,
      dica: "A receita está em itens, a data e o status estão em pedidos, e a categoria está em produtos. São três tabelas na mesma consulta.",
      referencia: `SELECT pr.categoria, ROUND(SUM(i.quantidade * i.valor_unitario), 2) AS receita
FROM itens i
JOIN pedidos p ON p.id = i.pedido_id
JOIN produtos pr ON pr.id = i.produto_id
WHERE p.status = 'pago' AND strftime('%Y', p.data) = '${b.ano}'
GROUP BY pr.categoria
ORDER BY receita DESC`,
      armadilhas: [
        {
          sql: `SELECT pr.categoria, ROUND(SUM(i.quantidade * i.valor_unitario), 2) AS receita
FROM itens i JOIN pedidos p ON p.id = i.pedido_id JOIN produtos pr ON pr.id = i.produto_id
WHERE strftime('%Y', p.data) = '${b.ano}'
GROUP BY pr.categoria ORDER BY receita DESC`,
          diagnostico: `O seu número bate com o total de ${b.ano} incluindo os pedidos cancelados e devolvidos. Falta o filtro de status igual a "pago". Esse é o erro que mais aparece em relatório de venda: o total fecha mais alto que o do financeiro e ninguém entende por quê.`,
        },
        {
          sql: `SELECT pr.categoria, ROUND(SUM(i.quantidade * i.valor_unitario), 2) AS receita
FROM itens i JOIN pedidos p ON p.id = i.pedido_id JOIN produtos pr ON pr.id = i.produto_id
WHERE p.status = 'pago'
GROUP BY pr.categoria ORDER BY receita DESC`,
          diagnostico: `O seu resultado soma os dois anos da base. A base tem ${b.anoAnterior} e ${b.ano}, e a pergunta é só sobre ${b.ano}. Filtre o ano da data do pedido.`,
        },
      ],
    }),
  },

  {
    id: "joins",
    nivel: "iniciante",
    assunto: "Junções",
    montar: () => ({
      id: "joins",
      titulo: "Todo cliente, comprando ou não",
      nivel: "iniciante",
      assunto: "Junções",
      enunciado: `O time comercial quer a lista completa de clientes com quantos pedidos cada um já fez, para ligar para quem nunca comprou.\n\nTraga o nome do cliente e a quantidade de pedidos. Quem nunca comprou precisa aparecer, com zero. Ordene pela quantidade, da maior para a menor, e depois pelo nome.`,
      ordenado: true,
      dica: "Se um cliente sem pedido some da sua lista, a junção está cortando ele. E cuidado com o que você conta: contar linha não é a mesma coisa que contar pedido.",
      referencia: `SELECT c.nome, COUNT(p.id) AS pedidos
FROM clientes c
LEFT JOIN pedidos p ON p.cliente_id = c.id
GROUP BY c.id, c.nome
ORDER BY pedidos DESC, c.nome`,
      armadilhas: [
        {
          sql: `SELECT c.nome, COUNT(p.id) AS pedidos
FROM clientes c JOIN pedidos p ON p.cliente_id = c.id
GROUP BY c.id, c.nome ORDER BY pedidos DESC, c.nome`,
          diagnostico: `A sua lista veio menor que a esperada: os clientes que nunca compraram sumiram. Com JOIN comum, só sobrevive quem tem correspondência dos dois lados. Para manter todo mundo da esquerda, o caminho é LEFT JOIN.`,
        },
        {
          sql: `SELECT c.nome, COUNT(*) AS pedidos
FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id
GROUP BY c.id, c.nome ORDER BY pedidos DESC, c.nome`,
          diagnostico: `Os clientes sem pedido apareceram com 1 em vez de 0. COUNT(*) conta linhas, e o LEFT JOIN devolve uma linha com o lado direito vazio. Conte uma coluna do lado direito, como COUNT(p.id), que ignora o nulo.`,
        },
      ],
    }),
  },

  {
    id: "nulos",
    nivel: "intermediário",
    assunto: "Nulos",
    montar: (b) => ({
      id: "nulos",
      titulo: "Valor líquido do pedido",
      nivel: "intermediário",
      assunto: "Nulos",
      enunciado: `O financeiro quer o valor líquido de cada pedido pago de ${b.ano}: a soma dos itens menos o desconto do pedido. Atenção, porque nem todo pedido tem desconto preenchido.\n\nTraga o id do pedido e o valor líquido, dos dez maiores para baixo. Só as dez primeiras linhas.`,
      ordenado: true,
      dica: "Some os itens primeiro e só depois desconte. E veja o que acontece quando você subtrai um valor que está vazio.",
      referencia: `SELECT p.id, ROUND(SUM(i.quantidade * i.valor_unitario) - COALESCE(p.desconto, 0), 2) AS liquido
FROM pedidos p
JOIN itens i ON i.pedido_id = p.id
WHERE p.status = 'pago' AND strftime('%Y', p.data) = '${b.ano}'
GROUP BY p.id, p.desconto
ORDER BY liquido DESC
LIMIT 10`,
      armadilhas: [
        {
          sql: `SELECT p.id, ROUND(SUM(i.quantidade * i.valor_unitario) - p.desconto, 2) AS liquido
FROM pedidos p JOIN itens i ON i.pedido_id = p.id
WHERE p.status = 'pago' AND strftime('%Y', p.data) = '${b.ano}'
GROUP BY p.id, p.desconto ORDER BY liquido DESC LIMIT 10`,
          diagnostico: `Você subtraiu o desconto direto. Quando o desconto está vazio, a conta inteira vira vazio, e os pedidos sem desconto somem do topo da sua lista. Troque o nulo por zero antes de subtrair, com COALESCE.`,
        },
        {
          sql: `SELECT p.id, ROUND(SUM(i.quantidade * i.valor_unitario) - COALESCE(p.desconto, 0), 2) AS liquido
FROM pedidos p JOIN itens i ON i.pedido_id = p.id
WHERE strftime('%Y', p.data) = '${b.ano}'
GROUP BY p.id, p.desconto ORDER BY liquido DESC LIMIT 10`,
          diagnostico: `O tratamento do nulo está certo, mas entraram pedidos cancelados ou devolvidos. A pergunta é sobre pedido pago.`,
        },
      ],
    }),
  },

  {
    id: "tempo",
    nivel: "intermediário",
    assunto: "Janela de tempo",
    montar: (b) => ({
      id: "tempo",
      titulo: "Receita mês a mês",
      nivel: "intermediário",
      assunto: "Janela de tempo",
      enunciado: `Monte a série de receita mês a mês dos pedidos pagos, dos dois anos da base. O eixo precisa ordenar sozinho num gráfico, então o mês tem que vir no formato AAAA-MM.\n\nTraga o mês e a receita, do mês mais antigo para o mais novo.`,
      ordenado: true,
      dica: "Se você agrupar só pelo número do mês, janeiro de um ano cai em cima de janeiro do outro.",
      referencia: `SELECT strftime('%Y-%m', p.data) AS mes, ROUND(SUM(i.quantidade * i.valor_unitario), 2) AS receita
FROM pedidos p
JOIN itens i ON i.pedido_id = p.id
WHERE p.status = 'pago'
GROUP BY mes
ORDER BY mes`,
      armadilhas: [
        {
          sql: `SELECT strftime('%m', p.data) AS mes, ROUND(SUM(i.quantidade * i.valor_unitario), 2) AS receita
FROM pedidos p JOIN itens i ON i.pedido_id = p.id
WHERE p.status = 'pago' GROUP BY mes ORDER BY mes`,
          diagnostico: `Vieram doze linhas em vez de vinte e quatro: você agrupou só pelo número do mês, então ${b.anoAnterior} e ${b.ano} foram somados juntos. Inclua o ano na chave do agrupamento.`,
        },
      ],
    }),
  },

  {
    id: "subconsulta",
    nivel: "avançado",
    assunto: "Subconsulta",
    montar: (b) => ({
      id: "subconsulta",
      titulo: "Quem compra acima da média",
      nivel: "avançado",
      assunto: "Subconsulta",
      enunciado: `O marketing quer falar com quem gasta mais que a média. Considerando só pedidos pagos de ${b.ano}, calcule quanto cada cliente gastou e devolva apenas os que ficaram acima da média de gasto por cliente.\n\nTraga o nome e o total gasto, do maior para o menor.`,
      ordenado: true,
      dica: "A média que interessa é a média dos totais por cliente, não a média dos itens nem a dos pedidos. Calcule os totais primeiro e tire a média deles.",
      referencia: `WITH gasto AS (
  SELECT c.id, c.nome, SUM(i.quantidade * i.valor_unitario) AS total
  FROM clientes c
  JOIN pedidos p ON p.cliente_id = c.id
  JOIN itens i ON i.pedido_id = p.id
  WHERE p.status = 'pago' AND strftime('%Y', p.data) = '${b.ano}'
  GROUP BY c.id, c.nome
)
SELECT nome, ROUND(total, 2) AS total
FROM gasto
WHERE total > (SELECT AVG(total) FROM gasto)
ORDER BY total DESC`,
      armadilhas: [
        {
          sql: `SELECT c.nome, ROUND(SUM(i.quantidade * i.valor_unitario), 2) AS total
FROM clientes c JOIN pedidos p ON p.cliente_id = c.id JOIN itens i ON i.pedido_id = p.id
WHERE p.status = 'pago' AND strftime('%Y', p.data) = '${b.ano}'
GROUP BY c.id, c.nome
HAVING SUM(i.quantidade * i.valor_unitario) > (
  SELECT AVG(i2.quantidade * i2.valor_unitario) FROM itens i2
  JOIN pedidos p2 ON p2.id = i2.pedido_id
  WHERE p2.status = 'pago' AND strftime('%Y', p2.data) = '${b.ano}'
)
ORDER BY total DESC`,
          diagnostico: `Você comparou o total de cada cliente com a média do valor de um item. Como um item vale muito menos que o gasto de um cliente inteiro, quase todo mundo passou no corte. A média precisa ser calculada sobre os totais por cliente.`,
        },
      ],
    }),
  },

  {
    id: "janela",
    nivel: "avançado",
    assunto: "Função de janela",
    montar: (b) => ({
      id: "janela",
      titulo: "Top 3 de cada categoria",
      nivel: "avançado",
      assunto: "Função de janela",
      enunciado: `Para a reunião de compras, monte o ranking dos três produtos que mais faturaram dentro de cada categoria, em ${b.ano}, considerando só pedidos pagos.\n\nTraga a categoria, o nome do produto, a receita e a posição dele dentro da categoria. Ordene por categoria e por posição.`,
      ordenado: true,
      dica: "Cortar com LIMIT devolve os três melhores do geral, não os três de cada categoria. Você precisa numerar dentro de cada grupo.",
      referencia: `WITH receita AS (
  SELECT pr.categoria, pr.nome, SUM(i.quantidade * i.valor_unitario) AS total
  FROM itens i
  JOIN pedidos p ON p.id = i.pedido_id
  JOIN produtos pr ON pr.id = i.produto_id
  WHERE p.status = 'pago' AND strftime('%Y', p.data) = '${b.ano}'
  GROUP BY pr.categoria, pr.nome
),
ranqueado AS (
  SELECT categoria, nome, total, ROW_NUMBER() OVER (PARTITION BY categoria ORDER BY total DESC) AS posicao
  FROM receita
)
SELECT categoria, nome, ROUND(total, 2) AS receita, posicao
FROM ranqueado
WHERE posicao <= 3
ORDER BY categoria, posicao`,
      armadilhas: [
        {
          sql: `SELECT pr.categoria, pr.nome, ROUND(SUM(i.quantidade * i.valor_unitario), 2) AS receita, 1 AS posicao
FROM itens i JOIN pedidos p ON p.id = i.pedido_id JOIN produtos pr ON pr.id = i.produto_id
WHERE p.status = 'pago' AND strftime('%Y', p.data) = '${b.ano}'
GROUP BY pr.categoria, pr.nome
ORDER BY receita DESC LIMIT 3`,
          diagnostico: `Vieram três linhas no total, e não três por categoria. LIMIT corta a lista inteira. Para numerar dentro de cada categoria, use uma função de janela com PARTITION BY.`,
        },
      ],
    }),
  },
];

export const montarDesafio = (familia: string, base: Base): Desafio => {
  const f = FAMILIAS.find((x) => x.id === familia) ?? FAMILIAS[0];
  return f.montar(base);
};
