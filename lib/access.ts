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

/* Pode abrir as aulas deste curso?

   Assinatura ativa libera tudo. Fora dela, vale a matrícula de origem
   deliberada: cortesia do time, compra avulsa ou turma. Só a origem "free", do
   tempo do cadastro aberto, deixou de abrir alguma coisa, porque hoje todo o
   conteúdo está dentro da assinatura. */
export async function canAccessCourse(admin: SupabaseClient, userId: string, courseId: string): Promise<boolean> {
  if (await hasFullAccess(admin, userId)) return true;
  const { data: enr } = await admin
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .neq("source", "free")
    .maybeSingle();
  return !!enr;
}
