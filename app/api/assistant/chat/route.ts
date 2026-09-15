import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chatSupportAI } from "@/lib/ai";
import { sendHtmlEmail } from "@/lib/email";
import { contextoAluno, contextoPlataforma } from "@/lib/assistente-contexto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");

// Cria um chamado a partir da conversa do chat e avisa o time.
async function ticketFromChat(admin: ReturnType<typeof createAdminClient>, user: any, clean: any[], closingNote: string) {
  const firstUser = [...clean].reverse().find((m: any) => m.role === "user")?.content || "Atendimento pelo chat";
  const subject = firstUser.slice(0, 80);
  const { data: ticket } = await admin
    .from("support_tickets")
    .insert({ user_id: user.id, email: user.email, subject, category: "outro", status: "open", last_actor: "ai" })
    .select("id")
    .single();
  if (!ticket) return null;

  const rows = [
    ...clean.map((m: any) => ({ ticket_id: ticket.id, author: m.role === "user" ? "user" : "ai", body: m.content })),
    { ticket_id: ticket.id, author: "ai", body: closingNote },
  ];
  await admin.from("support_messages").insert(rows);

  const adminEmail = (process.env.ADMIN_EMAILS || "").split(",")[0]?.trim();
  if (adminEmail) {
    await sendHtmlEmail(
      adminEmail,
      `Chamado do assistente: ${subject}`,
      `<p style="font-family:Arial">O assistente encaminhou uma conversa de <b>${user.email}</b> para o time.</p><p style="font-family:Arial">Assunto: ${subject}</p><p><a href="${SITE_URL}/admin/suporte">Abrir no painel</a></p>`
    );
  }
  return ticket.id as string;
}

async function logChat(admin: ReturnType<typeof createAdminClient>, user: any, clean: any[], answer: string, escalated: boolean, ticketId: string | null) {
  const question = [...clean].reverse().find((m: any) => m.role === "user")?.content || "";
  try {
    await admin.from("ai_chat_logs").insert({ user_id: user.id, email: user.email, question, answer, escalated, ticket_id: ticketId });
  } catch {}
}

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
  const forceEscalate = body?.forceEscalate === true;
  const clean = history
    .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
    .slice(-12);

  const admin = createAdminClient();

  // "Falar com o time": cria o chamado direto, sem formulário.
  if (forceEscalate && !alreadyEscalated) {
    const note = "Encaminhei sua conversa para o time da DriveData. Eles vão dar sequência por aqui e também respondemos por e-mail.";
    const id = await ticketFromChat(admin, user, clean.length ? clean : [{ role: "user", content: "Quero falar com o time." }], note);
    await logChat(admin, user, clean, note, true, id);
    return NextResponse.json({ reply: note, escalated: !!id, ticketId: id });
  }

  if (clean.length === 0) return NextResponse.json({ reply: "Como posso ajudar?" });

  const ctx = await buildContext(admin, user);
  const raw = await chatSupportAI(clean, ctx);
  if (!raw) {
    // sem IA: escala direto para o time
    const note = "No momento não consegui responder por aqui, então encaminhei para o time da DriveData. Eles respondem em breve.";
    const id = alreadyEscalated ? null : await ticketFromChat(admin, user, clean, note);
    await logChat(admin, user, clean, note, !!id, id);
    return NextResponse.json({ reply: note, escalated: !!id, ticketId: id, fallback: true });
  }

  const needsHuman = raw.includes("[[ESCALAR]]");
  const reply = raw.replace(/\[\[ESCALAR\]\]/g, "").trim();

  let escalated = false;
  let ticketId: string | null = null;
  if (needsHuman && !alreadyEscalated) {
    ticketId = await ticketFromChat(admin, user, clean, reply);
    escalated = !!ticketId;
  }

  await logChat(admin, user, clean, reply, escalated, ticketId);
  return NextResponse.json({ reply, escalated, ticketId });
}

// Contexto: dados atuais da plataforma + dados do próprio aluno, lidos do banco agora.
async function buildContext(admin: ReturnType<typeof createAdminClient>, user: any): Promise<string> {
  const [plataforma, aluno] = await Promise.all([contextoPlataforma(admin), contextoAluno(admin, user)]);
  return `${plataforma}\n\n${aluno}`;
}
