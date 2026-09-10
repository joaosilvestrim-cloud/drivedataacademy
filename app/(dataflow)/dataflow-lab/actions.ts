"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { knowledgeAccess } from "@/lib/knowledge/server";
import { appendPracticalEvidence } from "@/lib/knowledge/practical";
import { syncKnowledgeMilestones } from "@/lib/knowledge/milestones";
import { pipeline, sample } from "@/lib/dataflow/engine";
import { findMission } from "@/lib/dataflow/missions";
import { validateConfig } from "@/lib/dataflow/storage";

// Um id estável por aluno e missão: concluir de novo não gera evidência nova.
function requestId(userId: string, missionId: string): string {
  const h = createHash("sha1").update(`dataflow:${userId}:${missionId}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

// O cliente manda a configuração, nunca o resultado. O servidor refaz o
// pipeline com o caso de exemplo e confere sozinho se a missão foi cumprida.
export async function completeMission(missionId: string, config: unknown) {
  try {
    const { data: { user } } = await createClient().auth.getUser();
    if (!user) return { ok: false as const, error: "Faça login para registrar a missão." };
    if (!(await knowledgeAccess(user.id, user.email))) {
      return { ok: false as const, error: "Registro de evidência disponível na assinatura ativa." };
    }

    const mission = findMission(missionId);
    if (!mission) return { ok: false as const, error: "Missão desconhecida." };

    const valid = validateConfig(config);
    const { orders, customers } = sample();
    const stages = pipeline(orders, customers, valid);
    if (!mission.check(stages, valid)) {
      return { ok: false as const, error: "A configuração enviada ainda não cumpre a missão." };
    }

    const gravou = await appendPracticalEvidence({
      userId: user.id,
      competency: mission.competency,
      dimension: "exercise",
      group: mission.group,
      units: mission.credits,
      quality: 1,
      advanced: false,
      label: `DataFlow Lab · ${mission.title}`,
      requestId: requestId(user.id, mission.id),
    });
    if (!gravou.ok) return { ok: false as const, error: gravou.error || "Não consegui registrar." };

    await syncKnowledgeMilestones(user.id);
    revalidatePath("/universo");
    revalidatePath("/conta/universo");
    return { ok: true as const, competency: mission.competency };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Falha ao registrar a missão." };
  }
}
