import { MAX_ROWS, type Config } from './engine';

// Um projeto guarda a RECEITA, nunca os dados.
//
// O laboratório promete que nenhum arquivo sai do navegador, e um CSV de 5.000
// linhas não cabe no localStorage. Então persistimos apenas a configuração das
// etapas e o SQL. Ao abrir o projeto a receita é aplicada na hora, e o aluno
// reimporta o próprio arquivo (ou o caso de exemplo carrega sozinho).
export interface Project { id: string; name: string; createdAt: string; updatedAt: string; config: Config; sql: string }
export interface Save { version: 1; activeId: string; projects: Project[] }

export const MAX_PROJECTS = 6;
export const MAX_SQL = 12000;

function text(value: unknown, max: number, label: string): string {
  if (typeof value !== 'string' || value.length > max) throw new Error(label);
  return value;
}
function flag(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('Configuração inválida do projeto.');
  return value;
}

export function validateConfig(input: unknown): Config {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Configuração inválida do projeto.');
  const c = input as Record<string, unknown>;
  const col = (key: string) => text(c[key], 80, 'Nome de coluna inválido no projeto.');
  return {
    dedup: flag(c.dedup), dedupKey: col('dedupKey'),
    filter: flag(c.filter), filterKey: col('filterKey'), filterValue: text(c.filterValue, 200, 'Valor de filtro inválido.'),
    join: flag(c.join), leftKey: col('leftKey'), rightKey: col('rightKey'),
  };
}

export function validateSql(input: unknown): string {
  const sql = text(input, MAX_SQL, `A consulta passou de ${MAX_SQL} caracteres.`);
  // O motor SQL roda no worker com query_only; aqui só barramos o tamanho.
  return sql;
}

function validateProject(input: unknown, seen: Set<string>): Project {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Projeto inválido.');
  const p = input as Record<string, unknown>;
  const id = text(p.id, 80, 'Projeto inválido.');
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(id) || seen.has(id)) throw new Error('Projeto inválido ou repetido.');
  seen.add(id);
  const name = text(p.name, 80, 'Nome de projeto inválido.').trim();
  if (!name) throw new Error('Nome de projeto inválido.');
  for (const key of ['createdAt', 'updatedAt'] as const) {
    if (typeof p[key] !== 'string' || !Number.isFinite(Date.parse(p[key] as string))) throw new Error('Data inválida no projeto.');
  }
  return {
    id, name,
    createdAt: p.createdAt as string, updatedAt: p.updatedAt as string,
    config: validateConfig(p.config), sql: validateSql(p.sql),
  };
}

export function readSave(text: string): Save {
  if (text.length > 200000) throw new Error('Arquivo muito grande. O limite é 200 KB.');
  const data = JSON.parse(text);
  if (!data || data.version !== 1 || !Array.isArray(data.projects) || !data.projects.length || data.projects.length > MAX_PROJECTS) {
    throw new Error('Arquivo de projetos incompatível.');
  }
  const seen = new Set<string>();
  const projects = data.projects.map((p: unknown) => validateProject(p, seen));
  if (typeof data.activeId !== 'string' || !seen.has(data.activeId)) throw new Error('Projeto ativo não encontrado.');
  return { version: 1, activeId: data.activeId, projects };
}

export function newProject(name: string, config: Config, sql: string): Project {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: name.trim().slice(0, 80) || 'Meu fluxo',
    createdAt: now, updatedAt: now,
    config: { ...config }, sql,
  };
}

// Aviso mostrado ao abrir um projeto: a receita volta, os dados não.
export function recipeSummary(p: Project): string {
  const partes = [
    p.config.dedup ? `limpeza por ${p.config.dedupKey}` : 'sem limpeza',
    p.config.filter ? `filtro ${p.config.filterKey} = ${p.config.filterValue}` : 'sem filtro',
    p.config.join ? `junção ${p.config.leftKey} × ${p.config.rightKey}` : 'sem junção',
  ];
  return partes.join(' · ');
}

export { MAX_ROWS };
