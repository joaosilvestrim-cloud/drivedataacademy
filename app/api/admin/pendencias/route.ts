import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { contarPendencias, marcarVisto } from "@/lib/admin-pendencias";

export const dynamic = "force-dynamic";

// Contagens do menu do admin. O menu consulta aqui de tempos em tempos para
// avisar de chamado novo sem precisar recarregar a página.
export async function GET(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();

  /* O menu manda em qual tela a pessoa está. Marcar como vista aqui, e não em
     cada página, faz o badge de movimentação apagar sozinho no momento em que
     alguém abre a tela, sem precisar lembrar de chamar nada em 40 telas. */
  const em = new URL(req.url).searchParams.get("em") || "";
  if (/^\/admin(\/[a-z0-9-]+)*$/.test(em)) await marcarVisto(admin, user.id, em);

  const pendencias = await contarPendencias(admin, user.id);
  return NextResponse.json(pendencias, { headers: { "Cache-Control": "no-store" } });
}
