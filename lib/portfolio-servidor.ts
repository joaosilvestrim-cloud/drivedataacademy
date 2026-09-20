import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Projeto } from "./portfolio";

/* A leitura da vitrine, em um lugar só. Fora daqui o lib/portfolio é puro e
   pode ser importado pela tela. */

/** Projetos publicados, na ordem da vitrine: destaque primeiro, depois os mais novos. */
export async function vitrine(admin: SupabaseClient, opcoes: { publico?: boolean; limite?: number } = {}) {
  let q = admin
    .from("portfolio_projects")
    .select("*")
    .eq("status", "aprovado")
    .order("destaque", { ascending: false })
    .order("aprovado_em", { ascending: false })
    .limit(opcoes.limite ?? 60);
  if (opcoes.publico) q = q.eq("publico", true);
  const { data, error } = await q;
  if (error) return { projetos: [] as Projeto[], erro: error.message };
  return { projetos: (data ?? []) as Projeto[], erro: null as string | null };
}
