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

/* Revogar não apaga: a página pública do código passa a dizer que o
   certificado foi revogado. Apagar deixaria o link quebrado, e quem recebeu o
   certificado ficaria sem explicação. */
export async function alternarRevogacao(formData: FormData) {
  const supabase = await admin();
  const id = formData.get("id") as string;
  const revogar = formData.get("revogar") === "true";
  await supabase.from("certificates").update({ revoked: revogar }).eq("id", id);
  revalidatePath("/admin/certificados");
  redirect(`/admin/certificados?ok=${encodeURIComponent(revogar ? "Certificado revogado." : "Certificado reativado.")}`);
}
