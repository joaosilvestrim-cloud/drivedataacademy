import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chatSupportAI } from "@/lib/ai";
import { sendHtmlEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const history = Array.isArray(body?.messages) ? body.messages : [];
  const alreadyEscalated = body?.escalated === true;
  const clean = history
    .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
    .slice(-12);

  if (clean.length === 0) return NextResponse.json({ reply: "Como posso ajudar?" });

  const admin = createAdminClient();
  const { data: courses } = await admin.from("courses").select("title, subtitle").eq("published", true).order("position");
  const ctx = (courses ?? []).map((c: any) => `- ${c.title}${c.subtitle ? `: ${c.subtitle}` : ""}`).join("\n");

  const raw = await chatSupportAI(clean, ctx);
  if (!raw) {
    return NextResponse.json({
      reply: "No momento não consegui responder por aqui. Você pode abrir um chamado que o time da DriveData te ajuda.",
      fallback: true,
    });
  }

  // A IA marca [[ESCALAR]] quando precisa de um humano.
  const needsHuman = raw.includes("[[ESCALAR]]");
  const reply = raw.replace(/\[\[ESCALAR\]\]/g, "").trim();

  let escalated = false;
  let ticketId: string | null = null;

  if (needsHuman && !alreadyEscalated) {
    const firstUser = [...clean].reverse().find((m: any) => m.role === "user")?.content || "Atendimento pelo chat";
    const subject = firstUser.slice(0, 80);
    const { data: ticket } = await admin
      .from("support_tickets")
      .insert({ user_id: user.id, email: user.email, subject, category: "outro", status: "open", last_actor: "ai" })
      .select("id")
      .single();

    if (ticket) {
      ticketId = ticket.id;
      escalated = true;
      // grava a conversa como histórico do chamado
      const rows = [
        ...clean.map((m: any) => ({ ticket_id: ticket.id, author: m.role === "user" ? "user" : "ai", body: m.content })),
        { ticket_id: ticket.id, author: "ai", body: reply },
      ];
      await admin.from("support_messages").insert(rows);

      const adminEmail = (process.env.ADMIN_EMAILS || "").split(",")[0]?.trim();
      if (adminEmail) {
        await sendHtmlEmail(
          adminEmail,
          `Chamado do assistente: ${subject}`,
          `<p style="font-family:Arial">A IA encaminhou uma conversa de <b>${user.email}</b> para o time.</p><p style="font-family:Arial">Assunto: ${subject}</p><p><a href="${SITE_URL}/admin/suporte">Abrir no painel</a></p>`
        );
      }
    }
  }

  return NextResponse.json({ reply, escalated, ticketId });
}
