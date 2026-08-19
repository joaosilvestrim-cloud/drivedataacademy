"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccessCourse } from "@/lib/access";

export async function issueCertificate(formData: FormData) {
  const courseId = formData.get("course_id") as string;
  const slug = formData.get("slug") as string;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();

  // Precisa ter acesso (matrícula ou acesso full).
  if (!(await canAccessCourse(admin, user.id, courseId))) redirect(`/cursos/${slug}`);

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

  // Já emitido? reaproveita (só o certificado do curso, module_id nulo).
  const { data: existing } = await admin.from("certificates").select("code").eq("user_id", user.id).eq("course_id", courseId).is("module_id", null).maybeSingle();
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

// Certificado de conclusão de um módulo específico.
export async function issueModuleCertificate(formData: FormData) {
  const courseId = formData.get("course_id") as string;
  const moduleId = formData.get("module_id") as string;
  const slug = formData.get("slug") as string;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  if (!(await canAccessCourse(admin, user.id, courseId))) redirect(`/cursos/${slug}`);

  // O módulo precisa ser do curso e ter aulas.
  const { data: mod } = await admin.from("course_modules").select("id, title").eq("id", moduleId).eq("course_id", courseId).maybeSingle();
  if (!mod) redirect(`/aprender/${slug}`);

  const { data: modLessons } = await admin.from("lessons").select("id").eq("module_id", moduleId);
  const lessonIds = (modLessons ?? []).map((l: any) => l.id);
  if (lessonIds.length === 0) redirect(`/aprender/${slug}`);

  // Todas as aulas do módulo concluídas?
  const { count: done } = await admin
    .from("lesson_progress")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("completed", true)
    .in("lesson_id", lessonIds);
  if ((done ?? 0) < lessonIds.length) redirect(`/aprender/${slug}`);

  // Já emitido para este módulo? reaproveita.
  const { data: existing } = await admin.from("certificates").select("code").eq("user_id", user.id).eq("module_id", moduleId).maybeSingle();
  if (existing) redirect(`/certificado/${existing.code}`);

  const [{ data: course }, { data: profile }] = await Promise.all([
    admin.from("courses").select("title").eq("id", courseId).maybeSingle(),
    admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);

  const code = "DDA-" + randomBytes(4).toString("hex").toUpperCase();
  await admin.from("certificates").insert({
    user_id: user.id,
    course_id: courseId,
    module_id: moduleId,
    code,
    student_name: profile?.full_name || (user.user_metadata as any)?.full_name || user.email,
    course_title: `${course?.title || ""} — ${mod.title}`.trim(),
    workload: null,
  });

  redirect(`/certificado/${code}`);
}
