"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import { markChatSolution, signCommunityImage, chatProfiles } from "../actions";

type Msg = {
  id: string; user_id: string; body: string; created_at: string; name: string; avatar?: string | null;
  likes: number; liked: boolean;
  tag: string | null; image_url: string | null; is_solution: boolean; solved: boolean;
  reply_to: string | null; reply_name?: string | null; reply_body?: string | null;
};
type Channel = { id: string; slug: string; name: string; description: string | null };

const TAGS: { k: string; c: string }[] = [
  { k: "Dúvida", c: "#f59e0b" },
  { k: "Conquista", c: "#34e8a0" },
  { k: "Experiência", c: "#3b9dff" },
  { k: "Novidade", c: "#a78bfa" },
  { k: "Comunidade", c: "#2ee6d6" },
];
const tagColor = (t: string | null) => TAGS.find((x) => x.k === t)?.c || "#94a3b8";

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

const CHANNEL_ICONS: Record<string, string> = {
  // megafone (avisos/conversa)
  geral: "M3 11v2a1 1 0 001 1h1l4 3.5V6.5L5 10H4a1 1 0 00-1 1zM9 6.5v11M14 9a3.5 3.5 0 010 6M17 6a7 7 0 010 12",
  // colunas (Power BI)
  "power-bi": "M4 21V9M10 21V4M16 21v-9M22 21H2",
  // chip (IA)
  "inteligencia-artificial": "M8 8h8v8H8zM10 3v2M14 3v2M10 19v2M14 19v2M3 10h2M3 14h2M19 10h2M19 14h2",
  ia: "M8 8h8v8H8zM10 3v2M14 3v2M10 19v2M14 19v2M3 10h2M3 14h2M19 10h2M19 14h2",
  // código
  "html-web": "M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 6l-3 12",
  // quadro/kanban
  "gestao-de-projetos": "M4 5h16v14H4zM4 9h16M9 9v10M14 9v10",
  "gestao-projetos": "M4 5h16v14H4zM4 9h16M9 9v10M14 9v10",
};
const iconOf = (slug: string) => CHANNEL_ICONS[slug] || "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z";
function ChIcon({ slug, size = 15 }: { slug: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d={iconOf(slug)} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
  );
}

function timeStr(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
function dayStr(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(new Date(iso));
}

export default function ChatRoom({ channel, channels, me, initial }: { channel: Channel; channels: Channel[]; me: { id: string; name: string; avatar?: string | null }; initial: Msg[] }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [input, setInput] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [online, setOnline] = useState<Set<string>>(new Set([me.id]));
  const peopleCache = useRef<Record<string, { name: string; avatar: string | null }>>(
    Object.fromEntries(initial.map((m) => [m.user_id, { name: m.name, avatar: m.avatar ?? null }]))
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supa = useRef(createClient());

  function scrollToBottom() {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }
  useEffect(() => { scrollToBottom(); }, []);

  async function personFor(uid: string): Promise<{ name: string; avatar: string | null }> {
    const cached = peopleCache.current[uid];
    if (cached) return cached;
    const fallback = { name: "Aluno", avatar: null };
    try {
      const res = await chatProfiles([uid]);
      const found = res?.people?.find((p) => p.id === uid);
      const person = found ? { name: found.name, avatar: found.avatar } : fallback;
      peopleCache.current[uid] = person;
      return person;
    } catch {
      return fallback;
    }
  }

  useEffect(() => {
    const client = supa.current;
    const ch = client
      .channel(`room:${channel.id}`, { config: { presence: { key: me.id } } })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "channel_messages", filter: `channel_id=eq.${channel.id}` }, async (payload: any) => {
        const r = payload.new;
        const person = await personFor(r.user_id);
        setMessages((prev) => (prev.some((m) => m.id === r.id) ? prev : [...prev, {
          id: r.id, user_id: r.user_id, body: r.body, created_at: r.created_at, name: person.name, avatar: person.avatar, likes: 0, liked: false,
          tag: r.tag || null, image_url: r.image_url || null, is_solution: !!r.is_solution, solved: !!r.solved, reply_to: r.reply_to || null,
        }]));
        setTimeout(() => { const el = scrollRef.current; if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 200) scrollToBottom(); }, 30);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "channel_messages", filter: `channel_id=eq.${channel.id}` }, (payload: any) => {
        const r = payload.new;
        setMessages((prev) => prev.map((m) => (m.id === r.id ? { ...m, is_solution: !!r.is_solution, solved: !!r.solved, tag: r.tag ?? m.tag, body: r.body ?? m.body } : m)));
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
      .on("presence", { event: "sync" }, () => {
        const state = ch.presenceState() as Record<string, any>;
        setOnline(new Set(Object.keys(state)));
      })
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") await ch.track({ id: me.id, name: me.name });
      });
    return () => { client.removeChannel(ch); };
  }, [channel.id, me.id, me.name]);

  async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const s = await signCommunityImage(ext);
      if (!s.ok) throw new Error();
      const { error } = await supa.current.storage.from("community").uploadToSignedUrl(s.path, s.token, file, { contentType: file.type });
      if (error) throw error;
      setPendingImage(s.url);
    } catch {
      /* silencioso */
    } finally {
      setUploading(false);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text && !pendingImage) return;
    const payload: any = { channel_id: channel.id, user_id: me.id, body: text.slice(0, 4000) };
    if (tag) payload.tag = tag;
    if (replyTo) payload.reply_to = replyTo.id;
    if (pendingImage) payload.image_url = pendingImage;
    const rt = replyTo;
    setInput(""); setTag(null); setReplyTo(null); setPendingImage(null);
    const { data } = await supa.current.from("channel_messages").insert(payload).select("id, created_at").single();
    if (data) {
      peopleCache.current[me.id] = { name: me.name, avatar: me.avatar ?? null };
      setMessages((prev) => prev.some((m) => m.id === data.id) ? prev : [...prev, {
        id: data.id, user_id: me.id, body: text, created_at: data.created_at, name: me.name, avatar: me.avatar ?? null, likes: 0, liked: false,
        tag: payload.tag || null, image_url: payload.image_url || null, is_solution: false, solved: false,
        reply_to: rt?.id || null, reply_name: rt?.name || null, reply_body: rt ? rt.body.slice(0, 120) : null,
      }]);
      setTimeout(scrollToBottom, 30);
    }
  }

  async function toggleLike(m: Msg) {
    setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, liked: !x.liked } : x));
    if (m.liked) await supa.current.from("message_reactions").delete().eq("message_id", m.id).eq("user_id", me.id);
    else await supa.current.from("message_reactions").insert({ message_id: m.id, user_id: me.id });
  }

  async function solve(reply: Msg) {
    if (!reply.reply_to) return;
    const res = await markChatSolution(reply.id, reply.reply_to);
    if (res?.ok) {
      setMessages((prev) => prev.map((x) =>
        x.id === reply.id ? { ...x, is_solution: true } : x.id === reply.reply_to ? { ...x, solved: true } : x
      ));
    }
  }

  const parentOf = (m: Msg) => (m.reply_to ? messages.find((x) => x.id === m.reply_to) : null);
  const canSolve = (m: Msg) => {
    if (!m.reply_to || m.is_solution) return false;
    const p = parentOf(m);
    return !!p && p.user_id === me.id;
  };

  const [cFrom, cTo] = colorOf(channel.slug);
  const onlineCount = online.size;

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
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg text-ink-900 transition-all ${active ? "shadow-md" : "opacity-70 group-hover:opacity-100"}`} style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}><ChIcon slug={c.slug} size={13} /></span>
                <span className="truncate">{c.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/[0.06] p-3">
          <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2">
            <Avatar name={me.name} src={me.avatar ?? null} size="xs" className="ring-1 ring-white/10" />
            <span className="truncate text-xs font-medium text-slate-200">{me.name}</span>
            <span className="ml-auto h-2 w-2 rounded-full bg-brand-green shadow-[0_0_8px] shadow-brand-green/60" />
          </div>
        </div>
      </aside>

      {/* Chat */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-[0.07]" style={{ background: `radial-gradient(60% 100% at 50% 0%, ${cFrom}, transparent)` }} />
        <header className="relative flex items-center gap-2.5 border-b border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent px-4 py-3 sm:px-5 sm:py-3.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-900" style={{ backgroundImage: `linear-gradient(135deg, ${cFrom}, ${cTo})` }}><ChIcon slug={channel.slug} size={15} /></span>
          <span className="font-display font-bold text-white">{channel.name}</span>
          {channel.description && <span className="hidden truncate border-l border-white/10 pl-3 text-xs text-slate-500 md:block">{channel.description}</span>}
          <Link href="/conta/ranking" title="Ganhe pontos ajudando: solução +10, curtida +2, participar +1/dia" className="ml-auto hidden items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[0.7rem] font-medium text-amber-200 hover:bg-amber-300/20 sm:flex">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0zM7 4H4v2a3 3 0 003 3M17 4h3v2a3 3 0 01-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Pontos
          </Link>
          <span className="ml-2 flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[0.7rem] text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-green shadow-[0_0_6px] shadow-brand-green/60" />
            {onlineCount} online
          </span>
        </header>

        {/* Canais (mobile) */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-white/8 px-3 py-2 sm:hidden">
          {channels.map((c) => {
            const active = c.slug === channel.slug;
            const [f, t] = colorOf(c.slug);
            return (
              <Link key={c.id} href={`/conta/comunidade/${c.slug}`} className={`flex shrink-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-xs ${active ? "bg-white/10 text-white" : "text-slate-400"}`}>
                <span className="grid h-5 w-5 place-items-center rounded-full text-ink-900" style={{ backgroundImage: `linear-gradient(135deg, ${f}, ${t})` }}><ChIcon slug={c.slug} size={11} /></span>
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
                  <span className="relative grid h-16 w-16 place-items-center rounded-2xl text-ink-900 shadow-lg" style={{ backgroundImage: `linear-gradient(135deg, ${cFrom}, ${cTo})` }}><ChIcon slug={channel.slug} size={30} /></span>
                </div>
                <p className="font-display text-lg font-bold text-white">Bem-vindo ao #{channel.name}</p>
                <p className="mt-1 text-sm">Este é o começo do canal. Manda a primeira mensagem!</p>
              </div>
            </div>
          )}
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const newDay = !prev || dayStr(prev.created_at) !== dayStr(m.created_at);
            const grouped = prev && !newDay && prev.user_id === m.user_id && !m.tag && !m.reply_to && !m.image_url && Math.abs(new Date(m.created_at).getTime() - new Date(prev.created_at).getTime()) < 5 * 60000;
            const parent = parentOf(m);
            return (
              <div key={m.id}>
                {newDay && (
                  <div className="my-4 flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/8" />
                    <span className="rounded-full bg-white/5 px-3 py-0.5 text-[0.65rem] font-medium text-slate-400">{dayStr(m.created_at)}</span>
                    <div className="h-px flex-1 bg-white/8" />
                  </div>
                )}
                <div className={`group flex items-start gap-3 rounded-xl px-2.5 transition-colors duration-150 ${grouped ? "py-0.5" : "py-1.5"} ${m.is_solution ? "border border-brand-green/30 bg-brand-green/[0.06]" : "hover:bg-white/[0.04]"}`}>
                  <div className="w-9 shrink-0 pt-0.5">{!grouped ? <Avatar name={m.name} src={m.avatar ?? null} size="sm" className="ring-1 ring-white/10" /> : <span className="hidden text-[0.6rem] leading-6 text-slate-600 group-hover:block">{timeStr(m.created_at)}</span>}</div>
                  <div className="min-w-0 flex-1">
                    {!grouped && (
                      <p className="flex flex-wrap items-baseline gap-2">
                        <span className={`text-sm font-semibold ${m.user_id === me.id ? "text-brand-green" : "text-white"}`}>{m.name}</span>
                        {online.has(m.user_id) && <span className="h-1.5 w-1.5 rounded-full bg-brand-green" title="online" />}
                        {m.tag && <span className="rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase" style={{ color: tagColor(m.tag), background: `${tagColor(m.tag)}22` }}>{m.tag}</span>}
                        {m.solved && <span className="rounded-full bg-brand-green/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-brand-green">resolvido</span>}
                        <span className="text-[0.65rem] text-slate-500">{timeStr(m.created_at)}</span>
                      </p>
                    )}

                    {/* citação do reply */}
                    {m.reply_to && (
                      <div className="mt-1 flex items-start gap-2 rounded-lg border-l-2 border-brand-teal/50 bg-white/[0.03] px-2.5 py-1.5 text-xs">
                        <span className="text-brand-teal">↩</span>
                        <span className="min-w-0">
                          <span className="font-semibold text-slate-300">{parent?.name || m.reply_name || "mensagem"}</span>
                          <span className="ml-1.5 text-slate-500">{(parent?.body || m.reply_body || "").slice(0, 100)}</span>
                        </span>
                      </div>
                    )}

                    {m.body && <p className="mt-0.5 whitespace-pre-line break-words text-[0.92rem] leading-relaxed text-slate-200">{m.body}</p>}

                    {m.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.image_url} alt="anexo" className="mt-2 max-h-72 rounded-xl border border-white/10 object-contain" />
                    )}

                    {m.is_solution && <p className="mt-1 inline-flex items-center gap-1 text-[0.7rem] font-semibold text-brand-green"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg> Marcada como solução</p>}

                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {(m.likes > 0 || m.liked) && (
                        <button onClick={() => toggleLike(m)} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.7rem] transition-colors ${m.liked ? "border-brand-green/40 bg-brand-green/10 text-brand-green" : "border-white/10 text-slate-400 hover:border-white/20"}`}>
                          👍 {m.likes + (m.liked ? 1 : 0)}
                        </button>
                      )}
                      {canSolve(m) && (
                        <button onClick={() => solve(m)} title="Marca a resposta que resolveu sua dúvida e dá +10 pontos a quem respondeu" className="rounded-full border border-brand-green/30 px-2 py-0.5 text-[0.7rem] font-medium text-brand-green hover:bg-brand-green/10">marcar como solução <span className="text-brand-green/70">+10</span></button>
                      )}
                    </div>
                  </div>

                  {/* Ações no hover */}
                  <div className="mt-0.5 hidden shrink-0 items-center gap-1 group-hover:flex">
                    <button onClick={() => setReplyTo(m)} className="rounded-lg border border-white/10 bg-ink-800 p-1.5 text-slate-400 hover:text-brand-teal" aria-label="Responder">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M9 17l-5-5 5-5M4 12h11a5 5 0 015 5v1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                    <button onClick={() => toggleLike(m)} className={`rounded-lg border border-white/10 bg-ink-800 p-1.5 text-slate-400 hover:text-brand-green ${m.liked ? "text-brand-green" : ""}`} aria-label="Curtir">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill={m.liked ? "currentColor" : "none"}><path d="M7 10v11M2 13v6a2 2 0 002 2h13.4a2 2 0 002-1.6l1.4-7A2 2 0 0018.8 10H14V5a2 2 0 00-2-2l-3 7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Composer */}
        <div className="relative px-4 pb-4 pt-1">
          {/* reply banner */}
          {replyTo && (
            <div className="mb-1.5 flex items-center justify-between gap-2 rounded-t-xl border border-b-0 border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs">
              <span className="min-w-0 truncate text-slate-400">Respondendo <span className="font-semibold text-slate-200">{replyTo.name}</span>: {replyTo.body.slice(0, 60)}</span>
              <button onClick={() => setReplyTo(null)} className="shrink-0 text-slate-500 hover:text-white">✕</button>
            </div>
          )}
          {/* pending image */}
          {pendingImage && (
            <div className="mb-1.5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pendingImage} alt="prévia" className="h-10 w-10 rounded object-cover" />
              <span>Foto anexada</span>
              <button onClick={() => setPendingImage(null)} className="ml-auto text-slate-500 hover:text-white">remover</button>
            </div>
          )}
          {/* tags */}
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {TAGS.map((t) => (
              <button key={t.k} onClick={() => setTag(tag === t.k ? null : t.k)} className="rounded-full border px-2.5 py-0.5 text-[0.7rem] font-medium transition-colors" style={tag === t.k ? { color: "#04140d", background: t.c, borderColor: t.c } : { color: t.c, borderColor: `${t.c}55` }}>
                {t.k}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-2 py-1.5 backdrop-blur transition-all duration-200 focus-within:border-brand-green/50 focus-within:shadow-[0_0_0_3px_rgba(52,232,160,0.10)]">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.currentTarget.value = ""; }} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-40" aria-label="Anexar foto" title="Anexar foto">
              {uploading ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="animate-spin"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" /><path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 16l5-5 4 4 3-3 4 4M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              autoComplete="off"
              placeholder={`Mensagem em #${channel.name}`}
              className="flex-1 bg-transparent px-1 py-2 text-sm text-white placeholder:text-slate-500 outline-none"
            />
            <button onClick={send} disabled={!input.trim() && !pendingImage} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-r from-brand-green to-brand-blue text-ink-900 shadow-md shadow-brand-green/20 transition-transform hover:scale-105 disabled:opacity-40 disabled:shadow-none">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 12l16-8-6 16-2.5-6.5L4 12z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
