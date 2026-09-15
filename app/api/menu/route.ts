import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Estado dos itens do menu público que podem ficar "em breve". Ligado e
// desligado em Admin > Vendas > Assinatura. Cache de 60 s; salvar no admin
// revalida na hora.
export const revalidate = 60;

export async function GET() {
  let assinaturaAberta = false;
  try {
    const { data } = await createAdminClient().from("site_settings").select("value").eq("key", "menu_assinatura_aberta").maybeSingle();
    assinaturaAberta = data?.value === "1";
  } catch { /* sem leitura: fica em breve */ }
  return NextResponse.json({ assinaturaAberta });
}
