"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity } from "@/lib/community";

const SOLUTION_POINTS = 10;

async function requireCommunityUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const admin = createAdminClient();
  if (!(await canUseCommunity(admin, user.id, user.email))) redirect("/conta");
  return { user, admin };
}

export async function createThread(formData: FormData) {
  const { user, admin } = await requireCommunityUser();
  const channelId = formData.get("channel_id") as string;
  const title = ((formData.get("title") as string) || "").trim();
  const body = ((formData.get("body") as string) || "").trim();
  if (!channelId || !title) redirect("/conta/comunidade");

  const { data: ch } = await admin.from("forum_channels").select("slug").eq("id", channelId).maybeSingle();
  if (!ch) redirect("/conta/comunidade");

  const { data: thread } = await admin
    .from("forum_threads")
    .insert({ channel_id: channelId, user_id: user.id, title, body })
    .select("id")
    .single();

  revalidatePath(`/conta/comunidade/${ch.slug}`);
  redirect(`/conta/comunidade/t/${thread?.id ?? ""}`);
}

export async function createReply(formData: FormData) {
  const { user, admin } = await requireCommunityUser();
  const threadId = formData.get("thread_id") as string;
  const body = ((formData.get("body") as string) || "").trim();
  if (!threadId || !body) redirect(`/conta/comunidade/t/${threadId}`);

  const { data: thread } = await admin.from("forum_threads").select("id, locked").eq("id", threadId).maybeSingle();
  if (!thread || thread.locked) redirect(`/conta/comunidade/t/${threadId}`);

  await admin.from("forum_posts").insert({ thread_id: threadId, user_id: user.id, body });

  const { count } = await admin.from("forum_posts").select("*", { count: "exact", head: true }).eq("thread_id", threadId);
  await admin.from("forum_threads").update({ reply_count: count ?? 0, updated_at: new Date().toISOString() }).eq("id", threadId);

  revalidatePath(`/conta/comunidade/t/${threadId}`);
  redirect(`/conta/comunidade/t/${threadId}`);
}

export async function markSolution(formData: FormData) {
  const { user, admin } = await requireCommunityUser();
  const threadId = formData.get("thread_id") as string;
  const postId = formData.get("post_id") as string;

  // Só o autor da pergunta marca a solução.
  const { data: thread } = await admin.from("forum_threads").select("id, user_id, answer_id").eq("id", threadId).maybeSingle();
  if (!thread || thread.user_id !== user.id) redirect(`/conta/comunidade/t/${threadId}`);

  const { data: post } = await admin.from("forum_posts").select("id, user_id, thread_id").eq("id", postId).maybeSingle();
  if (!post || post.thread_id !== threadId) redirect(`/conta/comunidade/t/${threadId}`);

  // Limpa marca anterior e aplica a nova.
  await admin.from("forum_posts").update({ is_answer: false }).eq("thread_id", threadId);
  await admin.from("forum_posts").update({ is_answer: true }).eq("id", postId);
  await admin.from("forum_threads").update({ solved: true, answer_id: postId }).eq("id", threadId);

  // Pontos para o autor da resposta (não pontua responder a si mesmo). Índice único evita duplicar.
  if (post.user_id !== user.id) {
    await admin.from("point_events").insert({ user_id: post.user_id, kind: "solution", points: SOLUTION_POINTS, ref_id: postId });
  }

  revalidatePath(`/conta/comunidade/t/${threadId}`);
  redirect(`/conta/comunidade/t/${threadId}`);
}

export async function unmarkSolution(formData: FormData) {
  const { user, admin } = await requireCommunityUser();
  const threadId = formData.get("thread_id") as string;
  const { data: thread } = await admin.from("forum_threads").select("id, user_id").eq("id", threadId).maybeSingle();
  if (!thread || thread.user_id !== user.id) redirect(`/conta/comunidade/t/${threadId}`);

  await admin.from("forum_posts").update({ is_answer: false }).eq("thread_id", threadId);
  await admin.from("forum_threads").update({ solved: false, answer_id: null }).eq("id", threadId);
  // pontos já concedidos permanecem (evita mark/unmark repetido).

  revalidatePath(`/conta/comunidade/t/${threadId}`);
  redirect(`/conta/comunidade/t/${threadId}`);
}
