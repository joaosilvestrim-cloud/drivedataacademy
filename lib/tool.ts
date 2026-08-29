import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/community";

// Pode usar a Ferramenta de Visuais? Admin sempre; senão precisa de assinatura ativa.
export async function hasToolAccess(admin: SupabaseClient, userId: string, email?: string | null): Promise<boolean> {
  if (isAdminEmail(email)) return true;
  const { data } = await admin
    .from("tool_subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .eq("status", "active");
  if (!data?.length) return false;
  const now = Date.now();
  return data.some((s: any) => !s.current_period_end || new Date(s.current_period_end).getTime() > now);
}
