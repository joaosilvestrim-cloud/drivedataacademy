"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const TYPES = ["portal", "parceria", "mentoria", "candidatura", "marketplace"];

export async function submitRepRequest(type: string, payloadJson: string): Promise<{ ok: boolean; error?: string }> {
  if (!TYPES.includes(type)) return { ok: false, error: "Tipo inválido." };
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Faça login." };
  let payload: any = {};
  try { payload = JSON.parse(payloadJson || "{}"); } catch { payload = {}; }
  const admin = createAdminClient();
  const { error } = await admin.from("rep_requests").insert({ user_id: user.id, type, payload });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
