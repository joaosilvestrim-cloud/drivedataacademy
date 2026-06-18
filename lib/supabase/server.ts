import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente server-side com sessão (anon key + cookies). Usado para auth do portal.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // chamado de um Server Component — pode ser ignorado quando há middleware.
          }
        },
      },
    }
  );
}
