"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function admin() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return createAdminClient();
}
const refresh = (id: string) => revalidatePath(`/admin/cursos/${id}`);

function buildOptions(formData: FormData) {
  const correct = formData.get("correct") as string;
  const opts: { text: string; correct: boolean }[] = [];
  for (let i = 0; i < 4; i++) {
    const t = ((formData.get(`opt${i}`) as string) || "").trim();
    if (t) opts.push({ text: t, correct: String(i) === correct });
  }
  return opts;
}

export async function createQuiz(formData: FormData) {
  const supabase = await admin();
  const course_id = formData.get("course_id") as string;
  await supabase.from("quizzes").upsert({ course_id }, { onConflict: "course_id" });
  refresh(course_id);
}

export async function saveQuizSettings(formData: FormData) {
  const supabase = await admin();
  const course_id = formData.get("course_id") as string;
  await supabase.from("quizzes").update({
    title: (formData.get("title") as string).trim() || "Avaliação final",
    pass_score: Number(formData.get("pass_score")) || 70,
    max_attempts: Number(formData.get("max_attempts")) || 3,
    cooldown_hours: Number(formData.get("cooldown_hours")) || 0,
  }).eq("id", formData.get("quiz_id") as string);
  refresh(course_id);
}

export async function deleteQuiz(formData: FormData) {
  const supabase = await admin();
  const course_id = formData.get("course_id") as string;
  await supabase.from("quizzes").delete().eq("id", formData.get("quiz_id") as string);
  refresh(course_id);
}

export async function addQuestion(formData: FormData) {
  const supabase = await admin();
  const quiz_id = formData.get("quiz_id") as string;
  const course_id = formData.get("course_id") as string;
  const { count } = await supabase.from("quiz_questions").select("*", { count: "exact", head: true }).eq("quiz_id", quiz_id);
  await supabase.from("quiz_questions").insert({
    quiz_id,
    prompt: (formData.get("prompt") as string).trim(),
    options: buildOptions(formData),
    position: count ?? 0,
  });
  refresh(course_id);
}

export async function saveQuestion(formData: FormData) {
  const supabase = await admin();
  const course_id = formData.get("course_id") as string;
  await supabase.from("quiz_questions").update({
    prompt: (formData.get("prompt") as string).trim(),
    options: buildOptions(formData),
  }).eq("id", formData.get("id") as string);
  refresh(course_id);
}

export async function deleteQuestion(formData: FormData) {
  const supabase = await admin();
  const course_id = formData.get("course_id") as string;
  await supabase.from("quiz_questions").delete().eq("id", formData.get("id") as string);
  refresh(course_id);
}
