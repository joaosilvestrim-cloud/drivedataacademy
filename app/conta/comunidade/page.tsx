import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity, loadProfiles, displayName } from "@/lib/community";
import Avatar from "@/components/Avatar";

export const dynamic = "force-dynamic";

const CHANNEL_STYLE: Record<string, { from: string; to: string }> = {
  geral: { from: "#34e8a0", to: "#2ee6d6" },
  "power-bi": { from: "#fbbf24", to: "#f59e0b" },
  ia: { from: "#a78bfa", to: "#3b9dff" },
  "html-web": { from: "#3b9dff", to: "#22d3ee" },
  "gestao-projetos": { from: "#2ee6d6", to: "#34e8a0" },
};
const fallbackStyle = { from: "#3b9dff", to: "#22d3ee" };

function ago(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "agora";
  if (d < 3600) return `${Math.floor(d / 60)} min`;
  if (d < 86400) return `${Math.floor(d / 3600)} h`;
  return `${Math.floor(d / 86400)} d`;
}

export default async function ComunidadePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  if (!(await canUseCommunity(admin, user.id, user.email))) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.02] px-6 py-20 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-green to-brand-blue text-ink-900">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h1 className="font-display text-2xl font-bold text-white">Comunidade</h1>
        <p className="mt-2 text-slate-400">A comunidade é exclusiva para alunos com acesso ativo.</p>
        <Link href="/matricula" className="mt-6 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">Garantir meu acesso</Link>
      </div>
    );
  }

  const [{ data: channels }, { data: threads }, { count: totalThreads }, { count: totalPosts }] = await Promise.all([
    admin.from("forum_channels").select("id, slug, name, description").order("position"),
    admin.from("forum_threads").select("id, title, user_id, channel_id, reply_count, solved, created_at").order("created_at", { ascending: false }).limit(8),
    admin.from("forum_threads").select("*", { count: "exact", head: true }),
    admin.from("forum_posts").select("*", { count: "exact", head: true }),
  ]);

  const counts: Record<string, number> = {};
  {
    const { data: all } = await admin.from("forum_threads").select("channel_id");
    for (const t of all ?? []) counts[t.channel_id] = (counts[t.channel_id] || 0) + 1;
  }
  const { nameById } = await loadProfiles(admin, (threads ?? []).map((t: any) => t.user_id));
  const chById: Record<string, { slug: string; name: string }> = {};
  for (const c of channels ?? []) chById[c.id] = { slug: c.slug, name: c.name };

  return (
    <div>
      {/* Cabeçalho com stats */}
      <div className="glass overflow-hidden rounded-3xl border border-white/8">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-brand-green/[0.08] to-brand-blue/[0.05] p-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-white">Comunidade</h1>
            <p className="mt-1 text-sm text-slate-300">Tire dúvidas, ajude colegas e ganhe pontos.</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="font-display text-2xl font-bold text-white">{totalThreads ?? 0}</p>
              <p className="text-xs text-slate-400">tópicos</p>
            </div>
            <div className="text-center">
              <p className="font-display text-2xl font-bold text-white">{totalPosts ?? 0}</p>
              <p className="text-xs text-slate-400">respostas</p>
            </div>
            <Link href="/conta/ranking" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0zM7 4H4v2a3 3 0 003 3M17 4h3v2a3 3 0 01-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Ranking
            </Link>
          </div>
        </div>
      </div>

      {/* Canais */}
      <h2 className="mt-8 font-display text-lg font-bold text-white">Canais</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {(channels ?? []).map((c: any) => {
          const s = CHANNEL_STYLE[c.slug] || fallbackStyle;
          return (
            <Link key={c.id} href={`/conta/comunidade/${c.slug}`} className="card-hover glass flex items-start gap-4 rounded-2xl border border-white/8 p-5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl font-display text-xl font-bold text-ink-900" style={{ backgroundImage: `linear-gradient(135deg, ${s.from}, ${s.to})` }}>{c.name.charAt(0).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-lg font-bold text-white">{c.name}</h3>
                  <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-0.5 text-[0.7rem] text-slate-400">{counts[c.id] || 0}</span>
                </div>
                {c.description && <p className="mt-1 text-sm text-slate-400">{c.description}</p>}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recentes */}
      <h2 className="mt-10 font-display text-lg font-bold text-white">Atividade recente</h2>
      <div className="mt-4 space-y-2">
        {(threads ?? []).length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center">
            <p className="font-medium text-white">Ainda não há tópicos.</p>
            <p className="mt-1 text-sm text-slate-400">Abra o primeiro num canal acima.</p>
          </div>
        )}
        {(threads ?? []).map((t: any) => (
          <Link key={t.id} href={`/conta/comunidade/t/${t.id}`} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 transition-colors hover:border-white/15 hover:bg-white/[0.04]">
            <Avatar name={displayName(nameById, t.user_id)} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-white">
                {t.solved && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="mr-1.5 inline text-brand-green"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                {t.title}
              </p>
              <p className="text-xs text-slate-500">
                {displayName(nameById, t.user_id)}
                {chById[t.channel_id] && <span className="text-slate-600"> · {chById[t.channel_id].name}</span>}
                <span className="text-slate-600"> · {ago(t.created_at)} atrás</span>
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-400">{t.reply_count} resp.</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
