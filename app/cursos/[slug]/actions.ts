"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function enrollFree(formData: FormData) {
  const slug = formData.get("slug") as string;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  const { data: course } = await admin
    .from("courses")
    .select("id, price, published")
    .eq("slug", slug)
    .maybeSingle();

  if (!course || !course.published) redirect("/cursos");
  // Cursos pagos ainda não têm checkout — matrícula automática só nos gratuitos.
  if (Number(course.price) > 0) redirect(`/cursos/${slug}`);

  await admin
    .from("enrollments")
    .upsert({ user_id: user.id, course_id: course.id, source: "free" }, { onConflict: "user_id,course_id" });

  redirect(`/aprender/${slug}`);
}
