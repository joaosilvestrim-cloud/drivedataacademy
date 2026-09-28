import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { universoDoPortfolio } from "@/lib/knowledge/publico";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Universo 4D público de um aluno, pelo slug do portfólio.

   Separado da página de propósito: a página carrega leve, com o site do
   aluno, e o universo só é calculado quando o visitante abre o botão. Montar
   um ano de fotos mensais custa, e a maioria dos visitantes talvez nem abra.

   Só responde para site publicado, não bloqueado e com o universo ligado
   pelo aluno. Fora disso, 404, sem dizer qual das três condições falhou. */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const admin = createAdminClient();
  const { data: site } = await admin
    .from("portfolio_sites")
    .select("user_id, publicado, bloqueado, mostrar_universo")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!site || !site.publicado || site.bloqueado || !site.mostrar_universo) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  /* Camada do portfólio: a constelação sai dos projetos do aluno, não do
     histórico de estudo. Ver lib/knowledge/publico.ts. */
  const universo = await universoDoPortfolio(admin, site.user_id);
  if (!universo || !universo.quadros.length) return NextResponse.json({ vazio: true }, { status: 200 });

  // Cinco minutos de cache na borda: o aluno que acabou de cadastrar um
  // projeto quer ver a esfera acender logo, não daqui a uma hora.
  return NextResponse.json(universo, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" },
  });
}
