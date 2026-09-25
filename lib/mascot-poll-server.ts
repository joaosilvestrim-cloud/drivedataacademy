import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MASCOT_POLL_SLUG, type MascotPoll } from "./mascot-poll";

export class PollError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function mascotPoll(admin: SupabaseClient, email: string, optionId?: unknown): Promise<MascotPoll | null> {
  const { data: poll, error } = await admin.from("polls")
    .select("id, title, published, closes_at, show_results").eq("slug", MASCOT_POLL_SLUG).maybeSingle();
  if (error) throw error;
  if (!poll?.published) {
    if (optionId !== undefined) throw new PollError("Esta votação não está disponível.", 409);
    return null;
  }
  const closed = !!poll.closes_at && new Date(poll.closes_at).getTime() <= Date.now();
  const { data: options, error: optionsError } = await admin.from("poll_options")
    .select("id, label, description").eq("poll_id", poll.id).order("position");
  if (optionsError) throw optionsError;
  if (optionId !== undefined) {
    if (closed) throw new PollError("A votação foi encerrada.", 409);
    if (typeof optionId !== "string" || !options?.some(option => option.id === optionId)) {
      throw new PollError("Escolha um dos nomes da votação.", 400);
    }
    // Identity comes exclusively from auth.getUser(), never from the request body.
    const { error: voteError } = await admin.from("poll_votes").upsert({
      poll_id: poll.id, email: email.toLowerCase(), options: [optionId],
    }, { onConflict: "poll_id,email" });
    if (voteError) throw voteError;
  }
  const { data: vote, error: ownError } = await admin.from("poll_votes")
    .select("options").eq("poll_id", poll.id).eq("email", email.toLowerCase()).maybeSingle();
  if (ownError) throw ownError;
  const myVote = options?.find(option => vote?.options?.includes(option.id))?.id ?? null;
  const showResults = poll.show_results && (!!myVote || closed);
  // Exact head counts avoid the default 1,000-row limit and never expose voter data.
  let total: number | null = null;
  const counts: Record<string, number> = {};
  if (showResults) {
    const results = await Promise.all([
      admin.from("poll_votes").select("id", { count: "exact", head: true }).eq("poll_id", poll.id),
      ...(options ?? []).map(option => admin.from("poll_votes").select("id", { count: "exact", head: true })
        .eq("poll_id", poll.id).contains("options", [option.id])),
    ]);
    for (const result of results) if (result.error) throw result.error;
    total = results[0].count ?? 0;
    (options ?? []).forEach((option, index) => { counts[option.id] = results[index + 1].count ?? 0; });
  }
  return {
    id: poll.id, title: poll.title, closed, myVote, total,
    options: (options ?? []).map(option => ({ ...option,
      votes: showResults ? counts[option.id] : null,
      percent: showResults ? (total ? Math.round(counts[option.id] / total * 100) : 0) : null,
    })),
  };
}
