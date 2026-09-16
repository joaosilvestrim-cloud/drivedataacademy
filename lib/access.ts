import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Tem assinatura ativa? Dá comunidade, lives, gravações e o preço de assinante nos treinamentos.
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

/* Pode abrir as aulas deste curso?

   Só a matrícula abre treinamento: compra do assinante, curso incluso na
   assinatura, cortesia do time ou turma. A assinatura sozinha não abre curso.
   A origem "free", do tempo do cadastro aberto, continua sem abrir nada. */
export async function canAccessCourse(admin: SupabaseClient, userId: string, courseId: string): Promise<boolean> {
  const { data: enr } = await admin
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .neq("source", "free")
    .maybeSingle();
  if (enr) return true;
  // Curso incluso na assinatura (preço de assinante 0): assinante ativo entra
  // direto, sem precisar clicar em liberar. Os cursos pagos seguem exigindo compra.
  const { data: curso } = await admin.from("courses").select("subscriber_price, access_mode").eq("id", courseId).maybeSingle();
  // Turma fechada de empresa: nem assinatura nem compra abrem, só matrícula.
  if (curso?.access_mode === "in_company") return false;
  if (curso && curso.subscriber_price != null && Number(curso.subscriber_price) === 0) return hasFullAccess(admin, userId);
  return false;
}
