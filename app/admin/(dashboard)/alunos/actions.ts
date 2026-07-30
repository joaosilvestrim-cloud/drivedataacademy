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

// Matricular aluno manualmente (cortesia).
export async function enrollStudent(formData: FormData) {
  const supabase = await admin();
  const user_id = formData.get("user_id") as string;
  const course_id = formData.get("course_id") as string;
  if (course_id) {
    await supabase.from("enrollments").upsert(
      { user_id, course_id, source: "admin" },
      { onConflict: "user_id,course_id" }
    );
  }
  revalidatePath(`/admin/alunos/${user_id}`);
}

// Remover acesso (desmatricular).
export async function unenrollStudent(formData: FormData) {
  const supabase = await admin();
  const user_id = formData.get("user_id") as string;
  const course_id = formData.get("course_id") as string;
  await supabase.from("enrollments").delete().eq("user_id", user_id).eq("course_id", course_id);
  revalidatePath(`/admin/alunos/${user_id}`);
}
