import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity, loadProfiles, displayName } from "@/lib/community";

export const dynamic = "force-dynamic";

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
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-white">Comunidade</h1>
        <p className="mt-2 text-slate-400">A comunidade é exclusiva para alunos com acesso ativo.</p>
        <Link href="/matricula" className="mt-6 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900">Garantir meu acesso</Link>
      </div>
    );
  }

  const [{ data: channels }, { data: threads }] = await Promise.all([
    admin.from("forum_channels").select("id, slug, name, description").order("position"),
    admin.from("forum_threads").select("id, title, user_id, channel_id, reply_count, solved, created_at").order("created_at", { ascending: false }).limit(8),
  ]);

  const counts: Record<string, number> = {};
  {
    const { data: all } = await admin.from("forum_threads").select("channel_id");
    for (const t of all ?? []) counts[t.channel_id] = (counts[t.channel_id] || 0) + 1;
  }
  const { nameById } = await loadProfiles(admin, (threads ?? []).map((t: any) => t.user_id));
  const chBySlug: Record<string, string> = {};
  for (const c of channels ?? []) chBySlug[c.id] = c.slug;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Comunidade</h1>
          <p className="mt-1 text-sm text-slate-400">Tire dúvidas, ajude colegas e ganhe pontos.</p>
        </div>
        <Link href="/conta/ranking" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 hover:border-brand-green/50 hover:text-brand-green">🏆 Ranking</Link>
      </div>

      {/* Canais */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {(channels ?? []).map((c: any) => (
          <Link key={c.id} href={`/conta/comunidade/${c.slug}`} className="card-hover glass rounded-2xl border border-white/8 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">{c.name}</h2>
              <span className="text-xs text-slate-500">{counts[c.id] || 0} tópico(s)</span>
            </div>
            {c.description && <p className="mt-1 text-sm text-slate-400">{c.description}</p>}
          </Link>
        ))}
      </div>

      {/* Recentes */}
      <h2 className="mt-10 font-display text-lg font-bold text-white">Atividade recente</h2>
      <div className="mt-4 divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/8">
        {(threads ?? []).length === 0 && <p className="px-4 py-10 text-center text-slate-500">Ainda não há tópicos. Seja o primeiro!</p>}
        {(threads ?? []).map((t: any) => (
          <Link key={t.id} href={`/conta/comunidade/t/${t.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-white/[0.02]">
            <div className="min-w-0">
              <p className="truncate font-medium text-white">
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
