import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Offer = {
  id?: string;
  kind: string; // full_access | bundle | course
  course_id?: string | null;
  course_ids?: string | null; // csv (bundle)
  access_days?: number | null;
};

export function offerCourseIds(offer: Offer): string[] {
  if (offer.kind === "bundle") return (offer.course_ids || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (offer.kind === "course") return offer.course_id ? [offer.course_id] : [];
  return [];
}

// Concede o acesso de uma oferta para um usuário.
// full_access -> membership (todos os cursos). bundle/course -> matrículas nos cursos.
export async function grantOffer(admin: SupabaseClient, userId: string, offer: Offer, turmaId?: string | null): Promise<void> {
  if (offer.kind === "full_access") {
    const { data: active } = await admin.from("memberships").select("id").eq("user_id", userId).eq("status", "active").limit(1);
    if (active?.length) return; // já tem acesso full
    const expires = offer.access_days ? new Date(Date.now() + offer.access_days * 864e5).toISOString() : null;
    await admin.from("memberships").insert({ user_id: userId, plan: "full", status: "active", source: "turma", turma_id: turmaId ?? null, expires_at: expires });
    return;
  }
  // bundle / course -> matrículas
  const ids = offerCourseIds(offer);
  if (!ids.length) return;
  const { data: existing } = await admin.from("enrollments").select("course_id").eq("user_id", userId).in("course_id", ids);
  const have = new Set((existing ?? []).map((e: any) => e.course_id));
  const toAdd = ids.filter((c) => !have.has(c)).map((course_id) => ({ user_id: userId, course_id }));
  if (toAdd.length) await admin.from("enrollments").insert(toAdd);
}
