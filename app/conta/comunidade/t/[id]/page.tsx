import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity, loadProfiles, displayName, BADGE_LABELS } from "@/lib/community";
import { createReply, markSolution, unmarkSolution } from "../../actions";

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

  return (
    <div>
      <Link href={channel ? `/conta/comunidade/${channel.slug}` : "/conta/comunidade"} className="text-xs text-slate-500 hover:text-white">← {channel?.name || "Comunidade"}</Link>

      {/* Pergunta */}
      <div className="mt-2 rounded-2xl border border-white/8 bg-white/[0.02] p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-bold text-white">{thread.title}</h1>
          {thread.solved && <span className="rounded-full bg-brand-green/15 px-2.5 py-1 text-xs font-semibold text-brand-green">Resolvido ✓</span>}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {displayName(nameById, thread.user_id)}<Badges list={badgeById[thread.user_id]} /> · {fmt(thread.created_at)}
        </p>
        {thread.body && <p className="mt-4 whitespace-pre-line text-[0.95rem] leading-relaxed text-slate-200">{thread.body}</p>}
        {isAuthor && thread.solved && (
          <form action={unmarkSolution} className="mt-4">
            <input type="hidden" name="thread_id" value={thread.id} />
            <button className="text-xs text-slate-500 hover:text-slate-300">Desmarcar solução</button>
          </form>
        )}
      </div>

      {/* Respostas */}
      <h2 className="mt-8 font-display text-lg font-bold text-white">{(posts ?? []).length} resposta(s)</h2>
      <div className="mt-4 space-y-4">
        {(posts ?? []).map((p: any) => (
          <div key={p.id} className={`rounded-2xl border p-5 ${p.is_answer ? "border-brand-green/40 bg-brand-green/[0.06]" : "border-white/8 bg-white/[0.02]"}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {displayName(nameById, p.user_id)}<Badges list={badgeById[p.user_id]} /> · {fmt(p.created_at)}
              </p>
              {p.is_answer && <span className="rounded-full bg-brand-green/15 px-2.5 py-1 text-xs font-semibold text-brand-green">Solução</span>}
            </div>
            <p className="mt-3 whitespace-pre-line text-[0.95rem] leading-relaxed text-slate-200">{p.body}</p>
            {isAuthor && !p.is_answer && (
              <form action={markSolution} className="mt-3">
                <input type="hidden" name="thread_id" value={thread.id} />
                <input type="hidden" name="post_id" value={p.id} />
                <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-brand-green/50 hover:text-brand-green">Marcar como solução</button>
              </form>
            )}
          </div>
        ))}
        {(posts ?? []).length === 0 && <p className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-slate-500">Nenhuma resposta ainda.</p>}
      </div>

      {/* Responder */}
      {thread.locked ? (
        <p className="mt-8 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-slate-400">Este tópico está fechado para novas respostas.</p>
      ) : (
        <form action={createReply} className="mt-8 space-y-3">
          <input type="hidden" name="thread_id" value={thread.id} />
          <textarea name="body" rows={4} required placeholder="Escreva sua resposta..." className={`${field} resize-y`} />
          <button className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900">Responder</button>
          <p className="text-xs text-slate-500">Se sua resposta resolver a dúvida, o autor pode marcá-la como solução e você ganha 10 pontos.</p>
        </form>
      )}
    </div>
  );
}
