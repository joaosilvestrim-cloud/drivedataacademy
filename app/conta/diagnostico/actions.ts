"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { knowledgeAccess, catalogVersions } from "@/lib/knowledge/server";
import { recordPracticalEvidence } from "@/app/admin/(dashboard)/universo/actions";

const GROUP = "diagnostico";

// Corrige no servidor. O gabarito nunca sai do banco.
export async function submitDiagnostic(answers: Record<string, number>) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Faça login para continuar.");
    if (!(await knowledgeAccess(user.id, user.email))) throw new Error("Seu acesso ao Universo não está ativo.");
    const admin = createAdminClient();

    const { data: done } = await admin.from("ku_diagnostic_attempts").select("user_id").eq("user_id", user.id).maybeSingle();
    if (done) throw new Error("Você já respondeu ao diagnóstico.");

    const { data: questions } = await admin
      .from("ku_diagnostic_questions").select("id, competency, answer, credits").eq("published", true);
    if (!questions?.length) throw new Error("Nenhuma pergunta disponível.");

    const version = (await catalogVersions()).at(-1);
    if (!version) throw new Error("Catálogo não publicado.");
    const valida = new Set(version.document.competencies.map((c) => c.id));

    // Agrega acertos e créditos por competência.
    const porCompetencia: Record<string, { acertos: number; total: number; creditos: number }> = {};
    for (const q of questions) {
      const bucket = (porCompetencia[q.competency] ||= { acertos: 0, total: 0, creditos: 0 });
      bucket.total += 1;
      bucket.creditos += Number(q.credits);
      if (answers[q.id] === q.answer) bucket.acertos += 1;
    }

    const results: Record<string, { acertos: number; total: number; quality: number }> = {};
    for (const [competency, b] of Object.entries(porCompetencia)) {
      const quality = b.total ? b.acertos / b.total : 0;
      results[competency] = { acertos: b.acertos, total: b.total, quality };
      // Sem acerto não há evidência. Não se registra desconhecimento.
      if (!valida.has(competency) || quality <= 0) continue;
      await recordPracticalEvidence({
        userId: user.id,
        competency,
        dimension: "exercise",
        group: GROUP,
        units: b.creditos,
        quality,
        advanced: false,
        label: "Diagnóstico de entrada",
        requestId: randomUUID(),
      });
    }

    const { error } = await admin.from("ku_diagnostic_attempts").insert({ user_id: user.id, answers, results });
    if (error) throw new Error(error.message);

    revalidatePath("/conta/diagnostico");
    revalidatePath("/universo");
    return { ok: true as const, results };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Não consegui registrar." };
  }
}
