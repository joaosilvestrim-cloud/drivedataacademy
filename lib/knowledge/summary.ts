import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { catalogVersions, loadUniverse, knowledgeAccess } from './server';
import { freshness, universe } from './engine';
import type { Score } from './types';

export type Cooling = { id: string; name: string; score: number; freshness: number; days: number };
export type Parts = Record<string, number>;
// A competência mais forte, com a composição QUE PERTENCE A ELA. Antes
// devolvíamos o máximo de cada dimensão somado de competências diferentes, o
// que produzia uma composição que não existia em lugar nenhum.
export type Top = { id: string; name: string; score: number; parts: Parts };
export type Summary = { available: boolean; developed: number; advanced: number; cooling: Cooling[]; top: Top | null };

const EMPTY: Summary = { available: false, developed: 0, advanced: 0, cooling: [], top: null };

// Resumo barato do universo, para telas que só precisam de números.
//
// loadUniverse roda o import do histórico, pagina todos os eventos do aluno e
// recalcula tudo. Isso é caro demais para renderizar uma frase no perfil. Aqui
// reaproveitamos o ku_score_snapshots, que loadUniverse já grava por
// (aluno, versão, cursor) e que até agora nunca era lido.
//
// O Freshness é sempre recalculado a partir da última atividade, porque ele
// decai com o tempo e o valor gravado no snapshot é do momento da gravação.
export async function knowledgeSummary(userId: string, email?: string | null): Promise<Summary> {
  try {
    if (!(await knowledgeAccess(userId, email))) return EMPTY;

    const admin = createAdminClient();
    const version = (await catalogVersions()).at(-1);
    if (!version) return { ...EMPTY, available: true };

    // Cursor atual do aluno: a maior sequência já registrada.
    const { data: lastEvent } = await admin
      .from('ku_activity_events').select('sequence').eq('user_id', userId)
      .order('sequence', { ascending: false }).limit(1).maybeSingle();
    const cursor = lastEvent?.sequence ?? 0;

    const { data: snapshot } = await admin
      .from('ku_score_snapshots').select('scores')
      .eq('user_id', userId).eq('catalog_version', version.id).eq('source_cursor', cursor)
      .maybeSingle();

    // Sem snapshot para este cursor, o caminho completo recalcula e grava um.
    const scores: Record<string, Score> = snapshot?.scores
      ? (snapshot.scores as Record<string, Score>)
      : await (async () => {
          const data = await loadUniverse(userId);
          return universe(data.catalog, data.events, data.end);
        })();

    return { available: true, ...summarize(scores, version.document.competencies) };
  } catch {
    return EMPTY;
  }
}

function summarize(scores: Record<string, Score>, competencies: { id: string; name: string; halfLifeDays: number }[]) {
  const now = new Date().toISOString();
  const byId = new Map(competencies.map((c) => [c.id, c]));
  const values = Object.values(scores).filter((s) => s && typeof s.score === 'number');

  const cooling: Cooling[] = [];
  for (const s of values) {
    const comp = byId.get(s.id);
    if (!comp || s.score <= 0 || !s.lastActivity) continue;
    const atual = freshness(s.lastActivity, now, comp.halfLifeDays);
    if (atual === null || atual >= 70) continue;
    cooling.push({
      id: s.id, name: comp.name, score: s.score, freshness: atual,
      days: Math.floor((Date.parse(now) - Date.parse(s.lastActivity)) / 86400000),
    });
  }
  cooling.sort((a, b) => a.freshness - b.freshness);

  // A competência de maior score, com a composição dela. Nada é misturado.
  const forte = values.reduce<Score | null>((m, s) => (s.score > (m?.score ?? 0) ? s : m), null);
  const top: Top | null =
    forte && forte.score > 0
      ? {
          id: forte.id,
          name: byId.get(forte.id)?.name ?? forte.id,
          score: forte.score,
          parts: Object.fromEntries(
            Object.entries(forte.parts ?? {}).filter(([, v]) => typeof v === 'number' && Number.isFinite(v))
          ) as Parts,
        }
      : null;

  return {
    developed: values.filter((s) => s.score > 0).length,
    advanced: values.filter((s) => s.raw >= 80).length,
    cooling: cooling.slice(0, 4),
    top,
  };
}
