import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { catalogVersions } from './server';

// Registra evidência prática em nome de um aluno.
//
// A Server Action recordPracticalEvidence do painel exige sessão de admin, o
// que serve para a correção de desafios mas impede os fluxos em que o próprio
// aluno gera evidência (diagnóstico e missões dos laboratórios). Aqui o
// chamador já provou quem é o aluno; as validações continuam as mesmas e a
// escrita segue passando pelo ku_append_activity.
export type PracticalInput = {
  userId: string;
  competency: string;
  dimension: 'exercise' | 'challenge' | 'retention';
  group: string;
  units: number;
  quality: number;
  advanced: boolean;
  label: string;
  requestId: string;
};

export async function appendPracticalEvidence(input: PracticalInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const version = (await catalogVersions()).at(-1);
    if (!version) return { ok: false, error: 'Nenhum catálogo publicado.' };
    if (!version.document.competencies.some((c) => c.id === input.competency)) {
      return { ok: false, error: 'Competência inexistente no catálogo publicado.' };
    }
    if (!['exercise', 'challenge', 'retention'].includes(input.dimension)) return { ok: false, error: 'Tipo de evidência inválido.' };
    if (!/^[0-9a-f-]{36}$/i.test(input.userId) || !/^[0-9a-f-]{36}$/i.test(input.requestId)) return { ok: false, error: 'Identificador inválido.' };
    if (!Number.isFinite(input.units) || input.units < 0 || input.units > 10000) return { ok: false, error: 'Créditos fora do intervalo.' };
    if (!Number.isFinite(input.quality) || input.quality < 0 || input.quality > 1) return { ok: false, error: 'Qualidade fora do intervalo.' };
    if (!input.group.trim() || input.group.length > 80) return { ok: false, error: 'Grupo inválido.' };
    if (!input.label.trim() || input.label.length > 240) return { ok: false, error: 'Descrição inválida.' };

    const admin = createAdminClient();
    const { error } = await admin.rpc('ku_append_activity', {
      p_user: input.userId,
      p_course: null,
      p_kind: input.dimension,
      p_key: `practical:${input.requestId}`,
      p_payload: {
        competency: input.competency, group: input.group,
        units: input.units, quality: input.quality,
        qualified: input.units > 0 && input.quality >= 0.7,
        advanced: input.advanced, label: input.label,
      },
      p_at: new Date().toISOString(),
      p_precision: 'exact',
      p_version: version.id,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Falha ao registrar evidência.' };
  }
}
