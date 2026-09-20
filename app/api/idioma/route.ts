import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/sessao";
import { idiomaValido } from "@/lib/i18n/idioma";
import { guardarIdioma } from "@/lib/i18n/idioma-usuario";

/* Guarda no perfil o idioma que a pessoa escolheu.

   O cookie já resolve a tela desta sessão. Isto aqui é para o que acontece
   sem navegador: o e-mail do pagamento, o aviso do certificado, o código de
   acesso. E também para a pessoa abrir no celular e já achar tudo no idioma
   dela, sem ter que escolher de novo. */

export async function POST(req: Request) {
  const user = await usuarioAtual();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { idioma } = await req.json().catch(() => ({ idioma: null }));
  await guardarIdioma(user.id, idiomaValido(idioma));
  return NextResponse.json({ ok: true });
}
