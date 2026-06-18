import { createClient } from "@supabase/supabase-js";

// Client público sem cookies — para leituras públicas (ex.: blog) em
// Server Components, sem forçar renderização dinâmica da página.
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
