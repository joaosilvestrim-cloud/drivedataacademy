"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const admin = createAdminClient();
  await admin
    .from("lesson_progress")
    .upsert(
      { user_id: user.id, lesson_id: lessonId, course_id: courseId, completed: true, updated_at: new Date().toISOString() },
      { onConflict: "user_id,lesson_id" }
    );

  revalidatePath(`/aprender/${slug}`);
  redirect(`/aprender/${slug}${nextLesson ? `?l=${nextLesson}` : `?l=${lessonId}`}`);
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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const admin = createAdminClient();
  await admin.from("lesson_progress").upsert(
    { user_id: user.id, lesson_id: lessonId, course_id: courseId, completed: true, pct, updated_at: new Date().toISOString() },
    { onConflict: "user_id,lesson_id" }
  );
  revalidatePath(`/aprender/${slug}`);
  return { ok: true };
}
