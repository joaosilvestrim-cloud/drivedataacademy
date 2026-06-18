import { createClient } from "@/lib/supabase/server";

// Retorna o usuário logado SE ele estiver na allowlist ADMIN_EMAILS; senão null.
export async function getAdminUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const allow = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!allow.includes(user.email.toLowerCase())) return null;
  return user;
}
