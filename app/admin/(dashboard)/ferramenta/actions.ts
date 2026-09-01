"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function saveToolPrice(formData: FormData) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  const price = (((formData.get("tool_price") as string) || "").replace(/[^\d,\.]/g, "").replace(",", ".")) || "19.90";
  const supabase = createAdminClient();
  await supabase.from("site_settings").upsert({ key: "tool_price", value: price, updated_at: new Date().toISOString() }, { onConflict: "key" });
  revalidatePath("/admin/ferramenta");
  redirect("/admin/ferramenta?ok=1");
}

async function findUserByEmail(supabase: ReturnType<typeof createAdminClient>, email: string) {
  const target = email.trim().toLowerCase();
  let page = 1;
  for (let i = 0; i < 10; i++) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    const users = data?.users ?? [];
    const found = users.find((u: any) => (u.email || "").toLowerCase() === target);
    if (found) return found;
    if (users.length < 1000) break;
    page++;
  }
  return null;
}

// Libera a ferramenta de cortesia (brinde), sem pagamento. term: none | 1m | 6m | 12m
export async function grantToolAccess(formData: FormData) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  const supabase = createAdminClient();

  const userId = ((formData.get("user_id") as string) || "").trim();
  const email = ((formData.get("email") as string) || "").trim();
  const term = (formData.get("term") as string) || "none";
  const back = (m: string, ok = true) => redirect(`/admin/ferramenta?${ok ? "ok" : "error"}=` + encodeURIComponent(m));

  let target: any = null;
  if (userId) target = (await supabase.auth.admin.getUserById(userId)).data?.user ?? null;
  else if (email) target = await findUserByEmail(supabase, email);
  else back("Selecione um aluno.", false);
  if (!target) back("Aluno não encontrado. Crie a conta em Acessos primeiro.", false);

  const days = term === "1m" ? 30 : term === "6m" ? 182 : term === "12m" ? 365 : null;
  const current_period_end = days ? new Date(Date.now() + days * 864e5).toISOString() : null;

  const { error } = await supabase.from("tool_subscriptions").upsert(
    { user_id: target.id, email: target.email || null, status: "active", current_period_end, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) back(error.message, false);
  revalidatePath("/admin/ferramenta");
  back(`Ferramenta liberada (cortesia) para ${target.email || ""}${days ? ` por ${days} dias` : " sem expirar"}.`);
}

export async function revokeToolAccess(formData: FormData) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  const supabase = createAdminClient();
  await supabase.from("tool_subscriptions").update({ status: "canceled", updated_at: new Date().toISOString() }).eq("user_id", formData.get("user_id") as string);
  revalidatePath("/admin/ferramenta");
  redirect("/admin/ferramenta?ok=" + encodeURIComponent("Acesso à ferramenta revogado."));
}
