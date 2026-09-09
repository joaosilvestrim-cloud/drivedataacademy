"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccessCourse } from "@/lib/access";
import { selectedAnswer, safeCourseSlug } from "@/lib/learning-validation";

export async function gradeQuiz(formData: FormData) {
  const slug = formData.get("slug") as string;
  const quizId = formData.get("quiz_id") as string;
  const courseId = formData.get("course_id") as string;
  if(!safeCourseSlug(slug))throw new Error("Curso inválido.");

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();

  const {data:course}=await admin.from("courses").select("id").eq("id",courseId).eq("slug",slug).maybeSingle();
  if(!course||!(await canAccessCourse(admin,user.id,courseId)))redirect(`/cursos/${slug}`);

  const { data: quiz } = await admin.from("quizzes").select("pass_score, max_attempts, cooldown_hours").eq("id", quizId).eq("course_id",courseId).eq("published",true).maybeSingle();
  if (!quiz) redirect(`/aprender/${slug}`);

  // controle de tentativas / cooldown
  const { data: attempts,error:attemptError } = await admin.from("quiz_attempts").select("created_at, passed").eq("user_id", user.id).eq("quiz_id", quizId).order("created_at", { ascending: false });
  if(attemptError)throw new Error("Não foi possível validar as tentativas anteriores.");
  const list = attempts ?? [];
  const alreadyPassed = list.some((a: any) => a.passed);
  if (!alreadyPassed && list.length >= quiz.max_attempts && quiz.cooldown_hours > 0) {
    const last = new Date(list[0].created_at).getTime();
    const wait = quiz.cooldown_hours * 3600 * 1000;
    if (Date.now() - last < wait) redirect(`/aprender/${slug}/avaliacao?blocked=1`);
  }

  // correção
  const { data: questions,error:questionError } = await admin.from("quiz_questions").select("id, options").eq("quiz_id", quizId);
  const qs = questions ?? [];
  if(questionError||!qs.length)throw new Error("A avaliação ainda não possui questões disponíveis.");
  const answers: Record<string, number> = {};
  let correct = 0;
  for (const q of qs) {
    const picked = selectedAnswer(formData.get(`q_${q.id}`));
    answers[q.id] = picked;
    const opts = (q.options as any[]) || [];
    if (opts[picked]?.correct) correct++;
  }
  const score = qs.length ? Math.round((correct / qs.length) * 100) : 0;
  const passed = score >= quiz.pass_score;

  const { data: att,error:saveError } = await admin.from("quiz_attempts").insert({
    user_id: user.id, quiz_id: quizId, course_id: courseId, score, passed, answers,
  }).select("id").single();
  if(saveError||!att)throw new Error("Não foi possível registrar a avaliação. Tente novamente.");

  redirect(`/aprender/${slug}/avaliacao?attempt=${att?.id ?? ""}`);
}
