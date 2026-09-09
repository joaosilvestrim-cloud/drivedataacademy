"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canCompleteLesson } from "@/lib/learning-access";
import { safeCourseSlug, validCompletionPercent } from "@/lib/learning-validation";

export async function markComplete(formData: FormData) {
  const slug = formData.get("slug") as string;
  const lessonId = formData.get("lesson_id") as string;
  const courseId = formData.get("course_id") as string;
  const nextLesson = (formData.get("next_lesson") as string) || "";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  if (!(await canCompleteLesson(user.id,courseId,lessonId,slug))) throw new Error("Não foi possível validar seu acesso a esta aula.");

  const admin = createAdminClient();
  const {error} = await admin
    .from("lesson_progress")
    .upsert(
      { user_id: user.id, lesson_id: lessonId, course_id: courseId, completed: true, updated_at: new Date().toISOString() },
      { onConflict: "user_id,lesson_id" }
    );
  if(error)throw new Error("Não foi possível salvar o progresso. Tente novamente.");

  revalidatePath(`/aprender/${slug}`);
  redirect(`/aprender/${slug}?l=${encodeURIComponent(nextLesson||lessonId)}`);
}

// Comentário de aula (entra como pendente e vai para moderação no admin).
export async function addComment(formData: FormData) {
  const slug = formData.get("slug") as string;
  const lessonId = formData.get("lesson_id") as string;
  const courseId = formData.get("course_id") as string;
  const body = ((formData.get("body") as string) || "").trim();
  if (!body) redirect(`/aprender/${slug}?l=${lessonId}`);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  await admin.from("lesson_comments").insert({ lesson_id: lessonId, course_id: courseId, user_id: user.id, body: body.slice(0, 2000), status: "pending" });
  revalidatePath(`/aprender/${slug}`);
  redirect(`/aprender/${slug}?l=${lessonId}&c=ok`);
}

// Avaliação por estrelas do curso (1 a 5). Um por aluno.
export async function rateCourse(courseId: string, stars: number): Promise<{ ok: boolean }> {
  const s = Math.max(1, Math.min(5, Math.round(stars)));
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const admin = createAdminClient();
  await admin.from("course_ratings").upsert({ course_id: courseId, user_id: user.id, stars: s }, { onConflict: "course_id,user_id" });
  return { ok: true };
}

// NPS do curso (0 a 10 + comentário). Um por aluno por curso.
export async function submitNps(formData: FormData) {
  const slug = formData.get("slug") as string;
  const courseId = formData.get("course_id") as string;
  const score = Math.max(0, Math.min(10, Number(formData.get("score") || "-1")));
  if (score < 0) redirect(`/aprender/${slug}`);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  await admin.from("course_nps").upsert(
    { course_id: courseId, user_id: user.id, score, comment: ((formData.get("comment") as string) || "").trim() || null },
    { onConflict: "course_id,user_id" }
  );
  revalidatePath(`/aprender/${slug}`);
  redirect(`/aprender/${slug}?nps=ok`);
}

// Marca a aula como concluída sem redirecionar (usado pelo progresso automático do Panda).
export async function markLessonDone(lessonId: string, courseId: string, slug: string, pct = 100) {
  if(!safeCourseSlug(slug)||!validCompletionPercent(pct))return {ok:false,error:"Percentual inválido."};
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  if(!(await canCompleteLesson(user.id,courseId,lessonId,slug)))return {ok:false,error:"Aula ou acesso inválido."};

  const admin = createAdminClient();
  const {error}=await admin.from("lesson_progress").upsert(
    { user_id: user.id, lesson_id: lessonId, course_id: courseId, completed: true, pct, updated_at: new Date().toISOString() },
    { onConflict: "user_id,lesson_id" }
  );
  if(error)return {ok:false,error:"Não foi possível salvar o progresso."};
  revalidatePath(`/aprender/${slug}`);
  return { ok: true };
}
