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

// Cria a conta do aluno na mão (para vendas fechadas, cortesias, migração).
export async function createStudent(formData: FormData) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  const name = ((formData.get("name") as string) || "").trim();
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  let password = ((formData.get("password") as string) || "").trim();
  if (!email) redirect("/admin/acessos?error=" + encodeURIComponent("Informe o e-mail do aluno."));

  const generated = !password;
  if (generated) password = "Dd" + Math.random().toString(36).slice(2, 9) + "!9";

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error) redirect("/admin/acessos?error=" + encodeURIComponent(error.message));
  if (data.user) await admin.from("profiles").upsert({ id: data.user.id, full_name: name }, { onConflict: "id" });

  revalidatePath("/admin/acessos");
  const msg = `Aluno criado: ${email}` + (generated ? ` · senha temporária: ${password}` : "");
  redirect("/admin/acessos?ok=" + encodeURIComponent(msg));
}

// Libera acesso instantâneo a cursos específicos (matrícula direta, sem acesso full).
export async function grantCourses(formData: FormData) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  const email = ((formData.get("email") as string) || "").trim();
  const ids = (formData.getAll("course_ids") as string[]).filter(Boolean);
  if (!email) redirect("/admin/acessos?error=" + encodeURIComponent("Informe o e-mail do aluno."));
  if (!ids.length) redirect("/admin/acessos?error=" + encodeURIComponent("Selecione ao menos um treinamento."));

  const admin = createAdminClient();
  const target = await findUserByEmail(admin, email);
  if (!target) redirect("/admin/acessos?error=" + encodeURIComponent("Nenhum aluno com esse e-mail. Crie a conta primeiro."));

  const { data: existing } = await admin.from("enrollments").select("course_id").eq("user_id", target!.id).in("course_id", ids);
  const have = new Set((existing ?? []).map((e: any) => e.course_id));
  const toAdd = ids.filter((c) => !have.has(c)).map((course_id) => ({ user_id: target!.id, course_id }));
  if (toAdd.length) {
    const { error } = await admin.from("enrollments").insert(toAdd);
    if (error) redirect("/admin/acessos?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/admin/acessos");
  redirect("/admin/acessos?ok=" + encodeURIComponent(`Liberado ${ids.length} treinamento(s) para ${email} na hora.`));
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
