import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/* Acesso de demonstração.

   A pessoa entra com login próprio e vê a área do aluno exatamente como um
   assinante vê: menu, cursos, comunidade, agenda, ranking. Nada ali responde a
   clique, e o que é conteúdo pago (aula e gravação) nem abre, mesmo digitando o
   endereço. A única coisa liberada de verdade é o DriveCanvas.

   Por isso a demonstração não entra em hasFullAccess: aquela função decide
   preço de assinante e compra, e quem está testando não é assinante. Ela entra
   só nos portões de "ver" (comunidade, agenda, início) e no da ferramenta. */

/** Data de fim da demonstração, se ela estiver valendo agora. */
export async function demoAte(admin: SupabaseClient, userId: string): Promise<string | null> {
  try {
    const { data } = await admin
      .from("demo_access")
      .select("expires_at")
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    return (data as any)?.expires_at ?? null;
  } catch {
    return null;
  }
}

/** A mesma pergunta, memorizada por requisição para layout e página. */
export const demoAtual = cache(async (userId: string) => demoAte(createAdminClient(), userId));
