"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";

type Msg = { id: string; user_id: string; body: string; created_at: string; name: string; likes: number; liked: boolean };
type Channel = { id: string; slug: string; name: string; description: string | null };

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

  return (
    <div className="-mx-6 -my-10 flex h-[calc(100vh-57px)] overflow-hidden bg-ink-900">
      {/* Canais */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-white/8 bg-ink-800/50 sm:flex">
        <div className="flex items-center gap-2 border-b border-white/8 px-4 py-4">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand-green to-brand-blue text-sm font-bold text-ink-900">D</span>
          <span className="font-display text-sm font-bold text-white">Comunidade</span>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          <p className="px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">Canais</p>
          {channels.map((c) => {
            const active = c.slug === channel.slug;
            return (
              <Link key={c.id} href={`/conta/comunidade/${c.slug}`} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${active ? "bg-white/10 font-medium text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}>
                <span className={active ? "text-brand-green" : "text-slate-600"}>#</span>
                <span className="truncate">{c.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/8 p-3">
          <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2">
            <Avatar name={me.name} size="xs" />
            <span className="truncate text-xs text-slate-300">{me.name}</span>
          </div>
        </div>
      </aside>

      {/* Chat */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-white/8 bg-ink-800/30 px-5 py-3.5">
          <span className="text-lg text-slate-500">#</span>
          <span className="font-display font-bold text-white">{channel.name}</span>
          {channel.description && <span className="hidden truncate border-l border-white/10 pl-3 text-xs text-slate-500 sm:block">{channel.description}</span>}
        </header>

        {/* Canais (mobile) */}
        <div className="flex gap-1 overflow-x-auto border-b border-white/8 px-3 py-2 sm:hidden">
          {channels.map((c) => (
            <Link key={c.id} href={`/conta/comunidade/${c.slug}`} className={`shrink-0 rounded-full px-3 py-1 text-xs ${c.slug === channel.slug ? "bg-white/10 text-white" : "text-slate-400"}`}># {c.name}</Link>
          ))}
        </div>

        <div ref={scrollRef} className="flex-1 space-y-0.5 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="grid h-full place-items-center text-center text-slate-500">
              <div>
                <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-green to-brand-blue text-2xl text-ink-900">#</div>
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
                <div className={`group flex items-start gap-3 rounded-lg px-2 ${grouped ? "py-0.5" : "py-1.5"} hover:bg-white/[0.03]`}>
                  <div className="w-9 shrink-0 pt-0.5">{!grouped ? <Avatar name={m.name} size="sm" /> : <span className="hidden text-[0.6rem] text-slate-600 group-hover:block">{timeStr(m.created_at)}</span>}</div>
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
        <div className="px-4 pb-4 pt-1">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-1.5 focus-within:border-brand-green/50">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              autoComplete="off"
              placeholder={`Mensagem em #${channel.name}`}
              className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none"
            />
            <button onClick={send} disabled={!input.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-r from-brand-green to-brand-blue text-ink-900 transition-transform hover:scale-105 disabled:opacity-40">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 12l16-8-6 16-2.5-6.5L4 12z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
