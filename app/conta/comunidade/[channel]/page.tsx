import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity, loadProfiles, displayName } from "@/lib/community";
import {loadCommunityRanking} from "@/lib/community-ranking";
import {ranksForUsers} from "@/lib/ranking";
import ChatRoom from "./ChatRoom";

export const dynamic = "force-dynamic";

export default async function ChannelChat({ params }: { params: { channel: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  if (!(await canUseCommunity(admin, user.id, user.email))) redirect("/conta");

  const { data: channels } = await admin.from("forum_channels").select("id, slug, name, description").order("position");
  const channel = (channels ?? []).find((c: any) => c.slug === params.channel);
  if (!channel) notFound();

  const { data: msgsDesc } = await admin
    .from("channel_messages")
    .select("id, user_id, body, created_at, tag, reply_to, image_url, is_solution, solved")
    .eq("channel_id", channel.id)
    .order("created_at", { ascending: false })
    .limit(80);
  const msgs = (msgsDesc ?? []).slice().reverse(); // oldest -> newest

  const ids = msgs.map((m: any) => m.user_id);
  const [{ nameById, avatarById }, ranked] = await Promise.all([loadProfiles(admin, [...ids, user.id]),loadCommunityRanking()]);
  const initialRanks=ranksForUsers(ranked,[...ids,user.id]);

  // reações
  const likeCount: Record<string, number> = {};
  const myLiked = new Set<string>();
  if (msgs.length) {
    const { data: reacts } = await admin.from("message_reactions").select("message_id, user_id").in("message_id", msgs.map((m: any) => m.id));
    for (const r of reacts ?? []) {
      if (r.user_id === user.id) myLiked.add(r.message_id);
      else likeCount[r.message_id] = (likeCount[r.message_id] || 0) + 1;
    }
  }

  // prévia do reply (id -> {name, body})
  const byId: Record<string, any> = {};
  for (const m of msgs) byId[m.id] = m;

  const initial = msgs.map((m: any) => ({
    id: m.id, user_id: m.user_id, body: m.body, created_at: m.created_at,
    name: displayName(nameById, m.user_id), avatar: avatarById[m.user_id] || null,
    likes: likeCount[m.id] || 0, liked: myLiked.has(m.id),
    tag: m.tag || null, image_url: m.image_url || null, is_solution: !!m.is_solution, solved: !!m.solved,
    reply_to: m.reply_to || null,
    reply_name: m.reply_to && byId[m.reply_to] ? displayName(nameById, byId[m.reply_to].user_id) : null,
    reply_body: m.reply_to && byId[m.reply_to] ? (byId[m.reply_to].body || "").slice(0, 120) : null,
  }));

  const me = { id: user.id, name: displayName(nameById, user.id), avatar: avatarById[user.id] || null };

  return <ChatRoom key={channel.id} initialRanks={initialRanks} channel={channel} channels={channels ?? []} me={me} initial={initial} />;
}
