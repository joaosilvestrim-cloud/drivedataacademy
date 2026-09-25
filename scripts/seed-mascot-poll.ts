import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { MASCOT_NAMES, MASCOT_POLL_SLUG } from "../lib/mascot-poll";

async function main() {
  loadEnvConfig(process.cwd());
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const check = <T,>(result: { data: T; error: unknown }) => { if (result.error) throw result.error; return result.data; };
  let poll = check(await admin.from("polls").select("id, published").eq("slug", MASCOT_POLL_SLUG).maybeSingle());
  if (!poll) poll = check(await admin.from("polls").insert({
    slug: MASCOT_POLL_SLUG, title: "Como você vai me chamar?", description: "A comunidade escolhe o nome do mascote da DriveData Academy.",
    max_choices: 1, published: false, allow_suggestion: false, show_results: true,
  }).select("id, published").single());
  if (!poll) throw new Error("Poll was not created");
  const existing = check(await admin.from("poll_options").select("id, label, position").eq("poll_id", poll.id));
  if (!existing?.length) {
    check(await admin.from("poll_options").insert(MASCOT_NAMES.map((option, position) => ({ ...option, position, poll_id: poll.id }))));
  } else if (existing.length !== 5 || existing.some(option => !MASCOT_NAMES.some(name => name.label === option.label))) {
    throw new Error("Existing options differ; preserve them and review before publishing.");
  }
  if (process.argv.includes("--publish")) {
    check(await admin.from("polls").update({ published: true }).eq("id", poll.id));
  }
  const verified = check(await admin.from("polls").select("id, slug, published, max_choices, allow_suggestion, show_results, poll_options(label, position)").eq("id", poll.id).single());
  console.log(JSON.stringify(verified, null, 2));
}
main().catch(() => { console.error("Could not prepare mascot poll; no credentials were logged."); process.exitCode = 1; });
