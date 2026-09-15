import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { contarPendencias } from "@/lib/admin-pendencias";

export const dynamic = "force-dynamic";

// Contagens do menu do admin. O menu consulta aqui de tempos em tempos para
// avisar de chamado novo sem precisar recarregar a página.
export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const pendencias = await contarPendencias(createAdminClient());
  return NextResponse.json(pendencias, { headers: { "Cache-Control": "no-store" } });
}
