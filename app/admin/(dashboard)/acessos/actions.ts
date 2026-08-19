"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAccessGrantedEmail } from "@/lib/email";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");

async function findUserByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  const target = email.trim().toLowerCase();
  let page = 1;
  // varre em lotes de 1000 até achar (base pequena no lançamento)
  for (let i = 0; i < 10; i++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const users = data?.users ?? [];
    const found = users.find((u: any) => (u.email || "").toLowerCase() === target);
    if (found) return found;
    if (users.length < 1000) break;
    page++;
  }
  return null;
}

export async function grantFullAccess(formData: FormData) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  const email = ((formData.get("email") as string) || "").trim();
  const term = (formData.get("term") as string) || "none"; // none | 1y | 6m
  if (!email) redirect("/admin/acessos?error=" + encodeURIComponent("Informe um e-mail."));

  const admin = createAdminClient();
  const target = await findUserByEmail(admin, email);
  if (!target) {
    redirect("/admin/acessos?error=" + encodeURIComponent("Nenhum aluno com esse e-mail. Ele precisa criar a conta primeiro."));
  }

  let expires_at: string | null = null;
  if (term === "1y") expires_at = new Date(Date.now() + 365 * 864e5).toISOString();
  if (term === "6m") expires_at = new Date(Date.now() + 182 * 864e5).toISOString();

  const { error } = await admin.from("memberships").insert({
    user_id: target!.id,
    plan: "full",
    status: "active",
    source: "admin",
    expires_at,
  });
  if (error) redirect("/admin/acessos?error=" + encodeURIComponent(error.message));

  // selo de Fundador (1ª turma). Não duplica.
  await admin.from("user_badges").upsert({ user_id: target!.id, badge: "fundador" }, { onConflict: "user_id,badge" });

  // boas-vindas (silencioso se o Resend não estiver configurado)
  const name = (target!.user_metadata?.full_name as string) || "";
  await sendAccessGrantedEmail(target!.email || email, name, SITE_URL);

  revalidatePath("/admin/acessos");
  redirect("/admin/acessos?ok=" + encodeURIComponent("Acesso liberado para " + email));
}

export async function revokeMembership(formData: FormData) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  const id = formData.get("id") as string;
  const admin = createAdminClient();
  await admin.from("memberships").update({ status: "canceled" }).eq("id", id);
  revalidatePath("/admin/acessos");
  redirect("/admin/acessos?ok=" + encodeURIComponent("Acesso revogado."));
}

export async function reactivateMembership(formData: FormData) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  const id = formData.get("id") as string;
  const admin = createAdminClient();
  await admin.from("memberships").update({ status: "active" }).eq("id", id);
  revalidatePath("/admin/acessos");
  redirect("/admin/acessos?ok=" + encodeURIComponent("Acesso reativado."));
}
