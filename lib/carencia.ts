import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calcularCarencia, type Liberacao } from "./carencia-core";
export { DIAS_CARENCIA, type Liberacao } from "./carencia-core";

/* Carência dos materiais.

   Assinou, já vê a biblioteca inteira: capa, nome e descrição de cada arquivo.
   Baixar só depois de sete dias de assinatura. A regra existe para o download
   não virar o motivo de assinar por um dia e cancelar.

   Quem entrou por matrícula do time, compra avulsa ou turma não passa pela
   carência: ali o acesso foi combinado de outro jeito. Administrador também
   espera, para o time ver a mesma tela que o aluno vê. */

export async function liberacaoDeMateriais(
  admin: SupabaseClient,
  userId: string,
  courseId: string,
  _email?: string | null
): Promise<Liberacao> {
  const { data: matricula } = await admin
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .neq("source", "free")
    .maybeSingle();
  if (matricula) return { liberado: true, liberaEm: null };

  // Vale a assinatura mais antiga: quem renova não recomeça a espera.
  const { data: assinaturas } = await admin
    .from("memberships")
    .select("status, starts_at, expires_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("starts_at");

  return calcularCarencia(assinaturas ?? [],false,Date.now());
}
