"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { catalogVersions } from "@/lib/knowledge/server";
import { recordPracticalEvidence } from "../universo/actions";

async function authorized() {
  const user = await getAdminUser();
  if (!user) throw new Error("Acesso administrativo necessário.");
  return { user, db: createAdminClient() };
}
function fail(error: unknown) {
  return { ok: false as const, error: error instanceof Error ? error.message : "Falhou." };
}

export async function saveChallenge(input: {
  id?: string; competency: string; dimension: string; title: string; brief: string;
  group_key: string; credits: number; advanced: boolean; published: boolean;
}) {
  try {
    const { user, db } = await authorized();
    const version = (await catalogVersions()).at(-1);
    if (!version) throw new Error("Publique um catálogo antes de criar desafios.");
    if (!version.document.competencies.some((c) => c.id === input.competency)) throw new Error("Competência inexistente no catálogo publicado.");
    if (!["exercise", "challenge", "retention"].includes(input.dimension)) throw new Error("Tipo inválido.");
    if (!input.title.trim() || input.title.length > 160) throw new Error("Informe um título de até 160 caracteres.");
    if (!input.brief.trim() || input.brief.length > 4000) throw new Error("Descreva o desafio (até 4000 caracteres).");
    if (!input.group_key.trim() || input.group_key.length > 80) throw new Error("Informe o grupo de equivalência.");
    if (!Number.isFinite(input.credits) || input.credits <= 0 || input.credits > 10000) throw new Error("Créditos fora do intervalo.");

    const row = {
      competency: input.competency, dimension: input.dimension, title: input.title.trim(),
      brief: input.brief.trim(), group_key: input.group_key.trim(), credits: input.credits,
      advanced: input.advanced, published: input.published,
    };
    const { error } = input.id
      ? await db.from("ku_challenges").update(row).eq("id", input.id)
      : await db.from("ku_challenges").insert({ ...row, created_by: user.id });
    if (error) throw new Error(error.message);

    revalidatePath("/admin/desafios");
    revalidatePath("/conta/desafios");
    return { ok: true as const };
  } catch (error) { return fail(error); }
}

export async function saveDiagnosticQuestion(input: {
  id?: string; competency: string; prompt: string; options: string[];
  answer: number; credits: number; position: number; published: boolean;
}) {
  try {
    const { db } = await authorized();
    const version = (await catalogVersions()).at(-1);
    if (!version) throw new Error("Publique um catálogo antes de montar o diagnóstico.");
    if (!version.document.competencies.some((c) => c.id === input.competency)) throw new Error("Competência inexistente no catálogo publicado.");
    if (!input.prompt.trim() || input.prompt.length > 500) throw new Error("Escreva a pergunta (até 500 caracteres).");
    const options = input.options.map((o) => (o || "").trim()).filter(Boolean);
    if (options.length < 2 || options.length > 6) throw new Error("Informe de 2 a 6 alternativas.");
    if (options.some((o) => o.length > 300)) throw new Error("Alternativa muito longa.");
    if (!Number.isInteger(input.answer) || input.answer < 0 || input.answer >= options.length) throw new Error("Escolha a alternativa correta.");
    if (!Number.isFinite(input.credits) || input.credits <= 0 || input.credits > 1000) throw new Error("Créditos fora do intervalo.");

    const row = {
      competency: input.competency, prompt: input.prompt.trim(), options,
      answer: input.answer, credits: input.credits,
      position: Number.isFinite(input.position) ? Math.trunc(input.position) : 0,
      published: input.published,
    };
    const { error } = input.id
      ? await db.from("ku_diagnostic_questions").update(row).eq("id", input.id)
      : await db.from("ku_diagnostic_questions").insert(row);
    if (error) throw new Error(error.message);

    revalidatePath("/admin/desafios");
    revalidatePath("/conta/diagnostico");
    return { ok: true as const };
  } catch (error) { return fail(error); }
}

export async function deleteDiagnosticQuestion(id: string) {
  try {
    const { db } = await authorized();
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Pergunta inválida.");
    const { error } = await db.from("ku_diagnostic_questions").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/desafios");
    revalidatePath("/conta/diagnostico");
    return { ok: true as const };
  } catch (error) { return fail(error); }
}

// Aprovar gera a evidência pela Server Action original do Knowledge Universe.
// A chave practical:<id da entrega> torna a operação idempotente no banco.
export async function reviewSubmission(submissionId: string, decision: "approved" | "rejected", qualityPercent: number, feedback: string) {
  try {
    const { user, db } = await authorized();
    if (!/^[0-9a-f-]{36}$/i.test(submissionId)) throw new Error("Entrega inválida.");
    const nota = (feedback || "").trim();
    if (nota.length > 2000) throw new Error("Retorno muito longo.");

    const { data: sub, error: readError } = await db
      .from("ku_challenge_submissions").select("id, user_id, challenge_id, status").eq("id", submissionId).single();
    if (readError || !sub) throw new Error("Entrega não encontrada.");

    const { data: challenge } = await db
      .from("ku_challenges").select("competency, dimension, title, group_key, credits, advanced").eq("id", sub.challenge_id).maybeSingle();
    if (!challenge) throw new Error("Desafio não encontrado.");

    let quality: number | null = null;
    if (decision === "approved") {
      if (!Number.isFinite(qualityPercent) || qualityPercent < 0 || qualityPercent > 100) throw new Error("Qualidade deve ficar entre 0 e 100.");
      quality = Math.round(qualityPercent) / 100;
      if (!nota) throw new Error("Escreva um retorno para o aluno.");

      const evidence = await recordPracticalEvidence({
        userId: sub.user_id,
        competency: challenge.competency,
        dimension: challenge.dimension,
        group: challenge.group_key,
        units: Number(challenge.credits),
        quality,
        advanced: !!challenge.advanced,
        label: challenge.title,
        requestId: sub.id,
      });
      if (!evidence.ok) throw new Error(evidence.error);
    } else if (!nota) {
      throw new Error("Explique ao aluno o que precisa melhorar.");
    }

    const { error } = await db.from("ku_challenge_submissions").update({
      status: decision, quality, feedback: nota,
      reviewed_by: user.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", submissionId);
    if (error) throw new Error(error.message);

    revalidatePath("/admin/desafios");
    revalidatePath("/conta/desafios");
    revalidatePath("/universo");
    return { ok: true as const };
  } catch (error) { return fail(error); }
}
