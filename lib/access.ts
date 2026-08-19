import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Tem acesso full ativo (uma compra libera todos os cursos)?
export async function hasFullAccess(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await admin
    .from("memberships")
    .select("expires_at")
    .eq("user_id", userId)
    .eq("status", "active");
  if (!data?.length) return false;
  const now = Date.now();
  return data.some((m: any) => !m.expires_at || new Date(m.expires_at).getTime() > now);
}

// Pode acessar este curso? (matriculado OU acesso full)
export async function canAccessCourse(admin: SupabaseClient, userId: string, courseId: string): Promise<boolean> {
  const { data: enr } = await admin
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (enr) return true;
  return hasFullAccess(admin, userId);
}
