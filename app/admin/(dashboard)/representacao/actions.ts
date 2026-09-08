"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setRepStatus(formData: FormData) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  const id = formData.get("id") as string;
  const status = (formData.get("status") as string) || "novo";
  const admin = createAdminClient();
  await admin.from("rep_requests").update({ status }).eq("id", id);
  revalidatePath("/admin/representacao");
}
