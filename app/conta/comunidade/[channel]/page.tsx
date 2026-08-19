import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity, loadProfiles, displayName } from "@/lib/community";
import { createThread } from "../actions";
import Avatar from "@/components/Avatar";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";

const CHANNEL_STYLE: Record<string, { from: string; to: string }> = {
  geral: { from: "#34e8a0", to: "#2ee6d6" },
  "power-bi": { from: "#fbbf24", to: "#f59e0b" },
  ia: { from: "#a78bfa", to: "#3b9dff" },
  "html-web": { from: "#3b9dff", to: "#22d3ee" },
  "gestao-projetos": { from: "#2ee6d6", to: "#34e8a0" },
};

function ago(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 3600) return `${Math.max(1, Math.floor(d / 60))} min`;
  if (d < 86400) return `${Math.floor(d / 3600)} h`;
  return `${Math.floor(d / 86400)} d`;
}

export default async function ChannelPage({ params }: { params: { channel: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  if (!(await canUseCommunity(admin, user.id, user.email))) redirect("/conta");

  const { data: channel } = await admin.from("forum_channels").select("id, slug, name, description").eq("slug", params.channel).maybeSingle();
  if (!channel) notFound();

  const { data: threads } = await admin
    .from("forum_threads")
    .select("id, title, user_id, reply_count, solved, created_at, pinned")
    .eq("channel_id", channel.id)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  const { nameById } = await loadProfiles(admin, (threads ?? []).map((t: any) => t.user_id));
  const s = CHANNEL_STYLE[channel.slug] || { from: "#3b9dff", to: "#22d3ee" };

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/conta/comunidade" className="text-xs text-slate-500 transition-colors hover:text-white">← Comunidade</Link>

      {/* Cabeçalho do canal */}
      <div className="mt-2 flex items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl font-display text-2xl font-bold text-ink-900" style={{ backgroundImage: `linear-gradient(135deg, ${s.from}, ${s.to})` }}>{channel.name.charAt(0).toUpperCase()}</span>
        <div>
          <h1 className="font-display text-2xl font-bold text-white">{channel.name}</h1>
          {channel.description && <p className="text-sm text-slate-400">{channel.description}</p>}
        </div>
      </div>

      {/* Novo tópico */}
      <details className="mt-6 glass rounded-2xl border border-white/8 p-5">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-white">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-brand-green to-brand-blue text-ink-900">+</span>
          Novo tópico
        </summary>
        <form action={createThread} className="mt-4 space-y-3">
          <input type="hidden" name="channel_id" value={channel.id} />
          <input name="title" required placeholder="Título da sua dúvida" className={field} />
          <textarea name="body" rows={4} placeholder="Descreva com detalhes (opcional)" className={`${field} resize-y`} />
          <button className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">Publicar tópico</button>
        </form>
      </details>

      {/* Tópicos */}
      <div className="mt-6 space-y-2">
        {(threads ?? []).length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center">
            <p className="font-medium text-white">Nenhum tópico neste canal ainda.</p>
            <p className="mt-1 text-sm text-slate-400">Comece a conversa acima.</p>
          </div>
        )}
        {(threads ?? []).map((t: any) => (
          <Link key={t.id} href={`/conta/comunidade/t/${t.id}`} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3.5 transition-colors hover:border-white/15 hover:bg-white/[0.04]">
            <Avatar name={displayName(nameById, t.user_id)} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-white">
                {t.pinned && <span className="mr-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-brand-teal">fixado</span>}
                {t.solved && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="mr-1.5 inline text-brand-green"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                {t.title}
              </p>
              <p className="text-xs text-slate-500">{displayName(nameById, t.user_id)} · {ago(t.created_at)} atrás</p>
            </div>
            <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-400">{t.reply_count} resp.</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
