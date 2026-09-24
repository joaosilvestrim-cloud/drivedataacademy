import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { urlDeAutorizacao } from "@/lib/conta-azul";
import { NOME_COOKIE, assinarState, enderecoDeRetorno } from "@/lib/conta-azul-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Início da autorização com o Conta Azul.

   Só admin passa. Quem completar este fluxo liga a contabilidade inteira da
   empresa à plataforma, então a porta não é de quem tem o link. */
export async function GET(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.redirect(new URL("/admin/login", req.url));

  if (!process.env.CONTAAZUL_CLIENT_ID || !process.env.CONTAAZUL_CLIENT_SECRET) {
    return NextResponse.redirect(
      new URL(
        "/admin/integracoes?erro=" + encodeURIComponent("Faltam CONTAAZUL_CLIENT_ID e CONTAAZUL_CLIENT_SECRET no ambiente."),
        req.url,
      ),
    );
  }

  const state = assinarState();
  const r = NextResponse.redirect(urlDeAutorizacao(state, enderecoDeRetorno(req)));
  r.cookies.set(NOME_COOKIE, state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  return r;
}
