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

export async function sendMessage(formData: FormData) {
  const { user, admin } = await requireCommunityUser();
  const channelId = formData.get("channel_id") as string;
  const slug = formData.get("slug") as string;
  const body = ((formData.get("body") as string) || "").trim();
  if (!channelId || !body) redirect(`/conta/comunidade/${slug}`);
  await admin.from("channel_messages").insert({ channel_id: channelId, user_id: user.id, body: body.slice(0, 4000) });
  revalidatePath(`/conta/comunidade/${slug}`);
  redirect(`/conta/comunidade/${slug}`);
}

export async function toggleLike(formData: FormData) {
  const { user, admin } = await requireCommunityUser();
  const postId = formData.get("post_id") as string;
  const threadId = formData.get("thread_id") as string;
  const { data: existing } = await admin.from("forum_reactions").select("post_id").eq("post_id", postId).eq("user_id", user.id).maybeSingle();
  if (existing) await admin.from("forum_reactions").delete().eq("post_id", postId).eq("user_id", user.id);
  else await admin.from("forum_reactions").insert({ post_id: postId, user_id: user.id });
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

// ---------- Chat (novo modelo) ----------

// Autor da dúvida marca a mensagem que resolveu -> pontua o solucionador.
export async function markChatSolution(replyId: string, parentId: string) {
  const { user, admin } = await requireCommunityUser();
  if (!replyId || !parentId) return { ok: false as const };
  const { data: parent } = await admin.from("channel_messages").select("id, user_id, channel_id").eq("id", parentId).maybeSingle();
  if (!parent || parent.user_id !== user.id) return { ok: false as const };
  const { data: reply } = await admin.from("channel_messages").select("id, user_id").eq("id", replyId).maybeSingle();
  if (!reply) return { ok: false as const };

  await admin.from("channel_messages").update({ is_solution: true }).eq("id", replyId);
  await admin.from("channel_messages").update({ solved: true }).eq("id", parentId);
  if (reply.user_id !== user.id) {
    await admin.from("point_events").insert({ user_id: reply.user_id, kind: "solution", points: SOLUTION_POINTS, ref_id: replyId }).then(() => {}, () => {});
  }
  return { ok: true as const };
}

// URL assinada para o aluno subir uma foto na comunidade (bucket público "community").
export async function signCommunityImage(ext: string) {
  const { admin } = await requireCommunityUser();
  const bucket = "community";
  await admin.storage.createBucket(bucket, { public: true }).catch(() => {});
  const clean = (ext || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${clean}`;
  const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, error: error?.message || "falha" };
  const pub = admin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  return { ok: true as const, path: data.path, token: data.token, url: pub };
}
