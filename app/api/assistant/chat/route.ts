import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chatSupportAI } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const clean = history
    .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
    .slice(-12);

  if (clean.length === 0) return NextResponse.json({ reply: "Como posso ajudar?" });

  const admin = createAdminClient();
  const { data: courses } = await admin.from("courses").select("title, subtitle").eq("published", true).order("position");
  const ctx = (courses ?? []).map((c: any) => `- ${c.title}${c.subtitle ? `: ${c.subtitle}` : ""}`).join("\n");

  const reply = await chatSupportAI(clean, ctx);
  return NextResponse.json({
    reply: reply || "No momento não consegui responder por aqui. Você pode abrir um chamado que o time da DriveData te ajuda.",
    fallback: !reply,
  });
}
