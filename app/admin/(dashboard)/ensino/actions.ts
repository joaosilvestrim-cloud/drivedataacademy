"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function findUserByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  const target = email.trim().toLowerCase();
  let page = 1;
  for (let i = 0; i < 5; i++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const users = data?.users ?? [];
    const found = users.find((u: any) => (u.email || "").toLowerCase() === target);
    if (found) return found;
    if (users.length < 1000) break;
    page++;
  }
  return null;
}

// Concede um selo (badge) para um aluno por e-mail.
export async function grantBadge(formData: FormData) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  const email = ((formData.get("email") as string) || "").trim();
  const badge = ((formData.get("badge") as string) || "").trim() || "top";
  const admin = createAdminClient();
  const target = await findUserByEmail(admin, email);
  if (!target) redirect("/admin/ensino?error=" + encodeURIComponent("Aluno não encontrado: " + email));
  await admin.from("user_badges").upsert({ user_id: target.id, badge }, { onConflict: "user_id,badge" });
  revalidatePath("/admin/ensino");
  redirect("/admin/ensino?ok=" + encodeURIComponent("Selo concedido a " + email));
}
