import { pipeline, type Config, type Table } from './engine';

// Rastreia um pedido pelas etapas do fluxo.
//
// Não alteramos o pipeline: marcamos as linhas de origem com uma coluna oculta
// antes de chamá-lo e depois contamos onde essa marca aparece. O motor recebe
// uma tabela comum e devolve o mesmo resultado de sempre.
const MARK = '__origem';

export type TraceStep = {
  stage: string;
  status: 'ok' | 'removed' | 'multiplied' | 'info';
  count: number;
  note: string;
};

export function traceOrder(orders: Table, customers: Table, config: Config, rowIndex: number): TraceStep[] {
  const row = orders.rows[rowIndex];
  if (!row) throw new Error('Linha não encontrada.');
  if (orders.columns.includes(MARK)) throw new Error('Renomeie a coluna __origem para rastrear.');

  const tagged: Table = { columns: [...orders.columns, MARK], rows: orders.rows.map((r, i) => [...r, i]) };
  const stages = pipeline(tagged, customers, config);
  const count = (t: Table) => {
    const i = t.columns.indexOf(MARK);
    return i < 0 ? 0 : t.rows.filter((r) => r[i] === rowIndex).length;
  };

  const steps: TraceStep[] = [{ stage: 'Fontes', status: 'ok', count: 1, note: `Linha ${rowIndex + 1} da tabela de pedidos.` }];

  // Limpeza age nos clientes. Mostramos quantos clientes casam com a chave
  // deste pedido, que é a causa da multiplicação lá na frente.
  const leftIndex = orders.columns.indexOf(config.leftKey);
  const rightIndex = customers.columns.indexOf(config.rightKey);
  const chave = leftIndex >= 0 ? row[leftIndex] : null;
  const antes = rightIndex >= 0 && chave !== null ? customers.rows.filter((r) => r[rightIndex] === chave).length : 0;
  const depois = rightIndex >= 0 && chave !== null ? stages[1].table.rows.filter((r) => r[rightIndex] === chave).length : 0;
  steps.push({
    stage: 'Limpeza', status: 'info', count: depois,
    note: config.dedup
      ? `A chave ${config.leftKey} = ${String(chave)} tinha ${antes} cliente(s) e ficou com ${depois} após a limpeza.`
      : `A chave ${config.leftKey} = ${String(chave)} casa com ${antes} cliente(s). Sem limpeza, repetições multiplicam este pedido.`,
  });

  const aposFiltro = count(stages[2].table);
  steps.push({
    stage: 'Filtro', status: aposFiltro ? 'ok' : 'removed', count: aposFiltro,
    note: !config.filter
      ? 'Filtro desativado: o pedido seguiu.'
      : aposFiltro
      ? `Passou no filtro ${config.filterKey} = ${config.filterValue}.`
      : `Removido: ${config.filterKey} deste pedido não é ${config.filterValue}.`,
  });

  const aposJuncao = count(stages[3].table);
  steps.push({
    stage: 'Junção',
    status: aposJuncao > 1 ? 'multiplied' : aposJuncao ? 'ok' : 'removed',
    count: aposJuncao,
    note: !config.join
      ? 'Junção desativada: o pedido seguiu sozinho.'
      : !aposFiltro
      ? 'O pedido já havia sido removido no filtro.'
      : aposJuncao > 1
      ? `Virou ${aposJuncao} linhas. A chave casou com ${aposJuncao} clientes, então o valor deste pedido é contado ${aposJuncao} vezes.`
      : aposJuncao === 1
      ? 'Seguiu como uma linha única.'
      : 'Sumiu na junção.',
  });

  steps.push({
    stage: 'SQL', status: 'info', count: 0,
    note: 'O SQL agrega os registros, então uma linha individual deixa de existir aqui. Se a junção multiplicou, a soma vem inflada.',
  });

  return steps;
}
