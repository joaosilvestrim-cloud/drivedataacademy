import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { acessoDoEndereco } from "@/lib/uso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JANELA_MIN = 30;

/* Registra que o aluno abriu uma ferramenta ou um curso.

   O navegador manda só o endereço. Quem decide o que ele é continua sendo o
   servidor, pelo mesmo catálogo do painel, então ninguém consegue inventar uma
   ferramenta mandando um nome qualquer.

   Nunca devolve erro para a tela: contar uso é detalhe, e o aluno não pode
   sentir nada se a tabela não existir ou o banco demorar. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const acesso = acessoDoEndereco(typeof body?.pathname === "string" ? body.pathname : "");
    if (!acesso) return new NextResponse(null, { status: 204 });

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse(null, { status: 204 });

    const admin = createAdminClient();
    const desde = new Date(Date.now() - JANELA_MIN * 60_000).toISOString();
    const { data: recente } = await admin
      .from("access_events")
      .select("id")
      .eq("user_id", user.id)
      .eq("tipo", acesso.tipo)
      .eq("chave", acesso.chave)
      .gte("created_at", desde)
      .limit(1)
      .maybeSingle();
    if (!recente) await admin.from("access_events").insert({ user_id: user.id, tipo: acesso.tipo, chave: acesso.chave });
  } catch {
    // Silêncio de propósito: ver comentário acima.
  }
  return new NextResponse(null, { status: 204 });
}
