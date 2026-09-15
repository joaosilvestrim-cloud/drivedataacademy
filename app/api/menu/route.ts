import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Estado dos itens do menu público que podem ficar "em breve". Ligado e
// desligado em Admin > Vendas > Assinatura. A rota lê o banco a cada chamada
// (sem cache do Next, que prendia valores antigos) e a CDN guarda por 30 s.
export const dynamic = "force-dynamic";

export async function GET() {
  let assinaturaAberta = false;
  try {
    const { data } = await createAdminClient().from("site_settings").select("value").eq("key", "menu_assinatura_aberta").maybeSingle();
    assinaturaAberta = data?.value === "1";
  } catch { /* sem leitura: fica em breve */ }
  return NextResponse.json({ assinaturaAberta }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" } });
}
