"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function issueCertificate(formData: FormData) {
  const courseId = formData.get("course_id") as string;
  const slug = formData.get("slug") as string;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();

  // Precisa estar matriculado.
  const { data: enr } = await admin.from("enrollments").select("id").eq("user_id", user.id).eq("course_id", courseId).maybeSingle();
  if (!enr) redirect(`/cursos/${slug}`);

  // Precisa ter 100% de conclusão.
  const [{ count: total }, { count: done }] = await Promise.all([
    admin.from("lessons").select("*", { count: "exact", head: true }).eq("course_id", courseId),
    admin.from("lesson_progress").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("course_id", courseId).eq("completed", true),
  ]);
  if (!total || (done ?? 0) < total) redirect(`/aprender/${slug}`);

  // Se o curso tem avaliação, exige aprovação antes do certificado.
  const { data: quiz } = await admin.from("quizzes").select("id").eq("course_id", courseId).eq("published", true).maybeSingle();
  if (quiz) {
    const { data: passed } = await admin.from("quiz_attempts").select("id").eq("user_id", user.id).eq("quiz_id", quiz.id).eq("passed", true).maybeSingle();
    if (!passed) redirect(`/aprender/${slug}/avaliacao`);
  }

  // Já emitido? reaproveita.
  const { data: existing } = await admin.from("certificates").select("code").eq("user_id", user.id).eq("course_id", courseId).maybeSingle();
  if (existing) redirect(`/certificado/${existing.code}`);

  const [{ data: course }, { data: profile }] = await Promise.all([
    admin.from("courses").select("title, workload").eq("id", courseId).maybeSingle(),
    admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);

  const code = "DDA-" + randomBytes(4).toString("hex").toUpperCase();
  await admin.from("certificates").insert({
    user_id: user.id,
    course_id: courseId,
    code,
    student_name: profile?.full_name || (user.user_metadata as any)?.full_name || user.email,
    course_title: course?.title || "",
    workload: course?.workload || null,
  });

  redirect(`/certificado/${code}`);
}
