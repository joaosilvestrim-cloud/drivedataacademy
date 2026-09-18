import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Mantém a sessão do Supabase fresca nas rotas do portal.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  /* Demonstração não age. A tela já não deixa clicar, mas quem abrir o console
     e disparar a ação na mão também para aqui: toda ação de servidor nas rotas
     do portal é recusada enquanto a demonstração estiver valendo. O DriveCanvas
     mora em /ferramenta, fora destas rotas, e segue funcionando. A consulta só
     acontece em requisição de ação, então navegar não fica mais lento. */
  if (user && request.method === "POST" && request.headers.get("next-action") && (await emDemonstracao(user.id))) {
    return NextResponse.json({ error: "Acesso de demonstração: só o DriveCanvas está liberado." }, { status: 403 });
  }
  return response;
}

async function emDemonstracao(userId: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return false;
  try {
    const agora = encodeURIComponent(new Date().toISOString());
    const res = await fetch(`${url}/rest/v1/demo_access?select=user_id&user_id=eq.${userId}&expires_at=gt.${agora}&limit=1`, {
      headers: { apikey: chave, Authorization: `Bearer ${chave}` },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const linhas = await res.json();
    return Array.isArray(linhas) && linhas.length > 0;
  } catch {
    return false;
  }
}

export const config = {
  matcher: ["/admin/:path*", "/conta/:path*", "/aprender/:path*", "/universo", "/decision-lab", "/dataflow-lab"],
};
