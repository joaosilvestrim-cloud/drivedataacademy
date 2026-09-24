import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { conectar } from "@/lib/conta-azul";
import { NOME_COOKIE, stateValido, enderecoDeRetorno } from "@/lib/conta-azul-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Retorno da autorização do Conta Azul.

   Três travas, e cada uma cobre um buraco diferente:

     1. sessão de admin, porque quem chega aqui liga a contabilidade da
        empresa na plataforma;
     2. assinatura do state, que impede um retorno forjado;
     3. o state tem que bater com o do cookie, que é o que amarra este
        retorno à ida que ESTE navegador começou.

   Sem a terceira, um atacante logado em outra conta do Conta Azul poderia
   fazer o admin abrir um callback com o `code` dele, e a DriveData acabaria
   conectada ao ERP de outra pessoa. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const volta = (params: string) => NextResponse.redirect(new URL(`/admin/integracoes?${params}`, req.url));

  const user = await getAdminUser();
  if (!user) return NextResponse.redirect(new URL("/admin/login", req.url));

  const erroDeles = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (erroDeles) return volta("erro=" + encodeURIComponent(`O Conta Azul recusou: ${erroDeles}`));

  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const doCookie = req.headers.get("cookie")?.match(new RegExp(`${NOME_COOKIE}=([^;]+)`))?.[1] || "";

  if (!code) return volta("erro=" + encodeURIComponent("O Conta Azul não devolveu o código de autorização."));
  if (!stateValido(state) || state !== decodeURIComponent(doCookie)) {
    return volta("erro=" + encodeURIComponent("A autorização não confere com a que começou neste navegador. Tente de novo."));
  }

  try {
    await conectar(code, enderecoDeRetorno(req));
  } catch (e) {
    return volta("erro=" + encodeURIComponent((e as Error).message.slice(0, 200)));
  }

  const r = volta("ok=" + encodeURIComponent("Conta Azul conectado."));
  r.cookies.set(NOME_COOKIE, "", { path: "/", maxAge: 0 });
  return r;
}
