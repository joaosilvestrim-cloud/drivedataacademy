"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendHtmlEmail } from "@/lib/email";
import { CATEGORIES } from "@/lib/support";
import { askSupportAI } from "@/lib/ai";
import type { SupabaseClient } from "@supabase/supabase-js";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");

async function courseContext(admin: SupabaseClient): Promise<string> {
  const { data } = await admin.from("courses").select("title, subtitle").eq("published", true).order("position");
  return (data ?? []).map((c: any) => `- ${c.title}${c.subtitle ? `: ${c.subtitle}` : ""}`).join("\n");
}

// Faz a IA responder o chamado (se a Groq estiver configurada) e marca o status.
async function aiRespond(admin: SupabaseClient, ticketId: string, question: string) {
  const answer = await askSupportAI(question, await courseContext(admin));
  if (!answer) return; // sem IA: fica "open" para o time
  await admin.from("support_messages").insert({ ticket_id: ticketId, author: "ai", body: answer });
  await admin.from("support_tickets").update({ status: "answered", last_actor: "ai", updated_at: new Date().toISOString() }).eq("id", ticketId);
}

async function me() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  return { user, admin: createAdminClient() };
}

export async function createTicket(formData: FormData) {
  const { user, admin } = await me();
  const subject = ((formData.get("subject") as string) || "").trim();
  const category = ((formData.get("category") as string) || "duvida").trim();
  const message = ((formData.get("message") as string) || "").trim();
  if (!subject || !message) redirect("/conta/ajuda?novo=1");

  const { data: ticket } = await admin
    .from("support_tickets")
    .insert({ user_id: user.id, email: user.email, subject, category: CATEGORIES[category] ? category : "outro", status: "open", last_actor: "user" })
    .select("id")
    .single();

  if (ticket) {
    await admin.from("support_messages").insert({ ticket_id: ticket.id, author: "user", body: message });
    const adminEmail = (process.env.ADMIN_EMAILS || "").split(",")[0]?.trim();
    if (adminEmail) {
      await sendHtmlEmail(
        adminEmail,
        `Novo chamado: ${subject}`,
        `<p style="font-family:Arial">Novo chamado de <b>${user.email}</b>.</p><p style="font-family:Arial">Assunto: ${subject}</p><p style="font-family:Arial;color:#475569">${message.replace(/</g, "&lt;")}</p><p><a href="${SITE_URL}/admin/suporte">Abrir no painel</a></p>`
      );
    }
    // IA tenta a primeira resposta (triagem). O time continua vendo tudo no painel.
    await aiRespond(admin, ticket.id, `${subject}\n\n${message}`);
  }

  revalidatePath("/conta/ajuda");
  redirect(`/conta/ajuda/${ticket?.id ?? ""}`);
}

export async function replyTicket(formData: FormData) {
  const { user, admin } = await me();
  const ticketId = formData.get("ticket_id") as string;
  const body = ((formData.get("body") as string) || "").trim();
  if (!body) redirect(`/conta/ajuda/${ticketId}`);

  const { data: ticket } = await admin.from("support_tickets").select("id, user_id").eq("id", ticketId).maybeSingle();
  if (!ticket || ticket.user_id !== user.id) redirect("/conta/ajuda");

  await admin.from("support_messages").insert({ ticket_id: ticketId, author: "user", body });
  await admin.from("support_tickets").update({ status: "open", last_actor: "user", updated_at: new Date().toISOString() }).eq("id", ticketId);

  // Enquanto nenhum humano respondeu, a IA continua atendendo.
  const { data: msgs } = await admin.from("support_messages").select("author").eq("ticket_id", ticketId);
  const humanReplied = (msgs ?? []).some((m: any) => m.author === "agent");
  if (!humanReplied) await aiRespond(admin, ticketId, body);

  revalidatePath(`/conta/ajuda/${ticketId}`);
  redirect(`/conta/ajuda/${ticketId}`);
}
