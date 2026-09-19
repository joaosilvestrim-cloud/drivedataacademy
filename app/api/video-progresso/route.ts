import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* Recebe o pedaço assistido de uma aula e soma ao que já estava guardado.

   O player manda de tempos em tempos: quanto tempo o aluno assistiu desde o
   último envio, até onde chegou e quais trechos de 5% passaram na tela. Aqui
   só se soma e se une, nunca se apaga: rever o começo não desfaz o fim.

   Nunca devolve erro para a tela. Medir retenção é detalhe; a aula não pode
   travar por causa disso. */
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => null);
    const lessonId = String(b?.lessonId || "");
    const courseId = String(b?.courseId || "");
    if (!UUID.test(lessonId)) return new NextResponse(null, { status: 204 });

    const duracao = Math.max(0, Math.min(6 * 3600, Math.round(Number(b?.duration) || 0)));
    const assistido = Math.max(0, Math.min(600, Math.round(Number(b?.watched) || 0)));
    const maxPos = Math.max(0, Math.min(duracao || 6 * 3600, Math.round(Number(b?.maxPos) || 0)));
    const buckets = /^[01]{20}$/.test(String(b?.buckets || "")) ? String(b.buckets) : "0".repeat(20);
    const novaSessao = !!b?.nova;
    if (!duracao || (!assistido && !buckets.includes("1"))) return new NextResponse(null, { status: 204 });

    const { data: { user } } = await createClient().auth.getUser();
    if (!user) return new NextResponse(null, { status: 204 });

    const admin = createAdminClient();
    const { data: atual } = await admin
      .from("video_progress")
      .select("watched_s, max_pos_s, buckets, sessions")
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId)
      .maybeSingle();

    const unidos = atual
      ? Array.from({ length: 20 }, (_, i) => (atual.buckets?.[i] === "1" || buckets[i] === "1" ? "1" : "0")).join("")
      : buckets;

    await admin.from("video_progress").upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        course_id: UUID.test(courseId) ? courseId : null,
        duration_s: duracao,
        // Teto de 3x a duração: aba esquecida aberta não vira aluno "super engajado".
        watched_s: Math.min(duracao * 3, (atual?.watched_s ?? 0) + assistido),
        max_pos_s: Math.max(atual?.max_pos_s ?? 0, maxPos),
        buckets: unidos,
        sessions: (atual?.sessions ?? 0) + (novaSessao || !atual ? 1 : 0),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id" }
    );
  } catch {
    // Silêncio de propósito: ver comentário acima.
  }
  return new NextResponse(null, { status: 204 });
}
