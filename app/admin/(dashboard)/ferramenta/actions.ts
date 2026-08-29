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
