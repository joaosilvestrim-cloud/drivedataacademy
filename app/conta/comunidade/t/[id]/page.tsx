import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity, loadProfiles, displayName, BADGE_LABELS } from "@/lib/community";
import { createReply, markSolution, unmarkSolution } from "../../actions";
import Avatar from "@/components/Avatar";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

function Badges({ list }: { list?: string[] }) {
  if (!list?.length) return null;
  return (
    <>
      {list.map((b) => (
        <span key={b} className="ml-1.5 rounded-full bg-brand-teal/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-brand-teal">
          {BADGE_LABELS[b] || b}
        </span>
      ))}
    </>
  );
}

export default async function ThreadPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  if (!(await canUseCommunity(admin, user.id, user.email))) redirect("/conta");

  const { data: thread } = await admin
    .from("forum_threads")
    .select("id, channel_id, user_id, title, body, solved, answer_id, locked, created_at")
    .eq("id", params.id)
    .maybeSingle();
  if (!thread) notFound();

  const [{ data: channel }, { data: posts }] = await Promise.all([
    admin.from("forum_channels").select("slug, name").eq("id", thread.channel_id).maybeSingle(),
    admin.from("forum_posts").select("id, user_id, body, is_answer, created_at").eq("thread_id", thread.id).order("is_answer", { ascending: false }).order("created_at"),
  ]);

  const ids = [thread.user_id, ...(posts ?? []).map((p: any) => p.user_id)];
  const { nameById, badgeById } = await loadProfiles(admin, ids);
  const isAuthor = thread.user_id === user.id;
  const authorName = displayName(nameById, thread.user_id);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={channel ? `/conta/comunidade/${channel.slug}` : "/conta/comunidade"} className="text-xs text-slate-500 transition-colors hover:text-white">← {channel?.name || "Comunidade"}</Link>

      {/* Pergunta */}
      <div className={`mt-2 overflow-hidden rounded-2xl border ${thread.solved ? "border-brand-green/25" : "border-white/8"} bg-white/[0.02]`}>
        <div className="flex items-start gap-4 p-6">
          <Avatar name={authorName} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-white">{thread.title}</h1>
              {thread.solved && <span className="inline-flex items-center gap-1 rounded-full bg-brand-green/15 px-2.5 py-1 text-xs font-semibold text-brand-green"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>Resolvido</span>}
            </div>
            <p className="mt-1 text-xs text-slate-500">{authorName}<Badges list={badgeById[thread.user_id]} /> · {fmt(thread.created_at)}</p>
            {thread.body && <p className="mt-4 whitespace-pre-line text-[0.95rem] leading-relaxed text-slate-200">{thread.body}</p>}
            {isAuthor && thread.solved && (
              <form action={unmarkSolution} className="mt-4">
                <input type="hidden" name="thread_id" value={thread.id} />
                <button className="text-xs text-slate-500 transition-colors hover:text-slate-300">Desmarcar solução</button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Respostas */}
      <div className="mt-8 flex items-center gap-2">
        <h2 className="font-display text-lg font-bold text-white">{(posts ?? []).length} resposta(s)</h2>
        {!thread.solved && (posts ?? []).length > 0 && isAuthor && (
          <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[0.7rem] text-slate-400">marque a que resolveu →</span>
        )}
      </div>

      <div className="mt-4 space-y-4">
        {(posts ?? []).map((p: any) => {
          const name = displayName(nameById, p.user_id);
          return (
            <div key={p.id} className={`overflow-hidden rounded-2xl border ${p.is_answer ? "border-brand-green/40" : "border-white/8"} bg-white/[0.02]`}>
              {p.is_answer && (
                <div className="flex items-center gap-2 bg-brand-green/10 px-5 py-2 text-xs font-semibold text-brand-green">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Solução escolhida
                </div>
              )}
              <div className="flex items-start gap-4 p-5">
                <Avatar name={name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">{name}<Badges list={badgeById[p.user_id]} /> · {fmt(p.created_at)}</p>
                  <p className="mt-2 whitespace-pre-line text-[0.95rem] leading-relaxed text-slate-200">{p.body}</p>
                  {isAuthor && !p.is_answer && (
                    <form action={markSolution} className="mt-3">
                      <input type="hidden" name="thread_id" value={thread.id} />
                      <input type="hidden" name="post_id" value={p.id} />
                      <button className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-brand-green/50 hover:text-brand-green"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Marcar como solução</button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {(posts ?? []).length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-slate-500">Nenhuma resposta ainda. Seja o primeiro a ajudar.</div>
        )}
      </div>

      {/* Responder */}
      {thread.locked ? (
        <p className="mt-8 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-slate-400">Este tópico está fechado para novas respostas.</p>
      ) : (
        <div className="mt-8 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <p className="text-sm font-semibold text-white">Sua resposta</p>
          <form action={createReply} className="mt-3 space-y-3">
            <input type="hidden" name="thread_id" value={thread.id} />
            <textarea name="body" rows={4} required placeholder="Escreva sua resposta..." className={`${field} resize-y`} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-500">Resposta marcada como solução vale <span className="text-brand-green">+10 pontos</span>.</p>
              <button className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">Responder</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
