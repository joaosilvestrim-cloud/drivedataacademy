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

export async function setCommentStatus(formData: FormData) {
  const supabase = await admin();
  const id = formData.get("id") as string;
  const status = (formData.get("status") as string) || "approved";
  await supabase.from("lesson_comments").update({ status }).eq("id", id);
  revalidatePath("/admin/comentarios");
}

export async function deleteComment(formData: FormData) {
  const supabase = await admin();
  await supabase.from("lesson_comments").delete().eq("id", formData.get("id") as string);
  revalidatePath("/admin/comentarios");
}

// Responde o comentário (aparece para o aluno na aula). Aprova junto, para o par pergunta/resposta ficar visível.
export async function replyComment(formData: FormData) {
  const supabase = await admin();
  const id = formData.get("id") as string;
  const reply = ((formData.get("reply") as string) || "").trim();
  await supabase
    .from("lesson_comments")
    .update({
      admin_reply: reply || null,
      replied_at: reply ? new Date().toISOString() : null,
      ...(reply ? { status: "approved" } : {}),
    })
    .eq("id", id);
  revalidatePath("/admin/comentarios");
}
