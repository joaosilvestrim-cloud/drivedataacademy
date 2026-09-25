import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mascotPoll, PollError } from "@/lib/mascot-poll-server";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "private, no-store" },
});

async function handle(request: NextRequest, write: boolean) {
  try {
    if (write && request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin) {
      return json({ error: "Origem inválida." }, 403);
    }
    const { data: { user }, error } = await createClient().auth.getUser();
    if (error || !user?.email || user.is_anonymous) return json({ error: "Entre na sua conta para votar." }, 401);
    let optionId: unknown;
    if (write) {
      let body;
      try { body = await request.json(); } catch { return json({ error: "Escolha um nome para votar." }, 400); }
      if (typeof body?.optionId !== "string") return json({ error: "Escolha um nome para votar." }, 400);
      optionId = body.optionId;
    }
    return json({ poll: await mascotPoll(createAdminClient(), user.email, optionId) });
  } catch (error) {
    if (error instanceof PollError) return json({ error: error.message }, error.status);
    console.error("Mascot poll request failed");
    return json({ error: "Não consegui acessar a votação. Tente novamente." }, 503);
  }
}

export const GET = (request: NextRequest) => handle(request, false);
export const POST = (request: NextRequest) => handle(request, true);
