"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function admin() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return createAdminClient();
}

function methodsFrom(formData: FormData): string {
  const m: string[] = [];
  if (formData.get("m_pix") === "on") m.push("pix");
  if (formData.get("m_card") === "on") m.push("card");
  if (formData.get("m_boleto") === "on") m.push("boleto");
  return m.join(",") || "pix";
}

function courseFields(formData: FormData, kind: string) {
  const course_id = kind === "course" ? ((formData.get("course_id") as string) || "").trim() || null : null;
  const course_ids = kind === "bundle" ? (formData.getAll("course_ids") as string[]).filter(Boolean).join(",") || null : null;
  return { course_id, course_ids };
}

export async function createProduct(formData: FormData) {
  const supabase = await admin();
  const name = ((formData.get("name") as string) || "").trim();
  if (!name) redirect("/admin/cobranca");
  const kind = (formData.get("kind") as string) || "full_access";
  await supabase.from("payment_products").insert({
    name,
    price: Number(((formData.get("price") as string) || "").replace(",", ".")) || 0,
    kind,
    ...courseFields(formData, kind),
    access_days: Number((formData.get("access_days") as string) || "0") || null,
    max_installments: Number((formData.get("max_installments") as string) || "1") || 1,
    methods: methodsFrom(formData),
    active: true,
  });
  revalidatePath("/admin/cobranca");
  redirect("/admin/cobranca?ok=Modelo+criado");
}

export async function saveProduct(formData: FormData) {
  const supabase = await admin();
  const kind = (formData.get("kind") as string) || "full_access";
  await supabase.from("payment_products").update({
    name: ((formData.get("name") as string) || "").trim(),
    description: ((formData.get("description") as string) || "").trim() || null,
    price: Number(((formData.get("price") as string) || "").replace(",", ".")) || 0,
    kind,
    ...courseFields(formData, kind),
    access_days: Number((formData.get("access_days") as string) || "0") || null,
    max_installments: Number((formData.get("max_installments") as string) || "1") || 1,
    methods: methodsFrom(formData),
    active: formData.get("active") === "on",
  }).eq("id", formData.get("id") as string);
  revalidatePath("/admin/cobranca");
  redirect("/admin/cobranca?ok=Modelo+salvo");
}

export async function deleteProduct(formData: FormData) {
  const supabase = await admin();
  await supabase.from("payment_products").delete().eq("id", formData.get("id") as string);
  revalidatePath("/admin/cobranca");
  redirect("/admin/cobranca?ok=Modelo+excluido");
}
