"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const TURMA_KEYS = [
  "full_access_price",
  "turma_nome",
  "turma_data",
  "turma_descricao",
  "sales_open",
  "checkout_whatsapp",
] as const;

export async function saveTurma(formData: FormData) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  const rawPrice = ((formData.get("full_access_price") as string) || "").replace(/[^\d,\.]/g, "").replace(",", ".");
  const values: Record<string, string> = {
    full_access_price: rawPrice ? String(Number(rawPrice) || 0) : "",
    turma_nome: ((formData.get("turma_nome") as string) || "").trim(),
    turma_data: ((formData.get("turma_data") as string) || "").trim(),
    turma_descricao: ((formData.get("turma_descricao") as string) || "").trim(),
    sales_open: formData.get("sales_open") === "on" ? "1" : "0",
    checkout_whatsapp: ((formData.get("checkout_whatsapp") as string) || "").replace(/\D/g, ""),
  };

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const rows = TURMA_KEYS.map((key) => ({ key, value: values[key] ?? "", updated_at: now }));
  const { error } = await admin.from("site_settings").upsert(rows, { onConflict: "key" });
  if (error) redirect("/admin/turma?error=" + encodeURIComponent(error.message));

  revalidatePath("/admin/turma");
  revalidatePath("/matricula");
  redirect("/admin/turma?ok=1");
}
