import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasFullAccess } from "@/lib/access";

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const allow = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return allow.includes(email.toLowerCase());
}

// Pode usar a comunidade quem é admin, tem acesso full, ou está matriculado em algum curso.
export async function canUseCommunity(admin: SupabaseClient, userId: string, email?: string | null): Promise<boolean> {
  if (isAdminEmail(email)) return true;
  if (await hasFullAccess(admin, userId)) return true;
  const { data } = await admin.from("enrollments").select("id").eq("user_id", userId).limit(1);
  return !!data?.length;
}

// Badge do selo por nome (para exibição).
export const BADGE_LABELS: Record<string, string> = {
  fundador: "Fundador",
  top: "Top do ranking",
};

// Nomes (sem e-mail, por privacidade) e badges de um conjunto de alunos.
export async function loadProfiles(admin: SupabaseClient, ids: string[]) {
  const uniq = Array.from(new Set(ids)).filter(Boolean);
  const nameById: Record<string, string> = {};
  const badgeById: Record<string, string[]> = {};
  if (uniq.length === 0) return { nameById, badgeById };
  const [{ data: profs }, { data: badges }] = await Promise.all([
    admin.from("profiles").select("id, full_name").in("id", uniq),
    admin.from("user_badges").select("user_id, badge").in("user_id", uniq),
  ]);
  for (const p of profs ?? []) nameById[p.id] = (p.full_name || "").trim();
  for (const b of badges ?? []) (badgeById[b.user_id] ||= []).push(b.badge);
  return { nameById, badgeById };
}

export function displayName(nameById: Record<string, string>, id: string): string {
  return nameById[id] || "Aluno";
}

// Pontos totais por usuário: eventos (solução = 10) + curtidas no chat (2 por curtida de outra pessoa).
export async function pointsByUser(admin: SupabaseClient): Promise<Record<string, number>> {
  const [{ data: events }, { data: reacts }, { data: msgs }] = await Promise.all([
    admin.from("point_events").select("user_id, points"),
    admin.from("message_reactions").select("message_id, user_id"),
    admin.from("channel_messages").select("id, user_id"),
  ]);
  const totals: Record<string, number> = {};
  for (const e of events ?? []) totals[e.user_id] = (totals[e.user_id] || 0) + (e.points || 0);
  const author: Record<string, string> = {};
  for (const m of msgs ?? []) author[m.id] = m.user_id;
  for (const r of reacts ?? []) {
    const a = author[r.message_id];
    if (a && a !== r.user_id) totals[a] = (totals[a] || 0) + 2;
  }
  return totals;
}
