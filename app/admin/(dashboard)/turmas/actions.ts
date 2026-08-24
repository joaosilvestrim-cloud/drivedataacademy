"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAccessGrantedEmail } from "@/lib/email";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");

async function admin() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return createAdminClient();
}

export async function createTurma(formData: FormData) {
  const supabase = await admin();
  const name = ((formData.get("name") as string) || "").trim();
  if (!name) redirect("/admin/turmas");
  const { data } = await supabase.from("turmas").insert({
    name,
    starts_at: ((formData.get("starts_at") as string) || "").trim() || null,
    access_days: Number((formData.get("access_days") as string) || "0") || null,
    price: Number(((formData.get("price") as string) || "").replace(",", ".")) || null,
    status: "open",
  }).select("id").single();
  revalidatePath("/admin/turmas");
  redirect(`/admin/turmas/${data?.id ?? ""}`);
}

export async function updateTurma(formData: FormData) {
  const supabase = await admin();
  const id = formData.get("id") as string;
  await supabase.from("turmas").update({
    name: ((formData.get("name") as string) || "").trim(),
    starts_at: ((formData.get("starts_at") as string) || "").trim() || null,
    access_days: Number((formData.get("access_days") as string) || "0") || null,
    price: Number(((formData.get("price") as string) || "").replace(",", ".")) || null,
    status: (formData.get("status") as string) || "open",
    notes: ((formData.get("notes") as string) || "").trim() || null,
  }).eq("id", id);
  revalidatePath(`/admin/turmas/${id}`);
  redirect(`/admin/turmas/${id}?ok=Turma+salva`);
}

// Libera acesso full em lote para uma lista de e-mails.
export async function grantBatch(formData: FormData) {
  const supabase = await admin();
  const turmaId = formData.get("turma_id") as string;
  const raw = (formData.get("emails") as string) || "";
  const emails = Array.from(new Set(raw.split(/[\n,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean)));

  const { data: turma } = await supabase.from("turmas").select("id, access_days").eq("id", turmaId).maybeSingle();
  if (!turma) redirect("/admin/turmas");

  // mapa e-mail -> user_id (varre a base uma vez)
  const emailToId: Record<string, string> = {};
  let page = 1;
  for (let i = 0; i < 10; i++) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    const users = data?.users ?? [];
    for (const u of users) if (u.email) emailToId[u.email.toLowerCase()] = u.id;
    if (users.length < 1000) break;
    page++;
  }

  // acessos ativos existentes (para não duplicar)
  const { data: activeMem } = await supabase.from("memberships").select("user_id").eq("status", "active");
  const hasActive = new Set((activeMem ?? []).map((m: any) => m.user_id));

  const expires = turma.access_days ? new Date(Date.now() + turma.access_days * 864e5).toISOString() : null;

  let granted = 0, existed = 0;
  const missing: string[] = [];
  for (const email of emails) {
    const uid = emailToId[email];
    if (!uid) { missing.push(email); continue; }
    if (hasActive.has(uid)) { existed++; continue; }
    await supabase.from("memberships").insert({ user_id: uid, plan: "full", status: "active", source: "turma", turma_id: turmaId, expires_at: expires });
    await supabase.from("user_badges").upsert({ user_id: uid, badge: "fundador" }, { onConflict: "user_id,badge" });
    await sendAccessGrantedEmail(email, "", SITE_URL);
    granted++;
    hasActive.add(uid);
  }

  revalidatePath(`/admin/turmas/${turmaId}`);
  const q = new URLSearchParams({ granted: String(granted), existed: String(existed), missing: missing.slice(0, 30).join(",") });
  redirect(`/admin/turmas/${turmaId}?${q.toString()}`);
}

export async function revokeFromTurma(formData: FormData) {
  const supabase = await admin();
  const membershipId = formData.get("membership_id") as string;
  const turmaId = formData.get("turma_id") as string;
  await supabase.from("memberships").update({ status: "canceled" }).eq("id", membershipId);
  revalidatePath(`/admin/turmas/${turmaId}`);
}
