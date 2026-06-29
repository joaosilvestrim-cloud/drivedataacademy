"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendMaterialEmail } from "@/lib/email";

export type SubmitResult =
  | { ok: true; fileUrl: string | null; emailed: boolean }
  | { ok: false; error: string };

export async function submitLead(formData: FormData): Promise<SubmitResult> {
  const slug = (formData.get("slug") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();

  if (!slug || !name || !email) {
    return { ok: false, error: "Preencha nome e e-mail." };
  }

  const supabase = createAdminClient();

  const { data: material } = await supabase
    .from("materials")
    .select("id, title, file_url, email_subject, email_message, published")
    .eq("slug", slug)
    .maybeSingle();

  if (!material || !material.published) {
    return { ok: false, error: "Material não encontrado." };
  }

  const lead = {
    material_id: material.id,
    material_title: material.title,
    name,
    email,
    phone: ((formData.get("phone") as string) || "").trim() || null,
    company: ((formData.get("company") as string) || "").trim() || null,
    role: ((formData.get("role") as string) || "").trim() || null,
    utm_source: ((formData.get("utm_source") as string) || "").trim() || null,
    utm_medium: ((formData.get("utm_medium") as string) || "").trim() || null,
    utm_campaign: ((formData.get("utm_campaign") as string) || "").trim() || null,
    referrer: ((formData.get("referrer") as string) || "").trim() || null,
  };

  const { error } = await supabase.from("material_leads").insert(lead);
  if (error) {
    return { ok: false, error: "Não foi possível registrar agora. Tente novamente." };
  }

  const sent = await sendMaterialEmail({
    to: email,
    name,
    materialTitle: material.title,
    fileUrl: material.file_url,
    subject: material.email_subject,
    message: material.email_message,
  });

  return { ok: true, fileUrl: material.file_url, emailed: sent.sent };
}
