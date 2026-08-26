import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity, loadProfiles, displayName } from "@/lib/community";
import { sendMessage } from "../actions";
import Avatar from "@/components/Avatar";

export const dynamic = "force-dynamic";

function time(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}
function dayLabel(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

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
    .limit(100);
  const msgs = msgsDesc ?? []; // newest first (para flex-col-reverse)
  const { nameById } = await loadProfiles(admin, msgs.map((m: any) => m.user_id));

  return (
    <div className="-mx-6 -my-10 flex h-[calc(100vh-57px)] overflow-hidden bg-ink-900">
      {/* Canais (desktop) */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-white/8 bg-white/[0.02] sm:flex">
        <div className="border-b border-white/8 px-4 py-4 font-display text-sm font-bold text-white">Comunidade</div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {(channels ?? []).map((c: any) => {
            const active = c.slug === channel.slug;
            return (
              <Link key={c.id} href={`/conta/comunidade/${c.slug}`} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${active ? "bg-white/10 font-medium text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}>
                <span className="text-slate-500">#</span>
                <span className="truncate">{c.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/8 p-3">
          <Link href="/conta/ranking" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0zM7 4H4v2a3 3 0 003 3M17 4h3v2a3 3 0 01-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Ranking
          </Link>
        </div>
      </aside>

      {/* Chat */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-white/8 px-5 py-3">
          <span className="text-lg text-slate-500">#</span>
          <span className="font-display font-bold text-white">{channel.name}</span>
          {channel.description && <span className="hidden truncate border-l border-white/10 pl-3 text-xs text-slate-500 sm:block">{channel.description}</span>}
        </header>

        {/* Seletor de canais (mobile) */}
        <div className="flex gap-1 overflow-x-auto border-b border-white/8 px-3 py-2 sm:hidden">
          {(channels ?? []).map((c: any) => (
            <Link key={c.id} href={`/conta/comunidade/${c.slug}`} className={`shrink-0 rounded-full px-3 py-1 text-xs ${c.slug === channel.slug ? "bg-white/10 text-white" : "text-slate-400"}`}># {c.name}</Link>
          ))}
        </div>

        {/* Mensagens (mais nova embaixo) */}
        <div className="flex flex-1 flex-col-reverse gap-3 overflow-y-auto px-5 py-4">
          {msgs.length === 0 && (
            <div className="m-auto text-center text-slate-500">
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-green to-brand-blue text-2xl text-ink-900">#</div>
              <p className="font-medium text-white">Bem-vindo ao #{channel.name}</p>
              <p className="mt-1 text-sm">Seja o primeiro a mandar uma mensagem.</p>
            </div>
          )}
          {msgs.map((m: any, i: number) => {
            const name = displayName(nameById, m.user_id);
            // agrupa se a msg anterior (mais nova, index i-1) for do mesmo autor em janela curta
            const nextNewer = msgs[i - 1];
            const grouped = nextNewer && nextNewer.user_id === m.user_id && Math.abs(new Date(nextNewer.created_at).getTime() - new Date(m.created_at).getTime()) < 5 * 60000;
            const mine = m.user_id === user.id;
            return (
              <div key={m.id} className="flex items-start gap-3">
                <div className="w-9 shrink-0">{!grouped && <Avatar name={name} size="sm" />}</div>
                <div className="min-w-0 flex-1">
                  {!grouped && (
                    <p className="text-sm">
                      <span className={`font-semibold ${mine ? "text-brand-green" : "text-white"}`}>{name}</span>
                      <span className="ml-2 text-[0.7rem] text-slate-500">{dayLabel(m.created_at)} {time(m.created_at)}</span>
                    </p>
                  )}
                  <p className="whitespace-pre-line break-words text-[0.95rem] leading-relaxed text-slate-200">{m.body}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Enviar */}
        <div className="border-t border-white/8 p-3">
          <form action={sendMessage} className="flex items-center gap-2">
            <input type="hidden" name="channel_id" value={channel.id} />
            <input type="hidden" name="slug" value={channel.slug} />
            <input name="body" required autoComplete="off" placeholder={`Mensagem em #${channel.name}`} className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60" />
            <button className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-r from-brand-green to-brand-blue text-ink-900 transition-transform hover:scale-105">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 12l16-8-6 16-2.5-6.5L4 12z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
