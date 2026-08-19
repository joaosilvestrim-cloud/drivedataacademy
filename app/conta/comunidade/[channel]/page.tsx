import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity, loadProfiles, displayName } from "@/lib/community";
import { createThread } from "../actions";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";

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

  return (
    <div>
      <Link href="/conta/comunidade" className="text-xs text-slate-500 hover:text-white">← Comunidade</Link>
      <h1 className="mt-1 font-display text-2xl font-bold text-white">{channel.name}</h1>
      {channel.description && <p className="mt-1 text-sm text-slate-400">{channel.description}</p>}

      {/* Novo tópico */}
      <details className="mt-6 glass rounded-2xl border border-white/8 p-5">
        <summary className="cursor-pointer text-sm font-semibold text-white">+ Novo tópico</summary>
        <form action={createThread} className="mt-4 space-y-3">
          <input type="hidden" name="channel_id" value={channel.id} />
          <input name="title" required placeholder="Título da sua dúvida" className={field} />
          <textarea name="body" rows={4} placeholder="Descreva com detalhes (opcional)" className={`${field} resize-y`} />
          <button className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900">Publicar tópico</button>
        </form>
      </details>

      {/* Tópicos */}
      <div className="mt-6 divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/8">
        {(threads ?? []).length === 0 && <p className="px-4 py-10 text-center text-slate-500">Nenhum tópico neste canal ainda.</p>}
        {(threads ?? []).map((t: any) => (
          <Link key={t.id} href={`/conta/comunidade/t/${t.id}`} className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-white/[0.02]">
            <div className="min-w-0">
              <p className="truncate font-medium text-white">
                {t.pinned && <span className="mr-1.5 text-brand-teal">📌</span>}
                {t.solved && <span className="mr-1.5 text-brand-green">✓</span>}
                {t.title}
              </p>
              <p className="text-xs text-slate-500">{displayName(nameById, t.user_id)} · {ago(t.created_at)} atrás</p>
            </div>
            <span className="shrink-0 text-xs text-slate-400">{t.reply_count} resp.</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
