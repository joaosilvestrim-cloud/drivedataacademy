import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

async function main() {
  loadEnvConfig(process.cwd());
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const check = <T,>(r: { data: T; error: unknown }) => { if (r.error) throw r.error; return r.data; };
  const pollId = randomUUID();
  let created = false;
  try {
    check(await admin.from("polls").insert({ id: pollId, slug: `qa-mascot-${pollId}`, title: "Temporary private integration check", published: false }));
    created = true;
    const options = check(await admin.from("poll_options").insert([{ poll_id: pollId, label: "QA A" }, { poll_id: pollId, label: "QA B" }]).select("id"))!;
    for (const option of options) check(await admin.from("poll_votes").upsert({ poll_id: pollId, email: "qa-mascot@example.invalid", options: [option.id] }, { onConflict: "poll_id,email" }));
    const votes = check(await admin.from("poll_votes").select("options").eq("poll_id", pollId))!;
    assert.equal(votes.length, 1); assert.deepEqual(votes[0].options, [options[1].id]);
    const privateVotes = await anon.from("poll_votes").select("id").eq("poll_id", pollId);
    assert.ok(privateVotes.error || privateVotes.data?.length === 0, "Anonymous clients must not read votes");
    const deniedWrite = await anon.from("poll_votes").insert({ poll_id: pollId, email: "qa-anon@example.invalid", options: [options[0].id] });
    assert.ok(deniedWrite.error, "Anonymous clients must not write votes directly");
    console.log("PASS: database replaces duplicate vote, preserves chosen option, and blocks anonymous reads/writes.");
  } finally {
    if (created) {
      check(await admin.from("polls").delete().eq("id", pollId));
      const remaining = check(await admin.from("poll_votes").select("id").eq("poll_id", pollId));
      assert.equal(remaining?.length, 0);
      console.log("PASS: temporary private test poll and votes removed; campaign votes untouched.");
    }
  }
}
main().catch(() => { console.error("Database integration check failed; no credentials or voter data logged."); process.exitCode = 1; });
