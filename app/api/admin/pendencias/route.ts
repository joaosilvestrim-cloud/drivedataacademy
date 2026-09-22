import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { contarPendencias, marcarVisto } from "@/lib/admin-pendencias";

export const dynamic = "force-dynamic";

// Contagens do menu do admin. O menu consulta aqui de tempos em tempos para
// avisar de chamado novo sem precisar recarregar a página.
export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const pendencias = await contarPendencias(createAdminClient(), user.id);
  return NextResponse.json(pendencias, { headers: { "Cache-Control": "no-store" } });
}

/* Marcar uma tela como vista.

   Fica no POST, e não no GET, porque abrir a tela não é o mesmo que ter
   olhado. A primeira versão apagava o aviso na navegação, e passar pela tela a
   caminho de outra coisa zerava o contador sem ninguém ter lido nada. */
export async function POST(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();

  const { em } = await req.json().catch(() => ({ em: "" }));
  if (!/^\/admin(\/[a-z0-9-]+)*$/.test(em || "")) {
    return NextResponse.json({ error: "tela inválida" }, { status: 400 });
  }
  await marcarVisto(admin, user.id, em);

  const pendencias = await contarPendencias(admin, user.id);
  return NextResponse.json(pendencias, { headers: { "Cache-Control": "no-store" } });
}
