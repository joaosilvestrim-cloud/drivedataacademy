import type { Config, Stage } from './engine';

// Missões do laboratório.
//
// A verificação é feita no servidor, refazendo o pipeline com o caso de exemplo
// (que é fixo e determinístico) e a configuração enviada. Por isso a checagem
// só pode olhar para etapas do pipeline, nunca para o CSV do aluno nem para o
// resultado do SQL: nada que o servidor não consiga reproduzir sozinho vira
// evidência no Knowledge Universe.
export type Mission = {
  id: string;
  title: string;
  brief: string;
  hint: string;
  done: string;
  competency: string;
  group: string;
  credits: number;
  check: (stages: Stage[], config: Config) => boolean;
};

const rows = (stages: Stage[], i: number) => stages[i]?.table.rows.length ?? -1;

export const MISSIONS: Mission[] = [
  {
    id: 'so-aprovados',
    title: 'Só os aprovados',
    brief: 'A diretoria só quer vendas aprovadas no relatório. Deixe passar apenas os pedidos com status aprovado.',
    hint: 'Ative o filtro da etapa 03 e compare a coluna status.',
    done: 'Filtro correto: 20 pedidos aprovados de 24.',
    competency: 'fundamentos-dados',
    group: 'dataflow-filtro',
    credits: 25,
    check: (stages, config) => config.filter && rows(stages, 2) === 20,
  },
  {
    id: 'chave-que-duplica',
    title: 'A chave que duplica',
    brief: 'A junção está criando linhas do nada. Descubra por que e faça o número de linhas parar de crescer.',
    hint: 'Um cliente aparece duas vezes na tabela de clientes. Veja a etapa 02.',
    done: 'A junção parou de multiplicar: entra e sai a mesma quantidade.',
    competency: 'modelagem',
    group: 'dataflow-juncao',
    credits: 30,
    check: (stages, config) => config.join && rows(stages, 3) === rows(stages, 2),
  },
  {
    id: 'faturamento-fantasma',
    title: 'O faturamento fantasma',
    brief: 'O faturamento do mês veio inflado. Elimine a multiplicação de pedidos e mantenha apenas vendas aprovadas.',
    hint: 'Você precisa das duas correções ao mesmo tempo: a chave repetida e o status.',
    done: 'Fluxo corrigido: 20 pedidos válidos, sem multiplicação.',
    competency: 'modelagem',
    group: 'dataflow-fantasma',
    credits: 45,
    check: (stages, config) =>
      config.dedup && config.filter && config.join && rows(stages, 2) === 20 && rows(stages, 3) === 20,
  },
];

export function findMission(id: string): Mission | undefined {
  return MISSIONS.find((m) => m.id === id);
}
