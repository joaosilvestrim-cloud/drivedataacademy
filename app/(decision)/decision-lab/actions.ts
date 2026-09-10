"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { knowledgeAccess } from "@/lib/knowledge/server";
import { appendPracticalEvidence } from "@/lib/knowledge/practical";
import { syncKnowledgeMilestones } from "@/lib/knowledge/milestones";
import { LEVELS, goals, replay, validateDecision, type Difficulty } from "@/lib/decision-lab/engine";

const COMPETENCY = "planejamento";
const CREDITS = 40;

// Um resultado melhor gera uma evidência nova no mesmo grupo. O motor do
// Knowledge Universe já considera apenas o melhor crédito por grupo, então a
// melhor partida prevalece sozinha, sem precisar apagar nada.
function requestId(userId: string, difficulty: string, met: number): string {
  const h = createHash("sha1").update(`decision:${userId}:${difficulty}:${met}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

// O cliente manda apenas as decisões. O servidor refaz a partida inteira com o
// mesmo motor determinístico e confere o resultado; nada do que a tela informa
// é aceito como verdade.
export async function registerSimulation(difficulty: unknown, decisions: unknown) {
  try {
    const { data: { user } } = await createClient().auth.getUser();
    if (!user) return { ok: false as const, error: "Faça login para registrar a partida." };
    if (!(await knowledgeAccess(user.id, user.email))) {
      return { ok: false as const, error: "Registro de evidência disponível na assinatura ativa." };
    }

    if (typeof difficulty !== "string" || !Object.hasOwn(LEVELS, difficulty)) {
      return { ok: false as const, error: "Nível inválido." };
    }
    if (!Array.isArray(decisions) || decisions.length !== 6) {
      return { ok: false as const, error: "A missão precisa dos seis ciclos concluídos." };
    }

    const state = replay(difficulty as Difficulty, decisions.map(validateDecision));
    if (state.day !== 30) return { ok: false as const, error: "A missão não chegou ao dia 30." };

    const met = goals(state).filter((g) => g.met).length;
    if (!met) return { ok: false as const, error: "Registre quando alcançar ao menos uma das três metas." };

    const gravou = await appendPracticalEvidence({
      userId: user.id,
      competency: COMPETENCY,
      dimension: "exercise",
      group: `decision-lab-${difficulty}`,
      units: CREDITS,
      quality: met / 3,
      advanced: false,
      label: `Decision Lab · ${LEVELS[difficulty as Difficulty].label} · ${met} de 3 metas`,
      requestId: requestId(user.id, difficulty, met),
    });
    if (!gravou.ok) return { ok: false as const, error: gravou.error || "Não consegui registrar." };

    await syncKnowledgeMilestones(user.id);
    revalidatePath("/universo");
    revalidatePath("/conta/universo");
    return { ok: true as const, met };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Falha ao registrar a partida." };
  }
}
