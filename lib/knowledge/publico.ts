import 'server-only';
import { loadUniverse } from '@/lib/knowledge/server';
import { universe } from '@/lib/knowledge/engine';
import type { Catalog, Score } from '@/lib/knowledge/types';

/* O Universo 4D do aluno, na versão que um visitante pode ver.

   Aparece na página pública do portfólio, para quem recruta girar o mapa de
   competências do aluno e arrastar a linha do tempo. É a peça que um
   portfólio comum não tem: não é o aluno dizendo o que sabe, é a Academy
   mostrando o que ele demonstrou, medido pelo motor do universo.

   O que NÃO sai daqui, e é o motivo deste arquivo existir em vez de a página
   pública chamar loadUniverse direto: os eventos de estudo. Cada quiz, cada
   aula, com data e hora. Um recrutador veria "errou o mesmo quiz três vezes às
   2h da manhã". Então tudo é calculado no servidor e só sai a nota agregada
   de cada competência, com a lista de evidências esvaziada.

   O "4D" é o tempo. Em vez de mandar os eventos para o navegador recalcular
   a qualquer data, o servidor tira fotos do universo, semanais ou mensais
   conforme o tamanho do histórico, e o visitante navega entre elas. É
   resolução suficiente para mostrar a evolução sem revelar a rotina de
   estudo de ninguém. */

export type QuadroPublico = { at: string; scores: Record<string, Score> };
export type UniversoPublico = { catalog: Catalog; quadros: QuadroPublico[]; passo: "semana" | "mes" };

/** Máximo de fotos na linha do tempo. */
const MAX_QUADROS = 12;

function limpar(scores: Record<string, Score>): Record<string, Score> {
  const saida: Record<string, Score> = {};
  for (const [id, s] of Object.entries(scores)) {
    saida[id] = {
      ...s,
      evidence: [],
      // Só o mês. A data exata da última atividade é rotina, não competência.
      lastActivity: s.lastActivity ? s.lastActivity.slice(0, 7) : null,
    };
  }
  return saida;
}

/* Pontos da linha do tempo.

   Passo adaptativo. A Academy tem pouco tempo de vida, e em fotos mensais um
   aluno de agosto teria três quadros: o "ver a evolução" acabaria antes de
   começar. Histórico curto vai em semanas, longo em meses, sempre perto de
   MAX_QUADROS. Semana ainda é agregado suficiente para não revelar rotina. */
function pontosDoTempo(inicio: string, fim: string): { pontos: string[]; passo: "semana" | "mes" } {
  const a = Date.parse(inicio);
  const b = Date.parse(fim);
  const dias = Math.max(1, (b - a) / 86400000);
  if (dias < 120) {
    const passoDias = Math.max(7, Math.ceil(dias / (MAX_QUADROS - 1) / 7) * 7);
    const pontos: string[] = [];
    for (let t = a + passoDias * 86400000; t < b; t += passoDias * 86400000) pontos.push(new Date(t).toISOString());
    pontos.push(new Date(b).toISOString());
    return { pontos: pontos.slice(-MAX_QUADROS), passo: "semana" };
  }
  const pontos: string[] = [];
  const d = new Date(a);
  const cursor = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  while (cursor.getTime() < b) {
    pontos.push(cursor.toISOString());
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  pontos.push(new Date(b).toISOString());
  // Histórico longo: os últimos meses, que é o que interessa a quem olha agora.
  return { pontos: pontos.slice(-MAX_QUADROS), passo: "mes" };
}

/** Null quando o universo não está instalado ou o aluno ainda não tem histórico. */
export async function universoPublico(userId: string): Promise<UniversoPublico | null> {
  let dados;
  try {
    dados = await loadUniverse(userId);
  } catch {
    return null;
  }
  if (!dados.events.length) return null;

  const { pontos, passo } = pontosDoTempo(dados.start, dados.end);
  const quadros = pontos.map((at) => ({
    at,
    scores: limpar(universe(dados.catalog, dados.events, at)),
  }));
  return { catalog: dados.catalog, quadros, passo };
}
