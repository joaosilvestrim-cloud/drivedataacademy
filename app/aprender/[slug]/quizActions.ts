"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function gradeQuiz(formData: FormData) {
  const slug = formData.get("slug") as string;
  const quizId = formData.get("quiz_id") as string;
  const courseId = formData.get("course_id") as string;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();

  // matrícula obrigatória
  const { data: enr } = await admin.from("enrollments").select("id").eq("user_id", user.id).eq("course_id", courseId).maybeSingle();
  if (!enr) redirect(`/cursos/${slug}`);

  const { data: quiz } = await admin.from("quizzes").select("pass_score, max_attempts, cooldown_hours").eq("id", quizId).maybeSingle();
  if (!quiz) redirect(`/aprender/${slug}`);

  // controle de tentativas / cooldown
  const { data: attempts } = await admin.from("quiz_attempts").select("created_at, passed").eq("user_id", user.id).eq("quiz_id", quizId).order("created_at", { ascending: false });
  const list = attempts ?? [];
  const alreadyPassed = list.some((a: any) => a.passed);
  if (!alreadyPassed && list.length >= quiz.max_attempts && quiz.cooldown_hours > 0) {
    const last = new Date(list[0].created_at).getTime();
    const wait = quiz.cooldown_hours * 3600 * 1000;
    if (Date.now() - last < wait) redirect(`/aprender/${slug}/avaliacao?blocked=1`);
  }

  // correção
  const { data: questions } = await admin.from("quiz_questions").select("id, options").eq("quiz_id", quizId);
  const qs = questions ?? [];
  const answers: Record<string, number> = {};
  let correct = 0;
  for (const q of qs) {
    const picked = Number(formData.get(`q_${q.id}`));
    answers[q.id] = isNaN(picked) ? -1 : picked;
    const opts = (q.options as any[]) || [];
    if (opts[picked]?.correct) correct++;
  }
  const score = qs.length ? Math.round((correct / qs.length) * 100) : 0;
  const passed = score >= quiz.pass_score;

  const { data: att } = await admin.from("quiz_attempts").insert({
    user_id: user.id, quiz_id: quizId, course_id: courseId, score, passed, answers,
  }).select("id").single();

  redirect(`/aprender/${slug}/avaliacao?attempt=${att?.id ?? ""}`);
}
