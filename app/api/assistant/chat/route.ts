import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chatSupportAI } from "@/lib/ai";
import { sendHtmlEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");
const BADGE_LABELS: Record<string, string> = { fundador: "Fundador", top: "Top do ranking" };

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

// Contexto: dados do próprio aluno + catálogo. Deixa a IA "por dentro".
async function buildContext(admin: ReturnType<typeof createAdminClient>, user: any): Promise<string> {
  const [{ data: profile }, { data: enrolls }, { data: mem }, { data: allPoints }, { data: myBadges }, { count: certCount }, { data: pub }] =
    await Promise.all([
      admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      admin.from("enrollments").select("course_id").eq("user_id", user.id),
      admin.from("memberships").select("expires_at").eq("user_id", user.id).eq("status", "active"),
      admin.from("point_events").select("user_id, points"),
      admin.from("user_badges").select("badge").eq("user_id", user.id),
      admin.from("certificates").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      admin.from("courses").select("title, subtitle").eq("published", true).order("position"),
    ]);

  const now = Date.now();
  const fullAccess = (mem ?? []).some((m: any) => !m.expires_at || new Date(m.expires_at).getTime() > now);

  const totals: Record<string, number> = {};
  for (const e of allPoints ?? []) totals[e.user_id] = (totals[e.user_id] || 0) + (e.points || 0);
  const myPoints = totals[user.id] || 0;
  const ranked = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const myRank = ranked.findIndex(([id]) => id === user.id);
  const mySolutions = Math.round(myPoints / 10);

  const courseIds = (enrolls ?? []).map((e: any) => e.course_id);
  const progressLines: string[] = [];
  if (courseIds.length) {
    const [{ data: cs }, { data: ls }, { data: pr }] = await Promise.all([
      admin.from("courses").select("id, title").in("id", courseIds),
      admin.from("lessons").select("course_id").in("course_id", courseIds),
      admin.from("lesson_progress").select("course_id").eq("user_id", user.id).eq("completed", true).in("course_id", courseIds),
    ]);
    const total: Record<string, number> = {};
    for (const l of ls ?? []) total[l.course_id] = (total[l.course_id] || 0) + 1;
    const done: Record<string, number> = {};
    for (const p of pr ?? []) done[p.course_id] = (done[p.course_id] || 0) + 1;
    for (const c of cs ?? []) {
      const t = total[c.id] || 0, d = done[c.id] || 0;
      const pct = t ? Math.round((d / t) * 100) : 0;
      progressLines.push(`  - ${c.title}: ${pct}% concluído (${d}/${t} aulas)`);
    }
  }

  const badges = (myBadges ?? []).map((b: any) => BADGE_LABELS[b.badge] || b.badge);
  const firstName = (profile?.full_name || "").split(" ")[0];

  const student = [
    "Dados do aluno (use quando ele perguntar sobre a própria conta; não repita tudo sem necessidade):",
    `- Nome: ${firstName || "(não informado)"}`,
    `- Acesso full (todos os cursos): ${fullAccess ? "sim" : "não"}`,
    `- Pontos na comunidade: ${myPoints} · Posição no ranking: ${myRank >= 0 ? "#" + (myRank + 1) : "sem pontos ainda"} · Soluções dadas: ${mySolutions}`,
    `- Selos: ${badges.length ? badges.join(", ") : "nenhum ainda"}`,
    `- Certificados já emitidos: ${certCount ?? 0}`,
    courseIds.length ? `- Cursos matriculados:\n${progressLines.join("\n")}` : "- Ainda não está matriculado em nenhum curso.",
  ].join("\n");

  const catalog = (pub ?? []).length
    ? "Catálogo de cursos publicados:\n" + (pub ?? []).map((c: any) => `- ${c.title}${c.subtitle ? `: ${c.subtitle}` : ""}`).join("\n")
    : "Catálogo: nenhum curso publicado no momento.";

  return `${student}\n\n${catalog}`;
}
