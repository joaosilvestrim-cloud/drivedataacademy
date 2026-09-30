import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/* Aprovação do portfólio pelo time.

   Ligada (padrão), o projeto enviado entra na fila e só vai para a vitrine
   quando alguém aprova. Desligada, o projeto sai publicado na hora: serve
   para fases em que a turma precisa publicar à vontade (aula ao vivo,
   lançamento). A chave mora em site_settings e muda em Admin > Portfólio. */
export const CHAVE_APROVACAO = "portfolio_aprovacao";

export async function aprovacaoLigada(admin: SupabaseClient): Promise<boolean> {
  const { data } = await admin.from("site_settings").select("value").eq("key", CHAVE_APROVACAO).maybeSingle();
  return (data?.value ?? "on") !== "off";
}
