"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity, loadProfiles, seloDaCasa } from "@/lib/community";

import {loadCommunityRanking} from "@/lib/community-ranking";
import { marcarLido } from "@/lib/comunidade-leitura";
import {ranksForUsers,validMedalIds} from "@/lib/ranking";

export async function chatMedals(ids: string[]) {
  await requireCommunityUser();
  const uniq=validMedalIds(ids);
  if(!uniq.length)return {ranks:{} as Record<string,number|null>};
  return {ranks:ranksForUsers(await loadCommunityRanking(),uniq)};
}

// O aluno abriu o canal (ou chegou mensagem com ele aberto): tudo até agora está visto.
export async function marcarCanalLido(channelId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(channelId || "")) return;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await marcarLido(user.id, channelId);
}

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

// Nome e foto de quem escreve, para o chat em tempo real. A RLS de profiles só
// libera o próprio perfil, então o navegador não consegue ler o de outro aluno.
export async function chatProfiles(ids: string[]) {
  const { admin } = await requireCommunityUser();
  const uniq = Array.from(new Set(ids)).filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 200);
  if (!uniq.length) return { ok: true as const, people: [] };
  const { nameById, avatarById, badgeById } = await loadProfiles(admin, uniq);
  return {
    ok: true as const,
    people: uniq.map((id) => ({
      id,
      name: nameById[id] || "Aluno",
      avatar: avatarById[id] || null,
      casa: seloDaCasa(badgeById[id]),
    })),
  };
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

/* Aviso por e-mail de uma mensagem da comunidade.

   Para anúncio que ninguém pode perder (novidade da plataforma, link de
   certificado): quem é da casa (Equipe, Oficial, fundação) manda a própria
   mensagem por e-mail para os assinantes ativos, com o texto formatado e o
   botão para abrir a conversa. Sai uma vez só por mensagem: o registro em
   email_log (kind comunidade:<id>) trava o segundo envio. */
export async function avisarAlunosDaMensagem(messageId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, erro: "Faça login." };
  const admin = createAdminClient();

  const { data: selos } = await admin.from("user_badges").select("badge").eq("user_id", user.id);
  if (!seloDaCasa((selos ?? []).map((b: any) => b.badge))) return { ok: false as const, erro: "Só a equipe pode avisar os alunos." };

  const { data: msg } = await admin.from("channel_messages").select("id, user_id, body, channel_id").eq("id", messageId).maybeSingle();
  if (!msg || msg.user_id !== user.id) return { ok: false as const, erro: "Só dá para avisar sobre uma mensagem sua." };
  if (!(msg.body || "").trim()) return { ok: false as const, erro: "A mensagem está vazia." };

  const tipo = `comunidade:${msg.id}`;
  const { count } = await admin.from("email_log").select("id", { count: "exact", head: true }).eq("kind", tipo).eq("status", "sent");
  if (count) return { ok: false as const, erro: `Os alunos já foram avisados desta mensagem (${count} e-mails).` };

  const [{ data: canal }, { data: perfil }, { assinantes }, { sendBrandedEmail }] = await Promise.all([
    admin.from("forum_channels").select("slug, name").eq("id", msg.channel_id).maybeSingle(),
    admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    import("@/lib/avisos-live"),
    import("@/lib/email"),
  ]);
  const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");
  const link = `${SITE}/conta/comunidade/${canal?.slug || "geral"}`;

  // O mesmo mínimo de formatação da tela: link clicável, **negrito** e quebras de linha.
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const corpo = esc(msg.body.trim())
    .replace(/\*\*([^*\n]{1,120})\*\*/g, '<b style="color:#fff">$1</b>')
    .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" style="color:#15c47e">$1</a>')
    .replace(/\n/g, "<br>");
  const primeira = msg.body.trim().split("\n")[0].replace(/\*\*/g, "").slice(0, 80);
  const autor = (perfil?.full_name || "Equipe DriveData").trim();
  const html = `
    <p style="margin:0 0 16px;color:#94a3b8;font-size:13px">${esc(autor)} publicou em #${esc(canal?.name || "Geral")}:</p>
    <div style="margin:0 0 22px;color:#cbd5e1;font-size:15px;line-height:1.65">${corpo}</div>
    <a href="${link}" style="display:inline-block;background:#15c47e;color:#04140d;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px">Ver na comunidade</a>`;

  const lista = await assinantes(admin);
  let enviados = 0;
  for (const p of lista) {
    const r = await sendBrandedEmail(p.email, `Novidade na comunidade: ${primeira}`, "Novidade na comunidade", html, { kind: tipo });
    if (r.sent) enviados++;
  }
  return { ok: true as const, enviados, total: lista.length };
}
