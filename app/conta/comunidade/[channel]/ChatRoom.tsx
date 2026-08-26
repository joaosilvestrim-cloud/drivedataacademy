"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";

type Msg = { id: string; user_id: string; body: string; created_at: string; name: string; likes: number; liked: boolean };
type Channel = { id: string; slug: string; name: string; description: string | null };

const CHANNEL_COLORS: Record<string, [string, string]> = {
  geral: ["#34e8a0", "#2ee6d6"],
  "power-bi": ["#fbbf24", "#f59e0b"],
  "inteligencia-artificial": ["#a78bfa", "#3b9dff"],
  ia: ["#a78bfa", "#3b9dff"],
  "html-web": ["#3b9dff", "#22d3ee"],
  "gestao-de-projetos": ["#2ee6d6", "#34e8a0"],
  "gestao-projetos": ["#2ee6d6", "#34e8a0"],
};
const colorOf = (slug: string): [string, string] => CHANNEL_COLORS[slug] || ["#3b9dff", "#22d3ee"];

function timeStr(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
function dayStr(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(new Date(iso));
}

export default function ChatRoom({ channel, channels, me, initial }: { channel: Channel; channels: Channel[]; me: { id: string; name: string }; initial: Msg[] }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [input, setInput] = useState("");
  const nameCache = useRef<Record<string, string>>(Object.fromEntries(initial.map((m) => [m.user_id, m.name])));
  const scrollRef = useRef<HTMLDivElement>(null);
  const supa = useRef(createClient());

  function scrollToBottom() {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }
  useEffect(() => { scrollToBottom(); }, []);

  async function nameFor(uid: string): Promise<string> {
    if (nameCache.current[uid]) return nameCache.current[uid];
    const { data } = await supa.current.from("profiles").select("full_name").eq("id", uid).maybeSingle();
    const n = (data?.full_name || "Aluno").trim() || "Aluno";
    nameCache.current[uid] = n;
    return n;
  }

  useEffect(() => {
    const client = supa.current;
    const ch = client
      .channel(`room:${channel.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "channel_messages", filter: `channel_id=eq.${channel.id}` }, async (payload: any) => {
        const r = payload.new;
        setMessages((prev) => (prev.some((m) => m.id === r.id) ? prev : prev));
        const name = await nameFor(r.user_id);
        setMessages((prev) => (prev.some((m) => m.id === r.id) ? prev : [...prev, { id: r.id, user_id: r.user_id, body: r.body, created_at: r.created_at, name, likes: 0, liked: false }]));
        setTimeout(() => { const el = scrollRef.current; if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 200) scrollToBottom(); }, 30);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, (payload: any) => {
        const row = (payload.new || payload.old) as any;
        if (!row) return;
        setMessages((prev) => prev.map((m) => {
          if (m.id !== row.message_id) return m;
          if (payload.eventType === "INSERT") return { ...m, likes: m.likes + (row.user_id === me.id ? 0 : 1), liked: row.user_id === me.id ? true : m.liked };
          if (payload.eventType === "DELETE") return { ...m, likes: Math.max(0, m.likes - (row.user_id === me.id ? 0 : 1)), liked: row.user_id === me.id ? false : m.liked };
          return m;
        }));
      })
      .subscribe();
    return () => { client.removeChannel(ch); };
  }, [channel.id, me.id]);

  async function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const { data } = await supa.current.from("channel_messages").insert({ channel_id: channel.id, user_id: me.id, body: text.slice(0, 4000) }).select("id, created_at").single();
    if (data) {
      nameCache.current[me.id] = me.name;
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, { id: data.id, user_id: me.id, body: text, created_at: data.created_at, name: me.name, likes: 0, liked: false }]));
      setTimeout(scrollToBottom, 30);
    }
  }

  async function toggleLike(m: Msg) {
    // otimista
    setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, liked: !x.liked, likes: x.likes } : x));
    if (m.liked) await supa.current.from("message_reactions").delete().eq("message_id", m.id).eq("user_id", me.id);
    else await supa.current.from("message_reactions").insert({ message_id: m.id, user_id: me.id });
  }

  const [cFrom, cTo] = colorOf(channel.slug);

  return (
    <div className="flex h-[calc(100dvh-190px)] min-h-[440px] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-800 via-ink-900 to-ink-900 shadow-2xl sm:h-[calc(100vh-150px)]">
      {/* Canais */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent sm:flex">
        <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-4 py-4">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand-green to-brand-blue text-sm font-bold text-ink-900 shadow-lg shadow-brand-green/20">D</span>
          <span className="font-display text-sm font-bold text-white">Comunidade</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-2.5">
          <p className="px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">Canais</p>
          {channels.map((c) => {
            const active = c.slug === channel.slug;
            const [from, to] = colorOf(c.slug);
            return (
              <Link key={c.id} href={`/conta/comunidade/${c.slug}`} className={`group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-all duration-200 ${active ? "bg-white/[0.06] font-medium text-white" : "text-slate-400 hover:translate-x-0.5 hover:bg-white/5 hover:text-slate-100"}`}>
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[0.7rem] font-bold text-ink-900 transition-all ${active ? "shadow-md" : "opacity-70 group-hover:opacity-100"}`} style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}>{c.name.charAt(0).toUpperCase()}</span>
                <span className="truncate">{c.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/[0.06] p-3">
          <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2">
            <Avatar name={me.name} size="xs" className="ring-1 ring-white/10" />
            <span className="truncate text-xs font-medium text-slate-200">{me.name}</span>
            <span className="ml-auto h-2 w-2 rounded-full bg-brand-green shadow-[0_0_8px] shadow-brand-green/60" />
          </div>
        </div>
      </aside>

      {/* Chat */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-[0.07]" style={{ background: `radial-gradient(60% 100% at 50% 0%, ${cFrom}, transparent)` }} />
        <header className="relative flex items-center gap-2.5 border-b border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent px-4 py-3 sm:px-5 sm:py-3.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold text-ink-900" style={{ backgroundImage: `linear-gradient(135deg, ${cFrom}, ${cTo})` }}>{channel.name.charAt(0).toUpperCase()}</span>
          <span className="font-display font-bold text-white">{channel.name}</span>
          {channel.description && <span className="hidden truncate border-l border-white/10 pl-3 text-xs text-slate-500 md:block">{channel.description}</span>}
        </header>

        {/* Canais (mobile) */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-white/8 px-3 py-2 sm:hidden">
          {channels.map((c) => {
            const active = c.slug === channel.slug;
            const [f, t] = colorOf(c.slug);
            return (
              <Link key={c.id} href={`/conta/comunidade/${c.slug}`} className={`flex shrink-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-xs ${active ? "bg-white/10 text-white" : "text-slate-400"}`}>
                <span className="grid h-5 w-5 place-items-center rounded-full text-[0.6rem] font-bold text-ink-900" style={{ backgroundImage: `linear-gradient(135deg, ${f}, ${t})` }}>{c.name.charAt(0).toUpperCase()}</span>
                {c.name}
              </Link>
            );
          })}
        </div>

        <div ref={scrollRef} className="relative flex-1 space-y-0.5 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="grid h-full place-items-center text-center text-slate-500">
              <div>
                <div className="relative mx-auto mb-4 grid h-20 w-20 place-items-center">
                  <span className="absolute inset-0 rounded-3xl opacity-40 blur-xl" style={{ backgroundImage: `linear-gradient(135deg, ${cFrom}, ${cTo})` }} />
                  <span className="relative grid h-16 w-16 place-items-center rounded-2xl text-2xl font-bold text-ink-900 shadow-lg" style={{ backgroundImage: `linear-gradient(135deg, ${cFrom}, ${cTo})` }}>{channel.name.charAt(0).toUpperCase()}</span>
                </div>
                <p className="font-display text-lg font-bold text-white">Bem-vindo ao #{channel.name}</p>
                <p className="mt-1 text-sm">Este é o começo do canal. Manda a primeira mensagem!</p>
              </div>
            </div>
          )}
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const newDay = !prev || dayStr(prev.created_at) !== dayStr(m.created_at);
            const grouped = prev && !newDay && prev.user_id === m.user_id && Math.abs(new Date(m.created_at).getTime() - new Date(prev.created_at).getTime()) < 5 * 60000;
            return (
              <div key={m.id}>
                {newDay && (
                  <div className="my-4 flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/8" />
                    <span className="rounded-full bg-white/5 px-3 py-0.5 text-[0.65rem] font-medium text-slate-400">{dayStr(m.created_at)}</span>
                    <div className="h-px flex-1 bg-white/8" />
                  </div>
                )}
                <div className={`group flex items-start gap-3 rounded-xl px-2.5 transition-colors duration-150 ${grouped ? "py-0.5" : "py-1.5"} hover:bg-white/[0.04]`}>
                  <div className="w-9 shrink-0 pt-0.5">{!grouped ? <Avatar name={m.name} size="sm" className="ring-1 ring-white/10" /> : <span className="hidden text-[0.6rem] leading-6 text-slate-600 group-hover:block">{timeStr(m.created_at)}</span>}</div>
                  <div className="min-w-0 flex-1">
                    {!grouped && (
                      <p className="flex items-baseline gap-2">
                        <span className={`text-sm font-semibold ${m.user_id === me.id ? "text-brand-green" : "text-white"}`}>{m.name}</span>
                        <span className="text-[0.65rem] text-slate-500">{timeStr(m.created_at)}</span>
                      </p>
                    )}
                    <p className="whitespace-pre-line break-words text-[0.92rem] leading-relaxed text-slate-200">{m.body}</p>
                    {(m.likes > 0 || m.liked) && (
                      <button onClick={() => toggleLike(m)} className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.7rem] transition-colors ${m.liked ? "border-brand-green/40 bg-brand-green/10 text-brand-green" : "border-white/10 text-slate-400 hover:border-white/20"}`}>
                        <span>👍</span> {m.likes + (m.liked ? 1 : 0)}
                      </button>
                    )}
                  </div>
                  {/* Ação no hover */}
                  <button onClick={() => toggleLike(m)} className={`mt-0.5 hidden shrink-0 rounded-lg border border-white/10 bg-ink-800 p-1.5 text-slate-400 hover:text-brand-green group-hover:block ${m.liked ? "text-brand-green" : ""}`} aria-label="Curtir">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill={m.liked ? "currentColor" : "none"}><path d="M7 10v11M2 13v6a2 2 0 002 2h13.4a2 2 0 002-1.6l1.4-7A2 2 0 0018.8 10H14V5a2 2 0 00-2-2l-3 7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Enviar */}
        <div className="relative px-4 pb-4 pt-1">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-2 py-1.5 backdrop-blur transition-all duration-200 focus-within:border-brand-green/50 focus-within:shadow-[0_0_0_3px_rgba(52,232,160,0.10)]">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              autoComplete="off"
              placeholder={`Mensagem em #${channel.name}`}
              className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none"
            />
            <button onClick={send} disabled={!input.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-r from-brand-green to-brand-blue text-ink-900 shadow-md shadow-brand-green/20 transition-transform hover:scale-105 disabled:opacity-40 disabled:shadow-none">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 12l16-8-6 16-2.5-6.5L4 12z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
