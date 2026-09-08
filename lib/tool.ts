import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/community";
import { hasFullAccess } from "@/lib/access";
import { parseIncludes } from "@/lib/subscription";

// Pode usar a Ferramenta de Visuais?
// Admin sempre; quem tem assinatura da Academy (se a ferramenta estiver inclusa no plano);
// ou quem assinou a ferramenta avulsa.
export async function hasToolAccess(admin: SupabaseClient, userId: string, email?: string | null): Promise<boolean> {
  if (isAdminEmail(email)) return true;
  if (await hasFullAccess(admin, userId)) {
    const { data: cfg } = await admin.from("site_settings").select("value").eq("key", "sub_includes").maybeSingle();
    if (parseIncludes(cfg?.value).includes("ferramenta")) return true;
  }
  const { data } = await admin
    .from("tool_subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .eq("status", "active");
  if (!data?.length) return false;
  const now = Date.now();
  return data.some((s: any) => !s.current_period_end || new Date(s.current_period_end).getTime() > now);
}
