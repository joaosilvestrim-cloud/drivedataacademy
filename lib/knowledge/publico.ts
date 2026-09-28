import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { catalogVersions, loadUniverse } from '@/lib/knowledge/server';
import { universe } from '@/lib/knowledge/engine';
import { LACUNA } from '@/lib/portfolio';
import type { Catalog, Score } from '@/lib/knowledge/types';

/* O Universo 4D na página pública do portfólio.

   A constelação mostra o profissional que o aluno é HOJE, a partir dos
   projetos reais dele, e não o quanto ele estudou na Academy. Foi a decisão
   do João para a aula de portfólio: quem chega com dez anos de carreira e
   acabou de assinar não pode aparecer com um universo vazio.

   Duas camadas, na mesma constelação:

   1. Portfólio (ligada agora): cada competência acende porque um projeto a
      demonstra. A quarta dimensão é a carreira: os quadros seguem a data dos
      projetos, e o play mostra o universo crescendo de ano em ano.
   2. Plataforma (pronta, não ligada): o histórico de estudo, calculado pelo
      motor do universo. Entra depois, somando nos mesmos pontos, porque usa o
      mesmo catálogo. Está em universoPublico, mais abaixo.

   O que nunca sai daqui: evento de estudo. Na camada da plataforma a lista de
   evidências é zerada antes de sair; na do portfólio ela nem existe. */

export type QuadroPublico = { at: string; scores: Record<string, Score> };
/** Um projeto que prova a competência, e o porquê: o trecho do projeto, ou a ferramenta usada. */
export type Prova = { titulo: string; at: string | null; motivo?: string };
export type UniversoPublico = {
  catalog: Catalog;
  quadros: QuadroPublico[];
  passo: 'semana' | 'mes' | 'ano';
  /** Para cada competência, os projetos que a demonstram. Só na camada do portfólio. */
  provas?: Record<string, Prova[]>;
  /** Quantos projetos entraram. */
  projetos?: number;
  /* Por que duas competências se conectam: os projetos que provam as duas.
     Chave "a|b", com os ids em ordem alfabética. */
  conexoes?: Record<string, string[]>;
};

const MAX_QUADROS = 12;

/* De ferramenta de projeto para competência do catálogo.

   Um projeto com Power BI demonstra Power BI e também visualização; um com
   Snowflake demonstra Snowflake e cloud. O que não está aqui ainda casa pelo
   nome da competência (quem escreve "Scrum" acende Scrum). Ferramenta sem
   par no catálogo, como Protheus, some da constelação, mas continua no site. */
const FERRAMENTA_COMPETENCIA: Record<string, string[]> = {
  'power bi': ['power-bi', 'visualizacao'],
  dax: ['dax'],
  'power query': ['modelagem'],
  sql: ['sql'],
  'sql server': ['sql'],
  oracle: ['sql'],
  excel: ['excel'],
  sheets: ['excel'],
  python: ['python'],
  snowflake: ['snowflake', 'cloud-dados'],
  fabric: ['cloud-dados', 'data-eng'],
  databricks: ['data-eng', 'cloud-dados'],
  'power automate': ['automacao'],
  ia: ['ia-fundamentos'],
  figma: ['visualizacao'],
};

const norm = (t: string) =>
  (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function competenciasDe(ferramenta: string, catalogo: Catalog): string[] {
  const chave = norm(ferramenta);
  const ids = new Set(catalogo.competencies.map((c) => c.id));
  const mapeadas = (FERRAMENTA_COMPETENCIA[chave] ?? []).filter((id) => ids.has(id));
  if (mapeadas.length) return mapeadas;
  const porNome = catalogo.competencies.find((c) => norm(c.name) === chave || norm(c.id) === chave);
  return porNome ? [porNome.id] : [];
}

/* Tamanho da esfera pelo número de projetos que provam a competência. Um
   projeto já acende bem; do quarto em diante quase não aumenta, porque o que
   um recrutador lê é "tem prova", não uma contagem. */
const NOTA_POR_PROJETOS = [0, 45, 65, 80, 90];
const NOTA_DECLARADA = 18;

function quadroDoPortfolio(
  catalogo: Catalog,
  projetos: { titulo: string; at: string; competencias: string[] }[],
  ate: number,
  declaradas: Set<string>,
): Record<string, Score> {
  const scores: Record<string, Score> = {};
  for (const c of catalogo.competencies) {
    const provas = projetos.filter((p) => Date.parse(p.at) <= ate && p.competencias.includes(c.id));
    const n = provas.length;
    const ultima = n ? Math.max(...provas.map((p) => Date.parse(p.at))) : null;
    const meses = ultima ? (ate - ultima) / (30 * 86400000) : null;
    const declarada = !n && declaradas.has(c.id);
    const score = n ? NOTA_POR_PROJETOS[Math.min(n, 4)] : declarada ? NOTA_DECLARADA : 0;
    scores[c.id] = {
      id: c.id,
      score,
      raw: score,
      level: n ? `Demonstrada em ${n} ${n === 1 ? 'projeto' : 'projetos'}` : declarada ? 'Declarada no perfil, ainda sem projeto' : 'Sem projeto',
      // O brilho pulsa mais na competência usada há pouco tempo.
      freshness: meses === null ? null : meses <= 12 ? 90 : meses <= 36 ? 60 : 30,
      lastActivity: ultima ? new Date(ultima).toISOString().slice(0, 7) : null,
      parts: { learning: 0, assessment: 0, exercise: 0, challenge: score, retention: 0 },
      evidence: [],
      advanced: false,
      ready: false,
      readiness: 0,
    };
  }
  return scores;
}

/* Pontos da carreira: um por mês que teve projeto, ou por ano quando a
   carreira é longa demais para caber em meses. O último é sempre hoje, onde
   entram também as competências só declaradas no perfil, que não têm data. */
function pontosDaCarreira(datas: number[], agora: number): { pontos: number[]; passo: 'mes' | 'ano' } {
  const porMes = [...new Set(datas.map((d) => new Date(d).toISOString().slice(0, 7)))].sort();
  if (porMes.length < MAX_QUADROS) {
    const pontos = porMes.map((m) => Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0, 23, 59));
    return { pontos: [...pontos.filter((p) => p < agora), agora], passo: 'mes' };
  }
  const anos = [...new Set(datas.map((d) => new Date(d).getUTCFullYear()))].sort().slice(-(MAX_QUADROS - 1));
  const pontos = anos.map((a) => Date.UTC(a, 11, 31, 23, 59));
  return { pontos: [...pontos.filter((p) => p < agora), agora], passo: 'ano' };
}

/** Camada do portfólio. Null quando o catálogo do universo não está instalado. */
export async function universoDoPortfolio(admin: SupabaseClient, userId: string): Promise<UniversoPublico | null> {
  let versoes;
  try {
    versoes = await catalogVersions();
  } catch {
    return null;
  }
  const doc = versoes.at(-1)?.document;
  if (!doc) return null;
  // Sem os mappings: é configuração interna de curso para competência, e o
  // visitante não precisa dela.
  const { mappings: _interno, ...catalogo } = doc as Catalog & { mappings?: unknown };

  const [{ data: linhas }, { data: perfil }] = await Promise.all([
    admin
      .from('portfolio_projects')
      .select('titulo, resumo, problema, resultado, descricao, ferramentas, feito_em, created_at, publico, competencias')
      .eq('user_id', userId),
    admin.from('profiles').select('skills').eq('id', userId).maybeSingle(),
  ]);

  /* Os mesmos projetos que entram no site: públicos e sem lacuna. Projeto
     que o aluno deixou só para a turma não acende nada na página pública. */
  const projetos = (linhas ?? [])
    .filter((p: any) => p.titulo && p.publico && !LACUNA.test([p.titulo, p.resumo, p.problema, p.resultado, p.descricao].join(' ')))
    .map((p: any) => {
      /* De onde vem cada competência do projeto, em ordem de força:

         1. O texto do projeto, lido pela IA ao salvar, com o trecho que prova
            (lib/portfolio-competencias). É a fonte principal.
         2. As ferramentas marcadas, com a ferramenta como motivo.
         3. Projeto antigo, salvo antes da leitura do texto existir: fica com
            "Fundamentos de dados", como era, porque problema mais resultado é
            análise para decisão. */
      const motivos = new Map<string, string>();
      const lidas: { id: string; trecho: string }[] = Array.isArray(p.competencias?.itens) ? p.competencias.itens : [];
      for (const c of lidas) if (!motivos.has(c.id)) motivos.set(c.id, `"${c.trecho}"`);
      for (const f of p.ferramentas ?? []) {
        for (const id of competenciasDe(f, catalogo)) if (!motivos.has(id)) motivos.set(id, `Usou ${f}`);
      }
      if (!p.competencias && !motivos.has('fundamentos-dados')) motivos.set('fundamentos-dados', 'Projeto com problema de negócio e resultado');
      return {
        titulo: p.titulo as string,
        at: (p.feito_em ? `${p.feito_em}T12:00:00Z` : p.created_at) as string,
        competencias: [...motivos.keys()],
        motivos,
      };
    });

  const skills: string[] = Array.isArray(perfil?.skills) ? perfil!.skills : String(perfil?.skills || '').split(',');
  const declaradas = new Set(skills.flatMap((s) => competenciasDe(s, catalogo)));

  if (!projetos.length && !declaradas.size) return { catalog: catalogo, quadros: [], passo: 'mes', provas: {}, projetos: 0 };

  const agora = Date.now();
  const { pontos, passo } = pontosDaCarreira(projetos.map((p) => Date.parse(p.at)), agora);
  const quadros = pontos.map((t) => ({
    at: new Date(t).toISOString(),
    // Declarada não tem data: só aparece no quadro de hoje.
    scores: quadroDoPortfolio(catalogo, projetos, t, t === agora ? declaradas : new Set()),
  }));

  const provas: Record<string, Prova[]> = {};
  for (const p of projetos) {
    for (const c of p.competencias) (provas[c] ??= []).push({ titulo: p.titulo, at: p.at.slice(0, 7), motivo: p.motivos.get(c) });
  }

  /* Por que duas competências se conectam. O catálogo já traz as relações
     gerais (Power BI puxa DAX), mas o que interessa no portfólio é a relação
     que a carreira do aluno criou: duas competências provadas pelo mesmo
     projeto ganham uma linha, e o painel diz por qual projeto. */
  const conexoes: Record<string, string[]> = {};
  for (const p of projetos) {
    const cs = [...p.competencias].sort();
    for (let i = 0; i < cs.length; i++) {
      for (let k = i + 1; k < cs.length; k++) (conexoes[`${cs[i]}|${cs[k]}`] ??= []).push(p.titulo);
    }
  }
  const existentes = new Set(catalogo.relations.map((r) => [r.source, r.target].sort().join('|')));
  const relacoes = [
    ...catalogo.relations,
    ...Object.entries(conexoes)
      .filter(([chave]) => !existentes.has(chave))
      .map(([chave, titulos]) => {
        const [source, target] = chave.split('|');
        return { source, target, strength: Math.min(1, 0.55 + 0.15 * titulos.length) };
      }),
  ];

  return { catalog: { ...catalogo, relations: relacoes }, quadros, passo, provas, projetos: projetos.length, conexoes };
}

/* ---------------------------------------------------------------------
   Camada da plataforma: pronta, ainda não ligada na página pública.
   --------------------------------------------------------------------- */

function limpar(scores: Record<string, Score>): Record<string, Score> {
  const saida: Record<string, Score> = {};
  for (const [id, s] of Object.entries(scores)) {
    saida[id] = { ...s, evidence: [], lastActivity: s.lastActivity ? s.lastActivity.slice(0, 7) : null };
  }
  return saida;
}

/* Passo adaptativo: a Academy tem pouco tempo de vida, e em fotos mensais um
   aluno de agosto teria três quadros. Histórico curto vai em semanas. */
function pontosDoTempo(inicio: string, fim: string): { pontos: string[]; passo: 'semana' | 'mes' } {
  const a = Date.parse(inicio);
  const b = Date.parse(fim);
  const dias = Math.max(1, (b - a) / 86400000);
  if (dias < 120) {
    const passoDias = Math.max(7, Math.ceil(dias / (MAX_QUADROS - 1) / 7) * 7);
    const pontos: string[] = [];
    for (let t = a + passoDias * 86400000; t < b; t += passoDias * 86400000) pontos.push(new Date(t).toISOString());
    pontos.push(new Date(b).toISOString());
    return { pontos: pontos.slice(-MAX_QUADROS), passo: 'semana' };
  }
  const pontos: string[] = [];
  const d = new Date(a);
  const cursor = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  while (cursor.getTime() < b) {
    pontos.push(cursor.toISOString());
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  pontos.push(new Date(b).toISOString());
  return { pontos: pontos.slice(-MAX_QUADROS), passo: 'mes' };
}

/** Camada da plataforma: o histórico de estudo, só com a nota agregada. */
export async function universoPublico(userId: string): Promise<UniversoPublico | null> {
  let dados;
  try {
    dados = await loadUniverse(userId);
  } catch {
    return null;
  }
  if (!dados.events.length) return null;
  const { pontos, passo } = pontosDoTempo(dados.start, dados.end);
  const quadros = pontos.map((at) => ({ at, scores: limpar(universe(dados.catalog, dados.events, at)) }));
  const { mappings: _interno, ...catalogo } = dados.catalog as Catalog & { mappings?: unknown };
  return { catalog: catalogo, quadros, passo };
}
