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
