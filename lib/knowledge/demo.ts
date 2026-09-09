import type { Catalog, Competency, Dimension, Evidence, Vec3 } from './types';

export const DEMO_START = '2025-09-09T12:00:00.000Z';
export const DEMO_END = '2026-09-09T12:00:00.000Z';
const targets = { learning: 100, assessment: 100, exercise: 100, challenge: 100, retention: 100 };
const make = (id: string, name: string, area: string, position: Vec3, description: string, parent?: string): Competency => ({ id, name, area, position, description, parent, targets: { ...targets }, halfLifeDays: 180 });
export const DEMO_CATALOG: Catalog = {
  version: 'demo-1',
  areas: [
    { id: 'dados', name: 'Dados', color: '#56e7cf', position: [-4.4, .6, 0] },
    { id: 'gestao', name: 'Gestão', color: '#9c9cff', position: [4.3, 2.3, -1] },
    { id: 'ia', name: 'Inteligência artificial', color: '#f2b975', position: [3, -3.4, .5] },
  ],
  competencies: [
    make('power-bi', 'Power BI', 'dados', [-6.2, 2.3, .8], 'Transformar dados em relatórios claros e decisões fundamentadas.'),
    make('dax', 'DAX', 'dados', [-2.8, 2.8, 1.5], 'Criar medidas, dominar contextos de filtro e realizar análises temporais.', 'power-bi'),
    make('modelagem', 'Modelagem', 'dados', [-2, .1, -.4], 'Organizar dimensões, fatos e relacionamentos para análises consistentes.'),
    make('sql', 'SQL', 'dados', [-5.8, -1.2, 1], 'Consultar, combinar e transformar dados relacionais.'),
    make('visualizacao', 'Visualização', 'dados', [-7.4, .1, -1.4], 'Comunicar descobertas por meio de gráficos e hierarquia visual.', 'power-bi'),
    make('excel', 'Excel', 'dados', [-7, -3, 0], 'Estruturar planilhas, fórmulas e análises reproduzíveis.'),
    make('python', 'Python', 'dados', [-3.4, -3.4, 2], 'Automatizar análises e transformar dados com programação.'),
    make('analytics', 'Analytics Engineering', 'dados', [-.4, -1.9, .6], 'Construir modelos analíticos confiáveis, testados e documentados.'),
    make('data-eng', 'Data Engineering', 'dados', [-1, -4.7, -1.3], 'Desenvolver pipelines e infraestrutura para produtos de dados.'),
    make('projetos', 'Gestão de projetos', 'gestao', [3.2, 4.3, .2], 'Conectar objetivos, entregas, recursos e resultados.'),
    make('riscos', 'Riscos', 'gestao', [6.4, 4.4, -.8], 'Identificar incertezas e planejar respostas.', 'projetos'),
    make('scrum', 'Scrum', 'gestao', [6.9, 1.8, .5], 'Organizar trabalho iterativo com inspeção e adaptação.'),
    make('planejamento', 'Planejamento', 'gestao', [2, 1.2, 1], 'Traduzir objetivos em um plano executável.', 'projetos'),
    make('stakeholders', 'Stakeholders', 'gestao', [5.8, -.4, -1], 'Alinhar expectativas e comunicar decisões.', 'projetos'),
    make('ia-fundamentos', 'Fundamentos de IA', 'ia', [2, -5.1, 1], 'Entender capacidades, limites e aplicações da inteligência artificial.'),
    make('prompting', 'Prompting', 'ia', [5.8, -3.1, 1.1], 'Estruturar instruções e critérios de qualidade para sistemas de IA.'),
    make('automacao', 'Automação', 'ia', [1, -3.4, -.8], 'Conectar processos e reduzir tarefas repetitivas.'),
    make('agentes', 'Agentes', 'ia', [6.7, -5.2, -.4], 'Projetar fluxos com ferramentas, estados e limites claros.'),
    make('llms', 'LLMs', 'ia', [4.1, -6.3, -.7], 'Compreender o funcionamento e a avaliação de modelos de linguagem.'),
  ],
  relations: [
    ['power-bi','dax',.95], ['power-bi','modelagem',.9], ['power-bi','visualizacao',.85], ['sql','modelagem',.9],
    ['sql','excel',.45], ['sql','python',.7], ['sql','analytics',.9], ['dax','modelagem',.85],
    ['modelagem','analytics',.9], ['analytics','data-eng',.9], ['python','data-eng',.8], ['python','automacao',.85],
    ['projetos','riscos',.9], ['projetos','planejamento',.95], ['projetos','stakeholders',.9], ['projetos','scrum',.8],
    ['scrum','planejamento',.7], ['planejamento','modelagem',.35], ['ia-fundamentos','prompting',.85],
    ['prompting','agentes',.9], ['agentes','automacao',.9], ['ia-fundamentos','llms',.8], ['llms','prompting',.85],
    ['automacao','ia-fundamentos',.65], ['stakeholders','visualizacao',.4],
  ].map(([source,target,strength]) => ({ source: source as string, target: target as string, strength: strength as number })),
  unlocks: [
    { target: 'analytics', rule: { all: [{ competency: 'sql', minimum: 70 }, { competency: 'power-bi', minimum: 70 }, { competency: 'modelagem', minimum: 60 }] } },
    { target: 'data-eng', rule: { all: [{ competency: 'analytics', minimum: 60 }, { competency: 'python', minimum: 50 }] } },
    { target: 'agentes', rule: { all: [{ competency: 'prompting', minimum: 50 }, { competency: 'automacao', minimum: 40 }] } },
    { target: 'llms', rule: { all: [{ competency: 'ia-fundamentos', minimum: 40 }] } },
  ],
  path: ['power-bi', 'dax', 'modelagem', 'analytics', 'data-eng'],
};

// Fictional activity, never persisted into student records. Each row describes
// evidence dimensions; all visible scores and snapshots are computed by engine.ts.
const learning: Record<string, [number, number, number, number, number, number]> = {
  'power-bi': [0, 100, 96, 100, 90, 66.6666666667], dax: [2, 100, 80, 60, 25, 20],
  modelagem: [1, 100, 86, 85, 65, 33.3333333333], sql: [0, 100, 90, 85, 75, 66.6666666667],
  visualizacao: [2, 100, 78, 60, 30, 0], excel: [0, 100, 92, 95, 90, 100],
  python: [5, 65, 42, 0, 0, 0], projetos: [1, 100, 90, 90, 85, 66.6666666667],
  riscos: [4, 90, 74, 40, 20, 0], scrum: [3, 100, 78, 65, 35, 33.3333333333],
  planejamento: [2, 100, 84, 80, 50, 0], stakeholders: [5, 80, 64, 35, 0, 0],
  'ia-fundamentos': [6, 100, 75, 45, 0, 0], prompting: [7, 90, 70, 65, 20, 0],
  automacao: [6, 85, 62, 60, 15, 0],
};
export const DEMO_EVENTS: Evidence[] = Object.entries(learning).flatMap(([id, [start, ...amounts]]) => {
  const name = DEMO_CATALOG.competencies.find(c => c.id === id)!.name;
  const dims: Dimension[] = ['learning', 'assessment', 'exercise', 'challenge', 'retention'];
  return dims.flatMap((dimension, index) => {
    const final = amounts[index];
    if (!final) return [];
    return [0.3, 0.65, 1].map((fraction, step) => {
      const month = Math.min(11, start + step * 2 + (index > 1 ? 1 : 0));
      const date = new Date(Date.UTC(2025, 8 + month, 12 + index * 3, 12));
      return { id: `${id}-${dimension}-${step}`, competency: id, dimension,
        group: dimension === 'retention' ? `review-${step}` : `${id}-${dimension}-objective`,
        units: dimension === 'retention' ? final / 3 : final * fraction, quality: 1,
        at: date.toISOString(), label: `${['Conteúdo estudado', 'Avaliação corrigida', 'Exercício aprovado', 'Projeto validado', 'Revisão aprovada'][index]} · ${name}`,
        course: `${name} na prática`, qualified: index > 0,
        advanced: ['power-bi','sql','excel','projetos'].includes(id) && step === 2 && (dimension === 'assessment' || dimension === 'challenge'),
        completed: dimension === 'learning' && final === 100 && step === 2,
      };
    });
  });
});
export const DEMO_CHALLENGE = {
  id: 'dax-context', competency: 'dax', title: 'O contexto faz a diferença',
  question: 'Em uma medida DAX, qual função permite modificar o contexto de filtro de uma expressão?',
  options: ['FORMAT', 'CALCULATE', 'CONCATENATE', 'ROUND'], correct: 1,
  explanation: 'CALCULATE avalia uma expressão em um contexto de filtro modificado. Essa é a base de medidas como participação no total e comparações entre períodos.',
};
export function demoChallengeEvidence(): Evidence {
  return { id: 'demo-dax-context', competency: 'dax', dimension: 'exercise', group: 'dax-exercise-objective',
    units: 85, quality: 1, qualified: true, at: DEMO_END, label: 'Exercício demonstrativo · Contexto de filtro' };
}
