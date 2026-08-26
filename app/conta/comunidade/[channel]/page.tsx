import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity, loadProfiles, displayName } from "@/lib/community";
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
    .select("id, user_id, body, created_at")
    .eq("channel_id", channel.id)
    .order("created_at", { ascending: false })
    .limit(80);
  const msgs = (msgsDesc ?? []).slice().reverse(); // oldest -> newest

  const ids = msgs.map((m: any) => m.user_id);
  const { nameById } = await loadProfiles(admin, [...ids, user.id]);

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

  const initial = msgs.map((m: any) => ({
    id: m.id, user_id: m.user_id, body: m.body, created_at: m.created_at,
    name: displayName(nameById, m.user_id), likes: likeCount[m.id] || 0, liked: myLiked.has(m.id),
  }));

  const me = { id: user.id, name: displayName(nameById, user.id) };

  return <ChatRoom channel={channel} channels={channels ?? []} me={me} initial={initial} />;
}
