"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { pointsByUser } from "@/lib/community";

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

// Dá pontos extras (desafio) para um aluno. Entram no ranking.
export async function grantChallengePoints(formData: FormData) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  const email = ((formData.get("email") as string) || "").trim();
  const points = Math.round(Number(formData.get("points") || "0")) || 0;
  const reason = ((formData.get("reason") as string) || "Desafio").trim().slice(0, 120);
  if (points <= 0) redirect("/admin/ensino?error=" + encodeURIComponent("Informe uma pontuação válida."));
  const admin = createAdminClient();
  const target = await findUserByEmail(admin, email);
  if (!target) redirect("/admin/ensino?error=" + encodeURIComponent("Aluno não encontrado: " + email));
  await admin.from("point_events").insert({ user_id: target.id, kind: "challenge", points, meta: reason });
  revalidatePath("/admin/ensino");
  redirect("/admin/ensino?ok=" + encodeURIComponent(`+${points} pts (desafio) para ${email}`));
}

// Premia o 1º do ranking: assinatura grátis (30 dias) + selo "top". O desconto de 10%
// é aplicado manualmente na próxima compra (ainda não temos cupom automático no Asaas).
export async function awardRankingWinner() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  const admin = createAdminClient();
  const totals = await pointsByUser(admin);
  const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  if (!top) redirect("/admin/ensino?error=" + encodeURIComponent("Ranking ainda está vazio."));
  const [winnerId] = top;

  // já tem prêmio ativo? evita duplicar
  const { data: existing } = await admin.from("memberships").select("id, expires_at").eq("user_id", winnerId).eq("source", "premio").eq("status", "active").maybeSingle();
  const expires = new Date(Date.now() + 30 * 864e5).toISOString();
  if (existing) await admin.from("memberships").update({ expires_at: expires, status: "active" }).eq("id", existing.id);
  else await admin.from("memberships").insert({ user_id: winnerId, plan: "full", status: "active", source: "premio", expires_at: expires });
  await admin.from("user_badges").upsert({ user_id: winnerId, badge: "top" }, { onConflict: "user_id,badge" });

  const { data: prof } = await admin.from("profiles").select("full_name").eq("id", winnerId).maybeSingle();
  revalidatePath("/admin/ensino");
  redirect("/admin/ensino?ok=" + encodeURIComponent(`Prêmio concedido a ${prof?.full_name || "1º lugar"}: assinatura grátis por 30 dias + selo Top. (Aplique os 10% de desconto na próxima compra dele.)`));
}
