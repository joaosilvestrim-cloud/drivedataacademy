import 'server-only';
import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { catalogVersions, loadUniverse } from './server';
import { achievements } from './engine';

// Pontos concedidos ao cruzar cada marco de uma competência.
const POINTS: Record<number, number> = { 50: 5, 80: 15, 100: 30 };

// ref_id de point_events é uuid, então derivamos um id estável do trio
// aluno + competência + marco. O índice único (kind, ref_id) faz o resto:
// rodar de novo não concede pontos repetidos.
function milestoneId(userId: string, competency: string, threshold: number): string {
  const h = createHash('sha1').update(`ku:${userId}:${competency}:${threshold}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

// Liga o Knowledge Universe à gamificação da comunidade: um marco alcançado
// vira pontos no ranking. Nunca remove pontos, mesmo que o score caia depois,
// pelo mesmo motivo que os marcos já conquistados permanecem no histórico.
export async function syncKnowledgeMilestones(userId: string): Promise<number> {
  try {
    const version = (await catalogVersions()).at(-1);
    if (!version) return 0;

    const data = await loadUniverse(userId);
    const earned = achievements(data.catalog, data.events, data.end, data.history);
    if (!earned.length) return 0;

    const rows = earned.flatMap((a) => {
      const threshold = Number(a.id.split(':').pop());
      const points = POINTS[threshold];
      if (!points) return [];
      return [{ user_id: userId, kind: 'ku_milestone', points, ref_id: milestoneId(userId, a.competency, threshold) }];
    });
    if (!rows.length) return 0;

    // ignoreDuplicates deixa passar os marcos que já valeram ponto antes.
    const admin = createAdminClient();
    const { data: inserted } = await admin
      .from('point_events')
      .upsert(rows, { onConflict: 'kind,ref_id', ignoreDuplicates: true })
      .select('id');
    return inserted?.length ?? 0;
  } catch {
    // Pontuação é um bônus: nunca deve derrubar a correção de um desafio.
    return 0;
  }
}
