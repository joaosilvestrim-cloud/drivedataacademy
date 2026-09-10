export type Cell = string | number | null;
export type Table = { columns: string[]; rows: Cell[][] };
export type Stage = { title: string; table: Table; note: string };
export type Config = { dedup: boolean; dedupKey: string; filter: boolean; filterKey: string; filterValue: string; join: boolean; leftKey: string; rightKey: string };
export const MAX_ROWS = 5000;
export const DEFAULT_SQL = 'SELECT regiao, COUNT(*) AS pedidos,\n       ROUND(SUM(valor), 2) AS faturamento\nFROM fluxo\nGROUP BY regiao\nORDER BY faturamento DESC';
export const DEFAULT_CONFIG: Config = { dedup: false, dedupKey: 'cliente_id', filter: false, filterKey: 'status', filterValue: 'aprovado', join: true, leftKey: 'cliente_id', rightKey: 'cliente_id' };

export function sample() : {orders: Table; customers: Table} {
  return {
    orders: { columns: ['pedido_id', 'cliente_id', 'valor', 'status'], rows: Array.from({length: 24}, (_, i) => [i + 1, (i % 6) + 1, 120 + (i % 5) * 80, i % 7 === 0 ? 'cancelado' : 'aprovado']) },
    customers: {columns: ['cliente_id', 'nome', 'regiao'], rows: [[1,'Ana','Sudeste'],[2,'Bruno','Sul'],[3,'Carla','Nordeste'],[3,'Carla','Nordeste'],[4,'Daniel','Sudeste'],[5,'Elisa','Sul'],[6,'Fábio','Norte']]},
  };
}

// RFC-style quoted fields, escaped quotes and CRLF; semicolon files are common in Brazil.
export function parseCSV(input: string): Table {
  if (new TextEncoder().encode(input).length > 1024 * 1024) throw new Error('Use um CSV de até 1 MB.');
  const text = input.replace(/^\uFEFF/, '');
  let quoted = false, comma = 0, semi = 0;
  for (let i = 0; i < text.length; i++) { const c = text[i]; if (c === '"') { if (quoted && text[i+1] === '"') i++; else quoted = !quoted; } if (!quoted) { if (c === '\n' || c === '\r') break; if (c === ',') comma++; if (c === ';') semi++; } }
  const delimiter = semi > comma ? ';' : ',';
  const records: string[][] = []; let record: string[] = [], field = '', inQuote = false, closed = false;
  const pushField = () => { record.push(field); field = ''; closed = false; if (record.length > 40) throw new Error('Limite de 40 colunas por CSV.'); };
  const pushRow = () => { pushField(); if (record.some(v => v !== '')) records.push(record); record = []; if (records.length > MAX_ROWS + 1) throw new Error('Limite de 5.000 registros por CSV.'); };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) { if (c === '"') { if (text[i+1] === '"') { field += '"'; i++; } else { inQuote = false; closed = true; } } else field += c; }
    else if (c === delimiter) pushField();
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i+1] === '\n') i++; pushRow(); }
    else if (c === '"' && !field && !closed) inQuote = true;
    else { if (closed || c === '"') throw new Error('CSV inválido: confira as aspas dos campos.'); field += c; }
  }
  if (inQuote) throw new Error('CSV inválido: há um campo com aspas não fechadas.');
  if (field || record.length || closed) pushRow();
  const columns = (records.shift() || []).map(c => c.trim());
  if (!columns.length || columns.some(c => !c || c.length > 80) || new Set(columns.map(c => c.toLowerCase())).size !== columns.length) throw new Error('Informe cabeçalhos únicos e preenchidos, com até 80 caracteres.');
  if (!records.length) throw new Error('O CSV precisa conter pelo menos um registro.');
  const rows: Cell[][] = records.map((r, i) => { if (r.length !== columns.length) throw new Error(`Linha ${i+2}: quantidade de colunas diferente do cabeçalho.`); return r.map(v => v.trim() === '' ? null : v); });
  // Infer whole columns, preserving identifiers with leading zeroes and mixed text.
  columns.forEach((_, index) => { const values = rows.map(r => r[index]).filter(v => v !== null) as string[];
    if (values.length && values.every(v => /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(v) && Number.isFinite(Number(v)) && Math.abs(Number(v)) <= Number.MAX_SAFE_INTEGER)) rows.forEach(r => { if (r[index] !== null) r[index] = Number(r[index]); });
  });
  return {columns, rows};
}

export function quality(t: Table) {
  const seen = new Set<string>(); let duplicates = 0, empty = 0;
  for (const row of t.rows) { const key = JSON.stringify(row); if (seen.has(key)) duplicates++; seen.add(key); empty += row.filter(v => v === null || v === '').length; }
  return {duplicates, empty};
}
export function pipeline(orders: Table, customers: Table, c: Config): Stage[] {
  const stages: Stage[] = [{title:'Fontes', table:orders, note:`${orders.rows.length} pedidos e ${customers.rows.length} clientes carregados.`}];
  let clean = customers;
  if(c.dedup) { const index = customers.columns.indexOf(c.dedupKey); if(index < 0) throw new Error('Escolha a coluna de deduplicação dos clientes.'); const seen = new Set<string>(); clean = {...customers, rows:customers.rows.filter(r => { if(r[index] === null) return true; const key=JSON.stringify(r[index]); if(seen.has(key)) return false; seen.add(key); return true; })}; }
  stages.push({title:'Limpeza', table:clean, note:c.dedup ? `${customers.rows.length-clean.rows.length} clientes repetidos removidos pela chave. Mantida a primeira ocorrência; chaves vazias preservadas.` : 'Clientes sem tratamento. Chaves repetidas podem multiplicar pedidos na junção.'});
  let filtered = orders;
  if(c.filter) { const index=orders.columns.indexOf(c.filterKey); if(index<0) throw new Error('Escolha a coluna do filtro de pedidos.'); filtered={...orders,rows:orders.rows.filter(r => r[index] !== null && String(r[index]) === c.filterValue)}; }
  stages.push({title:'Filtro',table:filtered,note:c.filter ? `${orders.rows.length-filtered.rows.length} pedidos removidos. Igualdade exata: ${c.filterKey} = ${c.filterValue}.` : 'Todos os pedidos mantidos, inclusive os cancelados.'});
  let joined = filtered;
  if(c.join) {
    const li=orders.columns.indexOf(c.leftKey), ri=clean.columns.indexOf(c.rightKey);
    if(li<0 || ri<0) throw new Error('Selecione chaves válidas para conectar pedidos e clientes.');
    const extra=clean.columns.map((name,i)=>({name,i})).filter(v=>v.i!==ri);
    const columns=[...filtered.columns]; for(const e of extra) { let name=e.name; while(columns.some(c=>c.toLowerCase()===name.toLowerCase())) name='cliente_'+name; columns.push(name); }
    const index=new Map<string,Cell[][]>(); clean.rows.forEach(r=>{if(r[ri]!==null){const key=JSON.stringify(r[ri]);index.set(key,[...(index.get(key)||[]),r]);}});
    const rows:Cell[][]=[]; for(const row of filtered.rows) { const matches=row[li]===null?[]:index.get(JSON.stringify(row[li]))||[]; for(const match of matches.length?matches:[null]) {rows.push([...row,...extra.map(e=>match?match[e.i]:null)]);if(rows.length>10000)throw new Error('A junção ultrapassou 10.000 linhas. Remova duplicidades ou reduza a base.');} }
    joined={columns,rows};
  }
  stages.push({title:'Junção',table:joined,note:c.join ? `LEFT JOIN: ${filtered.rows.length} pedidos → ${joined.rows.length} linhas. ${joined.rows.length>filtered.rows.length ? 'Atenção: chaves repetidas multiplicaram registros.' : 'Pedidos sem cliente são preservados com campos vazios.'}` : 'Junção desativada. A tabela fluxo contém somente os pedidos filtrados.'});
  return stages;
}
export function toCSV(t:Table): string {
  const escape=(v:Cell)=> {let s=v===null?'':String(v);if(typeof v==='string' && /^[\s]*[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
  return '\uFEFF'+[t.columns,...t.rows].map(r=>r.map(escape).join(';')).join('\r\n');
}
