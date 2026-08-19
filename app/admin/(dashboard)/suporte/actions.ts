"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendHtmlEmail } from "@/lib/email";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");

async function admin() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return createAdminClient();
}

export async function replyTicketAdmin(formData: FormData) {
  const supabase = await admin();
  const ticketId = formData.get("ticket_id") as string;
  const body = ((formData.get("body") as string) || "").trim();
  if (!body) redirect(`/admin/suporte/${ticketId}`);

  const { data: ticket } = await supabase.from("support_tickets").select("id, email, subject").eq("id", ticketId).maybeSingle();
  if (!ticket) redirect("/admin/suporte");

  await supabase.from("support_messages").insert({ ticket_id: ticketId, author: "agent", body });
  await supabase.from("support_tickets").update({ status: "answered", last_actor: "agent", updated_at: new Date().toISOString() }).eq("id", ticketId);

  if (ticket.email) {
    await sendHtmlEmail(
      ticket.email,
      `Resposta ao seu chamado: ${ticket.subject}`,
      `<p style="font-family:Arial">O time da DriveData respondeu seu chamado.</p><p style="font-family:Arial;color:#475569">${body.replace(/</g, "&lt;")}</p><p><a href="${SITE_URL}/conta/ajuda/${ticketId}">Ver conversa</a></p>`
    );
  }

  revalidatePath(`/admin/suporte/${ticketId}`);
  redirect(`/admin/suporte/${ticketId}`);
}

export async function setTicketStatus(formData: FormData) {
  const supabase = await admin();
  const ticketId = formData.get("ticket_id") as string;
  const status = (formData.get("status") as string) || "open";
  await supabase.from("support_tickets").update({ status, updated_at: new Date().toISOString() }).eq("id", ticketId);
  revalidatePath(`/admin/suporte/${ticketId}`);
  revalidatePath("/admin/suporte");
}
