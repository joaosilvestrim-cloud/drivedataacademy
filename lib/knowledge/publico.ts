import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { catalogVersions, loadUniverse } from '@/lib/knowledge/server';
import { universe } from '@/lib/knowledge/engine';
import { LACUNA } from '@/lib/portfolio';
import { carreiraDoAluno } from '@/lib/portfolio-carreira';
import { cursosPorCompetencia } from '@/lib/portfolio-competencias';
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

  /* O universo da carreira. Cada objeto do espaço é um tipo de fato real:
     planetas são projetos, luas são certificados, a nave percorre a
     trajetória, cometas são conquistas, sinais são recomendações, a
     nebulosa em formação é o que a pessoa estuda na Academy agora, e a
     estrela-guia é o objetivo. Todos têm data, e aparecem no play quando
     aconteceram. */
  planetas?: Planeta[];
  luas?: Lua[];
  trajetoria?: Parada[];
  conquistas?: Cometa[];
  sinais?: Sinal[];
  formacao?: Record<string, { score: number; level: string }>;
  guia?: Guia | null;
};

export type Planeta = {
  id: string; titulo: string; at: string; competencias: string[];
  resumo: string | null; problema: string | null; resultado: string | null;
  papel: string | null; time: number | null; duracao: number | null; setor: string | null; aprendizado: string | null;
};
export type Lua = { id: string; titulo: string; competencia: string; at: string; verificacao: string };
export type Parada = { id: string; cargo: string; organizacao: string | null; setor: string | null; inicio: string; fim: string | null };
export type Cometa = { id: string; titulo: string; at: string; descricao: string | null; link: string | null };
export type Sinal = { id: string; autor: string; cargo: string | null; relacao: string | null; texto: string; projeto: string | null };
export type Guia = { titulo: string; requeridas: { id: string; motivo: string; tem: boolean; cursos: { titulo: string; slug: string }[] }[] };

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

  const [{ data: linhas }, { data: perfil }, carreira, { data: certs }, plataforma] = await Promise.all([
    admin
      .from('portfolio_projects')
      .select('id, titulo, resumo, problema, resultado, descricao, ferramentas, feito_em, created_at, publico, competencias')
      .eq('user_id', userId),
    admin.from('profiles').select('skills').eq('id', userId).maybeSingle(),
    carreiraDoAluno(admin, userId, { soPublico: true }),
    admin.from('certificates').select('id, course_id, course_title, created_at, code, revoked, expires_at').eq('user_id', userId).eq('revoked', false),
    // A camada da plataforma: o que o aluno estuda na Academy. Só a nota
    // agregada, sem evento (ver universoPublico).
    universoPublico(userId).catch(() => null),
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
        id: p.id as string,
        linha: p,
        titulo: p.titulo as string,
        at: (p.feito_em ? `${p.feito_em}T12:00:00Z` : p.created_at) as string,
        competencias: [...motivos.keys()],
        // Só as que o texto prova. São elas que criam linha no 4D.
        doTexto: [...new Set(lidas.map((c) => c.id))],
        motivos,
      };
    });

  const skills: string[] = Array.isArray(perfil?.skills) ? perfil!.skills : String(perfil?.skills || '').split(',');
  const declaradas = new Set(skills.flatMap((s) => competenciasDe(s, catalogo)));

  /* Os fatos da carreira fora dos projetos. Cada um tem data, e a data
     entra na linha do tempo: o play passa a começar no primeiro emprego, não
     no primeiro projeto cadastrado. */
  const trajetoria: Parada[] = carreira.experiencias
    .filter((e) => e.inicio)
    .map((e) => ({ id: e.id, cargo: e.cargo, organizacao: e.organizacao, setor: e.setor, inicio: `${e.inicio}T12:00:00Z`, fim: e.fim ? `${e.fim}T12:00:00Z` : null }));
  const conquistas: Cometa[] = carreira.conquistas
    .filter((c) => c.data)
    .map((c) => ({ id: c.id, titulo: c.titulo, at: `${c.data}T12:00:00Z`, descricao: c.descricao, link: c.link_prova }));

  /* Luas: certificado orbitando a competência que ele trabalha. Pelo
     mapeamento oficial do catálogo (curso para competência) ou, na falta, pelo
     nome da competência no título do certificado. Certificado que não casa
     com nenhuma competência fica fora do céu, mas continua no site. */
  const mapeamentos = ((doc as any).mappings ?? []) as { courseId: string; competency: string }[];
  const agoraMs = Date.now();
  const luas: Lua[] = [];
  for (const c of (certs ?? []) as any[]) {
    if (c.expires_at && Date.parse(c.expires_at) < agoraMs) continue;
    const oficial = mapeamentos.find((m) => m.courseId === c.course_id)?.competency;
    const porNome = catalogo.competencies.find((k) => norm(c.course_title || '').includes(norm(k.name)))?.id;
    const competencia = oficial || porNome;
    if (!competencia) continue;
    luas.push({ id: c.id, titulo: c.course_title, competencia, at: c.created_at, verificacao: `/certificado/${c.code}` });
  }

  if (!projetos.length && !declaradas.size && !trajetoria.length && !conquistas.length && !luas.length) {
    return { catalog: catalogo, quadros: [], passo: 'mes', provas: {}, projetos: 0 };
  }

  const agora = Date.now();
  const { pontos, passo } = pontosDaCarreira(
    [
      ...projetos.map((p) => Date.parse(p.at)),
      ...trajetoria.map((t) => Date.parse(t.inicio)),
      ...conquistas.map((c) => Date.parse(c.at)),
      ...luas.map((l) => Date.parse(l.at)),
    ],
    agora,
  );
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
     projeto ganham uma linha, e o painel diz por qual projeto.

     Só as competências que o TEXTO prova criam linha. No primeiro teste, um
     projeto com dez competências (várias só por ferramenta marcada) gerou 45
     linhas, todas "pelo mesmo projeto": um novelo que não explica nada.
     Ferramenta marcada acende a esfera, mas não liga. */
  /* Quais pares ligar, para a constelação ficar legível.

     Ligar todas as competências de um projeto entre si vira teia: o projeto
     da Ayumana, com sete competências, gerava sozinho 21 arcos. O desenho que
     conta a carreira é outro:

     1. Em cada projeto, as competências se ligam ao CENTRO da carreira, a
        competência que aparece em mais projetos. Para o João, Gestão de
        projetos, presente nos quatro. A constelação passa a dizer qual é o
        eixo do profissional.
     2. E ficam as duplas que se repetem em dois projetos ou mais, porque
        essas não são acaso: são o jeito de trabalhar da pessoa.

     No perfil do João isso cai de uns 40 arcos para uns 15. */
  const frequencia = new Map<string, number>();
  for (const p of projetos) for (const c of p.doTexto) frequencia.set(c, (frequencia.get(c) ?? 0) + 1);
  const chave = (x: string, y: string) => [x, y].sort().join('|');

  const juntas: Record<string, string[]> = {};
  for (const p of projetos) {
    const cs = [...p.doTexto].sort();
    for (let i = 0; i < cs.length; i++) {
      for (let k = i + 1; k < cs.length; k++) (juntas[chave(cs[i], cs[k])] ??= []).push(p.titulo);
    }
  }

  const conexoes: Record<string, string[]> = {};
  for (const p of projetos) {
    if (p.doTexto.length < 2) continue;
    const centro = [...p.doTexto].sort((a, b) => (frequencia.get(b) ?? 0) - (frequencia.get(a) ?? 0) || a.localeCompare(b))[0];
    for (const c of p.doTexto) if (c !== centro) conexoes[chave(centro, c)] = juntas[chave(centro, c)];
  }
  for (const [k, titulos] of Object.entries(juntas)) if (titulos.length >= 2) conexoes[k] = titulos;
  /* Só as conexões da carreira, sem as relações gerais do catálogo. As
     gerais (Power BI puxa DAX, SQL puxa modelagem) são mapa de estudo, úteis
     no /universo; na página pública elas cruzavam a constelação inteira e
     escondiam as linhas que contam alguma coisa sobre o aluno. */
  const relacoes = Object.entries(conexoes).map(([chave, titulos]) => {
    const [source, target] = chave.split('|');
    return { source, target, strength: Math.min(1, 0.55 + 0.15 * titulos.length) };
  });

  const planetas: Planeta[] = projetos.map((p) => {
    const d = carreira.detalhes[p.id];
    return {
      id: p.id, titulo: p.titulo, at: p.at, competencias: p.competencias,
      resumo: p.linha.resumo ?? null, problema: p.linha.problema ?? null, resultado: p.linha.resultado ?? null,
      papel: d?.papel ?? null, time: d?.time_tamanho ?? null, duracao: d?.duracao_meses ?? null, setor: d?.setor ?? null, aprendizado: d?.aprendizado ?? null,
    };
  });

  const sinais: Sinal[] = carreira.recomendacoes
    .filter((r) => r.status === 'aprovada' && r.texto && r.autor_nome)
    .map((r) => ({ id: r.id, autor: r.autor_nome!, cargo: r.autor_cargo, relacao: r.relacao, texto: r.texto!, projeto: r.project_id }));

  /* Em formação: competência que a pessoa estuda na Academy e ainda não
     provou em projeto. Aparece diferente das estrelas, porque é outro tipo de
     evidência. */
  const provadasIds = new Set(projetos.flatMap((p) => p.competencias));
  const formacao: Record<string, { score: number; level: string }> = {};
  for (const [id, sc] of Object.entries(plataforma?.quadros.at(-1)?.scores ?? {})) {
    if (sc.score > 0 && !provadasIds.has(id)) formacao[id] = { score: Math.round(sc.score), level: sc.level };
  }

  /* Estrela-guia: o objetivo, o que o cargo costuma pedir, o que já está
     provado e o curso da Academy que trabalha o que falta. */
  let guia: Guia | null = null;
  if (carreira.objetivo?.titulo) {
    const cursos = await cursosPorCompetencia(admin);
    guia = {
      titulo: carreira.objetivo.titulo,
      requeridas: (carreira.objetivo.requeridas ?? []).map((r) => ({ ...r, tem: provadasIds.has(r.id), cursos: cursos[r.id] ?? [] })),
    };
  }

  return {
    catalog: { ...catalogo, relations: relacoes },
    quadros,
    passo,
    provas,
    projetos: projetos.length,
    conexoes,
    planetas,
    luas,
    trajetoria,
    conquistas,
    sinais,
    formacao,
    guia,
  };
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
