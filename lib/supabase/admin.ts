import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente com service_role — IGNORA RLS. NUNCA importar em componente de cliente.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase admin não configurado. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas Environment Variables do Vercel (ambiente Production) e refaça o deploy."
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    /* O Next guarda o resultado de fetch por URL. Como toda consulta do
       supabase-js vira um GET parecido, uma leitura antiga voltava no lugar do
       dado novo: votação apurando zero logo depois do voto, por exemplo. Aqui a
       leitura é sempre ao vivo, e quem quiser cache usa revalidate na rota. */
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
