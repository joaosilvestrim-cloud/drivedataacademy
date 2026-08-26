import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractProfile } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (text.length < 20) return NextResponse.json({ error: "Cole mais detalhes da sua trajetória (LinkedIn/currículo)." }, { status: 400 });

  const result = await extractProfile(text);
  if (!result) return NextResponse.json({ error: "Não consegui processar agora. Preencha manualmente ou tente de novo." }, { status: 502 });
  return NextResponse.json(result);
}
