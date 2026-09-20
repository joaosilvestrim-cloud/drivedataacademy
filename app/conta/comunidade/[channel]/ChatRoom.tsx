"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";


import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import MedalAvatar from "@/components/ranking/MedalAvatar";
import {useChatMedals} from "@/components/ranking/useChatMedals";
import SeloCasa from "@/components/comunidade/SeloCasa";
import { markChatSolution, signCommunityImage, chatProfiles, marcarCanalLido } from "../actions";
import type { EstadoComunidade, EstadoCanal } from "@/lib/comunidade-leitura";

type Msg = {
  id: string; user_id: string; body: string; created_at: string; name: string; avatar?: string | null; casa?: string | null;
  likes: number; liked: boolean;
  tag: string | null; image_url: string | null; image_status?: string | null; is_solution: boolean; solved: boolean;
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

/* O texto do balão que aparece ao passar o mouse num canal com novidade. */
function textoDaNovidade(n: EstadoCanal, ativo: boolean): string {
  const partes: string[] = [];
  if (n.aguardando > 0) partes.push(`${n.aguardando} ${n.aguardando === 1 ? "mensagem de aluno aguarda" : "mensagens de alunos aguardam"} resposta da equipe`);
  if (!ativo && n.naoLidas > 0) partes.push(`${n.naoLidas} ${n.naoLidas === 1 ? "mensagem nova que você ainda não viu" : "mensagens novas que você ainda não viu"}`);
  return partes.join(" · ");
}

export default function ChatRoom({ channel, channels, me, initial, initialRanks, estadoInicial }: { initialRanks: Record<string,number|null>; channel: Channel; channels: Channel[]; me: { id: string; name: string; avatar?: string | null; casa?: string | null }; initial: Msg[]; estadoInicial?: EstadoComunidade }) {
  const tr = usarTraducao();
  /* Novidades por canal. O aluno vê o que ainda não leu; a equipe vê, além
     disso, quantas mensagens de aluno esperam resposta. Tudo começa com o que o
     servidor contou e é atualizado ao vivo pelo realtime. */
  const souEquipe = !!estadoInicial?.souEquipe;
  const equipeRef = useRef(new Set(estadoInicial?.equipe ?? []));
  const [porCanal, setPorCanal] = useState<Record<string, EstadoCanal>>(() => ({ ...(estadoInicial?.porCanal ?? {}), [channel.id]: { naoLidas: 0, aguardando: estadoInicial?.porCanal?.[channel.id]?.aguardando ?? 0 } }));
  const [dicaCanal, setDicaCanal] = useState<{ texto: string; x: number; y: number; alerta: boolean } | null>(null);
  const marcarTimer = useRef<number | null>(null);
  const totalAguardando = Object.values(porCanal).reduce((t, n) => t + n.aguardando, 0);
  const [messages, setMessages] = useState<Msg[]>(initial);
  const medalRanks=useChatMedals([me.id,...messages.map(m=>m.user_id)],initialRanks);
  const [input, setInput] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [online, setOnline] = useState<Set<string>>(new Set([me.id]));
  /* Presença com rosto: o track já mandava id e nome, agora manda avatar e selo
     para o cabeçalho mostrar quem está na sala, e não só quantos. */
  const [presentes, setPresentes] = useState<{ id: string; name: string; avatar: string | null; casa: string | null }[]>([
    { id: me.id, name: me.name, avatar: me.avatar ?? null, casa: me.casa ?? null },
  ]);
  const [noFim, setNoFim] = useState(true);
  const [mostrarMembros, setMostrarMembros] = useState(true);
  const [naoVistas, setNaoVistas] = useState(0);
  const [busca, setBusca] = useState("");
  const peopleCache = useRef<Record<string, { name: string; avatar: string | null; casa: string | null }>>(
    Object.fromEntries(initial.map((m) => [m.user_id, { name: m.name, avatar: m.avatar ?? null, casa: m.casa ?? null }]))
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supa = useRef(createClient());

  function scrollToBottom() {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setNaoVistas(0);
    setNoFim(true);
  }

  /* Quem está lendo mensagem antiga não pode ser arrastado para baixo a cada
     mensagem nova. O botão flutuante avisa e devolve o controle. */
  function aoRolar() {
    const el = scrollRef.current;
    if (!el) return;
    const fim = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setNoFim(fim);
    if (fim) setNaoVistas(0);
  }

  // Sugestões de primeira mensagem, para o canal vazio não ser uma parede em branco.
  const SUGESTOES: { texto: string; tag: string | null }[] = [
    { texto: tr("Oi, pessoal! Eu trabalho com"), tag: null },
    { texto: tr("Tô com uma dúvida:"), tag: "Dúvida" },
    { texto: tr("Olha o que eu construí:"), tag: "Conquista" },
  ];

  function usarSugestao(s: { texto: string; tag: string | null }) {
    setInput(s.texto);
    setTag(s.tag);
    inputRef.current?.focus();
  }
  useEffect(() => { scrollToBottom(); }, []);

  async function personFor(uid: string): Promise<{ name: string; avatar: string | null; casa: string | null }> {
    const cached = peopleCache.current[uid];
    if (cached) return cached;
    const fallback = { name: "Aluno", avatar: null, casa: null };
    try {
      const res = await chatProfiles([uid]);
      const found = res?.people?.find((p) => p.id === uid);
      const person = found ? { name: found.name, avatar: found.avatar, casa: found.casa } : fallback;
      peopleCache.current[uid] = person;
      return person;
    } catch {
      return fallback;
    }
  }

  useEffect(() => {
    const client = supa.current;
    const alertas = client
      .channel(`novidades:${me.id}:${channel.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "channel_messages" }, (payload: any) => {
        const r = payload.new;
        if (!r?.channel_id) return;
        const daEquipe = equipeRef.current.has(r.user_id);
        setPorCanal((prev) => {
          const atual = prev[r.channel_id] ?? { naoLidas: 0, aguardando: 0 };
          const novo = { ...atual };
          if (r.user_id !== me.id && r.channel_id !== channel.id) novo.naoLidas++;
          if (souEquipe) novo.aguardando = daEquipe ? 0 : novo.aguardando + 1;
          return { ...prev, [r.channel_id]: novo };
        });
        // Chegou mensagem no canal aberto: continua lido, sem martelar o servidor.
        if (r.channel_id === channel.id && r.user_id !== me.id && marcarTimer.current == null) {
          marcarTimer.current = window.setTimeout(() => { marcarTimer.current = null; marcarCanalLido(channel.id).catch(() => {}); }, 8000);
        }
      })
      .subscribe();
    return () => {
      client.removeChannel(alertas);
      if (marcarTimer.current != null) { window.clearTimeout(marcarTimer.current); marcarTimer.current = null; marcarCanalLido(channel.id).catch(() => {}); }
    };
  }, [channel.id, me.id, souEquipe]);

  useEffect(() => {
    const client = supa.current;
    const ch = client
      .channel(`room:${channel.id}`, { config: { presence: { key: me.id } } })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "channel_messages", filter: `channel_id=eq.${channel.id}` }, async (payload: any) => {
        const r = payload.new;
        const person = await personFor(r.user_id);
        setMessages((prev) => (prev.some((m) => m.id === r.id) ? prev : [...prev, {
          id: r.id, user_id: r.user_id, body: r.body, created_at: r.created_at, name: person.name, avatar: person.avatar, casa: person.casa, likes: 0, liked: false,
          tag: r.tag || null, image_url: r.image_url || null, image_status: r.image_status || "aprovada", is_solution: !!r.is_solution, solved: !!r.solved, reply_to: r.reply_to || null,
        }]));
        setTimeout(() => {
          const el = scrollRef.current;
          if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 200) scrollToBottom();
          else if (r.user_id !== me.id) setNaoVistas((n) => n + 1);
        }, 30);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "channel_messages", filter: `channel_id=eq.${channel.id}` }, (payload: any) => {
        const r = payload.new;
        setMessages((prev) => prev.map((m) => (m.id === r.id ? { ...m, is_solution: !!r.is_solution, solved: !!r.solved, tag: r.tag ?? m.tag, body: r.body ?? m.body, image_url: r.image_url ?? null, image_status: r.image_status ?? m.image_status } : m)));
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
        setPresentes(
          Object.values(state)
            .map((entradas: any) => entradas?.[0])
            .filter(Boolean)
            .map((p: any) => ({ id: p.id, name: p.name || "Aluno", avatar: p.avatar ?? null, casa: p.casa ?? null }))
        );
      })
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") await ch.track({ id: me.id, name: me.name, avatar: me.avatar ?? null, casa: me.casa ?? null });
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
      peopleCache.current[me.id] = { name: me.name, avatar: me.avatar ?? null, casa: me.casa ?? null };
      setMessages((prev) => prev.some((m) => m.id === data.id) ? prev : [...prev, {
        id: data.id, user_id: me.id, body: text, created_at: data.created_at, name: me.name, avatar: me.avatar ?? null, casa: me.casa ?? null, likes: 0, liked: false,
        tag: payload.tag || null, image_url: payload.image_url || null, image_status: payload.image_url ? "pendente" : null, is_solution: false, solved: false,
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

  /* Busca dentro do canal. Filtra o que já está carregado, que é a mesma
     conversa que a pessoa está vendo. Acento não atrapalha: quem digita
     "duvida" acha "dúvida". */
  const semAcento = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const q = semAcento(busca.trim());
  const visiveis = q
    ? messages.filter((m) => semAcento(`${m.body || ""} ${m.name || ""}`).includes(q))
    : messages;
  const canSolve = (m: Msg) => {
    if (!m.reply_to || m.is_solution) return false;
    const p = parentOf(m);
    return !!p && p.user_id === me.id;
  };

  const [cFrom, cTo] = colorOf(channel.slug);
  const onlineCount = online.size;

  /* Lista de membros do canal, no formato do Discord: quem está online agora
     (presença) e quem já apareceu na conversa. Os donos da casa sobem, porque
     é quem a turma procura. Não existe tabela de "membros do canal": o que dá
     para saber com verdade é isto. */
  const membros = useMemo(() => {
    const mapa = new Map<string, { id: string; name: string; avatar: string | null; casa: string | null; online: boolean }>();
    for (const p of presentes) mapa.set(p.id, { id: p.id, name: p.name, avatar: p.avatar, casa: p.casa, online: true });
    for (const m of messages) {
      if (mapa.has(m.user_id)) continue;
      mapa.set(m.user_id, { id: m.user_id, name: m.name, avatar: m.avatar ?? null, casa: m.casa ?? null, online: false });
    }
    return [...mapa.values()];
  }, [presentes, messages]);

  const grupos = useMemo(() => {
    const porNome = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "pt-BR");
    return [
      { titulo: "Fundadores", gente: membros.filter((m) => m.casa).sort(porNome) },
      { titulo: "Online", gente: membros.filter((m) => !m.casa && m.online).sort(porNome) },
      { titulo: "Ausentes", gente: membros.filter((m) => !m.casa && !m.online).sort(porNome) },
    ].filter((g) => g.gente.length > 0);
  }, [membros]);

  return (
    <div className="flex h-[calc(100dvh-140px-var(--faixa,0px))] min-h-[520px] overflow-hidden rounded-2xl border border-black/50 bg-[#0b131c] shadow-2xl sm:h-[calc(100vh-108px-var(--faixa,0px))]">
      {/* Balão do canal com novidade. Fica fora da lista (posição fixa) para não
          ser cortado pela rolagem da coluna de canais. */}
      {dicaCanal && (
        <div
          role="tooltip"
          className={`pointer-events-none fixed z-50 max-w-[260px] -translate-y-1/2 rounded-lg border px-3 py-2 text-[0.78rem] font-medium leading-snug shadow-2xl ${dicaCanal.alerta ? "border-red-500/50 bg-[#2a0f12] text-red-100" : "border-white/10 bg-[#111a24] text-slate-100"}`}
          style={{ left: dicaCanal.x, top: dicaCanal.y }}
        >
          <span className={`absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border-b border-l ${dicaCanal.alerta ? "border-red-500/50 bg-[#2a0f12]" : "border-white/10 bg-[#111a24]"}`} />
          {dicaCanal.texto}
        </div>
      )}
      {/* Coluna dos canais */}
      <aside className="hidden w-64 shrink-0 flex-col bg-[#070d14] sm:flex xl:w-72">
        <div className="flex items-center gap-2.5 border-b border-black/40 px-4 py-4 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/drivedata-symbol.png" alt="" aria-hidden="true" className="h-7 w-7 shrink-0 object-contain" />
          <span className="font-display text-base font-bold text-white">{tr("Comunidade")}</span>
          <span className="ml-auto flex items-center gap-1.5 text-[0.65rem] text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
            {onlineCount}
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <p className="px-2 pb-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-slate-500">{tr("Canais de texto")}</p>
          {souEquipe && totalAguardando > 0 && (
            <div className="mx-1 mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[0.78rem] font-bold text-red-300">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" /></span>
                {totalAguardando} {totalAguardando === 1 ? "mensagem aguarda" : "mensagens aguardam"} resposta
              </p>
              <p className="mt-0.5 text-[0.7rem] leading-snug text-red-200/70">{tr("Alunos falaram depois da última resposta da equipe. O número some quando alguém da equipe responde no canal.")}</p>
            </div>
          )}
          {channels.map((c) => {
            const active = c.slug === channel.slug;
            const [from] = colorOf(c.slug);
            const novidade = porCanal[c.id] ?? { naoLidas: 0, aguardando: 0 };
            const textoDica = textoDaNovidade(novidade, active);
            return (
              <Link
                key={c.id}
                href={`/conta/comunidade/${c.slug}`}
                onMouseEnter={(e) => { if (!textoDica) return; const r = e.currentTarget.getBoundingClientRect(); setDicaCanal({ texto: textoDica, x: r.right + 10, y: r.top + r.height / 2, alerta: souEquipe && novidade.aguardando > 0 }); }}
                onMouseLeave={() => setDicaCanal(null)}
                onClick={() => setDicaCanal(null)}
                className={`group relative mt-1 flex items-center gap-2 rounded-md px-2.5 py-2.5 text-[1rem] transition-colors ${
                  active ? "bg-white/[0.08] font-medium text-white" : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                }`}
              >
                {/* Marca do canal ativo, na cor do próprio canal. */}
                {active && <span className="absolute -left-2 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r" style={{ backgroundColor: from }} />}
                {/* Não lido, como no Discord: tracinho branco na borda e nome aceso. */}
                {!active && novidade.naoLidas > 0 && <span className="absolute -left-2 top-1/2 h-2 w-1 -translate-y-1/2 rounded-r bg-white" />}
                <span className={`text-xl font-normal leading-none ${active ? "text-slate-300" : "text-slate-600 group-hover:text-slate-500"}`}>#</span>
                <span className={`truncate ${!active && novidade.naoLidas > 0 ? "font-semibold text-white" : ""}`}>{c.name}</span>
                <span className="ml-auto flex shrink-0 items-center gap-1">
                  {souEquipe && novidade.aguardando > 0 && (
                    <span className="relative flex items-center rounded-full bg-red-500 px-1.5 py-0.5 text-[0.65rem] font-bold tabular-nums text-white shadow-[0_0_10px_rgba(239,68,68,.55)]">
                      <span className="absolute inset-0 animate-ping rounded-full bg-red-500/40" />
                      <span className="relative">{novidade.aguardando > 99 ? "99+" : novidade.aguardando}</span>
                    </span>
                  )}
                  {!active && novidade.naoLidas > 0 && !(souEquipe && novidade.aguardando > 0) && (
                    <span className="rounded-full bg-brand-green px-1.5 py-0.5 text-[0.65rem] font-bold tabular-nums text-ink-900">{novidade.naoLidas > 99 ? "99+" : novidade.naoLidas}</span>
                  )}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Barra do próprio aluno, no rodapé, como no Discord. */}
        <div className="flex items-center gap-2.5 border-t border-black/40 bg-black/25 px-3 py-2.5">
          <MedalAvatar rank={medalRanks[me.id]} casa={me.casa ?? null} name={me.name} src={me.avatar ?? null} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.85rem] font-semibold text-slate-200">{me.name}</span>
            <span className="block text-[0.65rem] text-brand-green">{tr("disponível")}</span>
          </span>
          <Link href="/conta/perfil" title={tr("Editar meu perfil")} className="grid h-7 w-7 shrink-0 place-items-center rounded text-slate-500 transition-colors hover:bg-white/5 hover:text-white">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.7" /><path d="M4 12a8 8 0 01.2-1.8l-2-1.5 2-3.4 2.3 1a8 8 0 013.1-1.8L10 2h4l.4 2.5a8 8 0 013.1 1.8l2.3-1 2 3.4-2 1.5a8 8 0 010 3.6l2 1.5-2 3.4-2.3-1a8 8 0 01-3.1 1.8L14 22h-4l-.4-2.5a8 8 0 01-3.1-1.8l-2.3 1-2-3.4 2-1.5A8 8 0 014 12z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
          </Link>
        </div>
      </aside>

      {/* Coluna da conversa */}
      <div className="relative flex min-w-0 flex-1 flex-col bg-[#0b131c]">
        <header className="relative z-10 flex items-center gap-3 border-b border-black/40 px-4 py-3.5 shadow-[0_1px_0_rgba(0,0,0,0.35)] sm:px-5">
          <span className="text-2xl font-normal leading-none text-slate-600">#</span>
          <span className="font-display text-lg font-bold text-white">{channel.name}</span>
          {channel.description && (
            <span className="hidden truncate border-l border-white/10 pl-3 text-sm text-slate-500 md:block">{channel.description}</span>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            <Link
              href="/conta/ranking"
              title={tr("Ganhe pontos ajudando: solução +10, curtida +2, participar +1/dia")}
              className="hidden items-center gap-1.5 rounded px-2 py-1 text-[0.7rem] font-medium text-amber-200/90 transition-colors hover:bg-white/5 sm:flex"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0zM7 4H4v2a3 3 0 003 3M17 4h3v2a3 3 0 01-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {tr("Pontos")}
            </Link>

            <div className="relative">
              <label htmlFor="busca-canal" className="sr-only">{tr("Buscar nesta conversa")}</label>
              <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500">
                <path d="M21 21l-4.3-4.3M11 19a8 8 0 100-16 8 8 0 000 16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <input
                id="busca-canal"
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") setBusca(""); }}
                placeholder={tr("Buscar")}
                className="w-32 rounded bg-black/40 py-2 pl-8 pr-3 text-[0.8rem] text-white placeholder:text-slate-500 outline-none transition-all focus:w-52 sm:w-40 sm:focus:w-64"
              />
            </div>

            <button
              type="button"
              onClick={() => setMostrarMembros((v) => !v)}
              title={mostrarMembros ? "Esconder membros" : "Mostrar membros"}
              aria-pressed={mostrarMembros}
              className={`hidden h-8 w-8 place-items-center rounded transition-colors lg:grid ${mostrarMembros ? "bg-white/[0.07] text-white" : "text-slate-500 hover:bg-white/5 hover:text-slate-200"}`}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M17 20v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9.5 10a4 4 0 100-8 4 4 0 000 8zM22 20v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </header>

        {/* Para a equipe: aviso fixo enquanto houver aluno esperando neste canal. */}
        {souEquipe && (porCanal[channel.id]?.aguardando ?? 0) > 0 && (
          <div className="flex items-center gap-2 border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-[0.8rem] text-red-200">
            <span className="relative flex h-2 w-2 shrink-0"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" /></span>
            <span>
              <b className="font-bold text-red-100">{porCanal[channel.id].aguardando}</b>{" "}
              {porCanal[channel.id].aguardando === 1 ? "mensagem de aluno está esperando" : "mensagens de alunos estão esperando"} {tr("resposta da equipe neste canal.")}
            </span>
          </div>
        )}

        {/* Canais (mobile) */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-black/40 px-3 py-2 sm:hidden">
          {channels.map((c) => {
            const active = c.slug === channel.slug;
            return (
              <Link key={c.id} href={`/conta/comunidade/${c.slug}`} title={textoDaNovidade(porCanal[c.id] ?? { naoLidas: 0, aguardando: 0 }, active) || undefined} className={`flex shrink-0 items-center gap-1 rounded px-2.5 py-1 text-xs ${active ? "bg-white/[0.08] text-white" : (porCanal[c.id]?.naoLidas ?? 0) > 0 ? "font-semibold text-white" : "text-slate-400"}`}>
                <span className="text-slate-600">#</span>
                {c.name}
                {souEquipe && (porCanal[c.id]?.aguardando ?? 0) > 0 ? (
                  <span className="ml-1 rounded-full bg-red-500 px-1.5 text-[0.6rem] font-bold text-white">{porCanal[c.id].aguardando}</span>
                ) : !active && (porCanal[c.id]?.naoLidas ?? 0) > 0 ? (
                  <span className="ml-1 rounded-full bg-brand-green px-1.5 text-[0.6rem] font-bold text-ink-900">{porCanal[c.id].naoLidas}</span>
                ) : null}
              </Link>
            );
          })}
        </div>

        <div ref={scrollRef} onScroll={aoRolar} className="relative flex-1 overflow-y-auto py-5">
          {q && visiveis.length === 0 && messages.length > 0 && (
            <div className="grid h-full place-items-center px-6 text-center text-slate-500">
              <div>
                <p className="text-sm">{tr("Nenhuma mensagem com “")}{busca.trim()}” neste canal.</p>
                <button type="button" onClick={() => setBusca("")} className="mt-3 rounded border border-white/10 px-4 py-1.5 text-xs text-slate-300 hover:border-white/30 hover:text-white">
                  {tr("Limpar busca")}
                </button>
              </div>
            </div>
          )}

          {/* Abertura do canal, como o Discord faz no começo do histórico. */}
          {!q && messages.length < 12 && (
            <div className="px-5 pb-7 pt-3">
              <span className="grid h-16 w-16 place-items-center rounded-full text-ink-900 shadow-lg" style={{ backgroundImage: `linear-gradient(135deg, ${cFrom}, ${cTo})` }}>
                <ChIcon slug={channel.slug} size={30} />
              </span>
              <h2 className="mt-4 font-display text-3xl font-bold text-white">{tr("Bem-vindo ao #")}{channel.name}</h2>
              <p className="mt-1.5 max-w-2xl text-base text-slate-400">
                {channel.description || "Este é o começo do canal. Puxe assunto: a conversa aqui começa com você."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {SUGESTOES.map((sg) => (
                  <button
                    key={sg.texto}
                    type="button"
                    onClick={() => usarSugestao(sg)}
                    className="rounded border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-brand-green/40 hover:text-white"
                  >
                    {sg.tag ? <span className="mr-1.5 font-semibold" style={{ color: tagColor(sg.tag) }}>{tr(sg.tag)}</span> : <span className="mr-1.5 text-brand-teal">{tr("Apresentação")}</span>}
                    {sg.texto.trim()}…
                  </button>
                ))}
              </div>
              <div className="mt-6 h-px bg-white/[0.06]" />
            </div>
          )}

          {visiveis.map((m, i) => {
            const prev = visiveis[i - 1];
            const newDay = !prev || dayStr(prev.created_at) !== dayStr(m.created_at);
            const grouped = prev && !newDay && prev.user_id === m.user_id && !m.tag && !m.reply_to && !m.image_url && Math.abs(new Date(m.created_at).getTime() - new Date(prev.created_at).getTime()) < 5 * 60000;
            const parent = parentOf(m);
            return (
              <div key={m.id}>
                {newDay && (
                  <div className="mx-4 my-4 flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/[0.08]" />
                    <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">{dayStr(m.created_at)}</span>
                    <div className="h-px flex-1 bg-white/[0.08]" />
                  </div>
                )}
                <div
                  className={`group relative flex items-start gap-4 px-5 transition-colors ${grouped ? "py-[3px]" : "mt-3.5 py-1.5"} ${
                    m.is_solution ? "border-l-2 border-brand-green bg-brand-green/[0.07]" : "hover:bg-black/25"
                  } ${m.tag && !m.is_solution ? "border-l-2" : ""}`}
                  style={m.tag && !m.is_solution ? { borderLeftColor: tagColor(m.tag) } : undefined}
                >
                  <div className="w-11 shrink-0 pt-0.5">
                    {!grouped ? (
                      <MedalAvatar rank={medalRanks[m.user_id]} casa={m.casa ?? null} name={m.name} src={m.avatar ?? null} size="md" />
                    ) : (
                      <span className="hidden text-[0.6rem] leading-6 text-slate-600 group-hover:block">{timeStr(m.created_at)}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {!grouped && (
                      <p className="flex flex-wrap items-baseline gap-2">
                        <span className={`text-[1.05rem] font-semibold ${m.casa === "Oficial" ? "text-[#9fd3ff]" : m.casa ? "text-[#f6d68c]" : m.user_id === me.id ? "text-brand-green" : "text-white"}`}>{m.name}</span>
                        <SeloCasa label={m.casa} />
                        {online.has(m.user_id) && <span className="h-1.5 w-1.5 rounded-full bg-brand-green" title={tr("online")} />}
                        {m.tag && <span className="rounded px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase" style={{ color: tagColor(m.tag), background: `${tagColor(m.tag)}22` }}>{tr(m.tag)}</span>}
                        {m.solved && <span className="rounded bg-brand-green/15 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase text-brand-green">{tr("resolvido")}</span>}
                        <span className="text-[0.72rem] text-slate-500">{timeStr(m.created_at)}</span>
                      </p>
                    )}

                    {/* citação do reply */}
                    {m.reply_to && (
                      <div className="mb-1 flex items-start gap-2 rounded border-l-2 border-brand-teal/50 bg-white/[0.03] px-2.5 py-1 text-xs">
                        <span className="text-brand-teal">↩</span>
                        <span className="min-w-0">
                          <span className="font-semibold text-slate-300">{parent?.name || m.reply_name || "mensagem"}</span>
                          <span className="ml-1.5 text-slate-500">{(parent?.body || m.reply_body || "").slice(0, 100)}</span>
                        </span>
                      </div>
                    )}

                    {m.body && <p className="whitespace-pre-line break-words text-[1.02rem] leading-[1.55] text-slate-200">{m.body}</p>}

                    {/* Imagem só aparece depois que o time aprova. Até lá, quem vê
                        sabe que existe um anexo em análise, em vez de sumir sem explicação. */}
                    {m.image_url && m.image_status !== "aprovada" ? (
                      <p className="mt-2 inline-flex items-center gap-2 rounded border border-dashed border-white/15 px-3 py-2 text-[0.8rem] text-slate-400">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="M12 7v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                        {tr("Imagem em análise pelo time")}
                      </p>
                    ) : m.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.image_url} alt={tr("anexo")} className="mt-2 max-h-72 rounded-lg border border-black/40 object-contain" />
                    ) : null}

                    {m.is_solution && (
                      <p className="mt-1 inline-flex items-center gap-1 text-[0.7rem] font-semibold text-brand-green">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        {tr("Marcada como solução")}
                      </p>
                    )}

                    {(m.likes > 0 || m.liked || canSolve(m)) && (
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {(m.likes > 0 || m.liked) && (
                          <button onClick={() => toggleLike(m)} className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[0.7rem] transition-colors ${m.liked ? "border-brand-green/40 bg-brand-green/10 text-brand-green" : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20"}`}>
                            👍 {m.likes + (m.liked ? 1 : 0)}
                          </button>
                        )}
                        {canSolve(m) && (
                          <button onClick={() => solve(m)} title={tr("Marca a resposta que resolveu sua dúvida e dá +10 pontos a quem respondeu")} className="rounded border border-brand-green/30 px-2 py-0.5 text-[0.7rem] font-medium text-brand-green hover:bg-brand-green/10">
                            {tr("marcar como solução")} <span className="text-brand-green/70">+10</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Barra de ações flutuante, no canto da mensagem, como no Discord. */}
                  <div className="absolute -top-3 right-4 z-10 hidden items-center rounded-md border border-black/60 bg-[#121c27] shadow-lg group-hover:flex">
                    <button onClick={() => toggleLike(m)} className={`grid h-7 w-7 place-items-center rounded-l-md transition-colors hover:bg-white/5 ${m.liked ? "text-brand-green" : "text-slate-400 hover:text-brand-green"}`} aria-label={tr("Curtir")} title={tr("Curtir")}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill={m.liked ? "currentColor" : "none"}><path d="M7 10v11M2 13v6a2 2 0 002 2h13.4a2 2 0 002-1.6l1.4-7A2 2 0 0018.8 10H14V5a2 2 0 00-2-2l-3 7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
                    </button>
                    <button onClick={() => setReplyTo(m)} className="grid h-7 w-7 place-items-center rounded-r-md text-slate-400 transition-colors hover:bg-white/5 hover:text-brand-teal" aria-label={tr("Responder")} title={tr("Responder")}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M9 17l-5-5 5-5M4 12h11a5 5 0 015 5v1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Composer */}
        <div className="relative px-5 pb-5 pt-1">
          {/* Leu o histórico e chegou mensagem nova: o chat avisa em vez de puxar. */}
          {!noFim && (
            <button
              type="button"
              onClick={scrollToBottom}
              className="absolute -top-10 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-black/50 bg-[#121c27] px-3.5 py-1.5 text-xs font-medium text-slate-200 shadow-lg transition-colors hover:text-white"
            >
              {naoVistas > 0 ? `${naoVistas} ${naoVistas === 1 ? "mensagem nova" : "mensagens novas"}` : "Ir para o fim"}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M19 12l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          )}

          {/* reply banner */}
          {replyTo && (
            <div className="flex items-center justify-between gap-2 rounded-t-lg bg-black/40 px-3 py-1.5 text-xs">
              <span className="min-w-0 truncate text-slate-400">{tr("Respondendo")} <span className="font-semibold text-slate-200">{replyTo.name}</span>: {replyTo.body.slice(0, 60)}</span>
              <button onClick={() => setReplyTo(null)} className="shrink-0 text-slate-500 hover:text-white">✕</button>
            </div>
          )}

          {/* pending image */}
          {pendingImage && (
            <div className="flex items-center gap-2 rounded-t-lg bg-black/40 px-3 py-1.5 text-xs text-slate-300">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pendingImage} alt={tr("prévia")} className="h-10 w-10 rounded object-cover" />
              <span>{tr("Foto anexada")}</span>
              <button onClick={() => setPendingImage(null)} className="ml-auto text-slate-500 hover:text-white">{tr("remover")}</button>
            </div>
          )}

          <div className={`flex items-center gap-1 bg-[#131d28] px-2 ${replyTo || pendingImage ? "rounded-b-lg" : "rounded-lg"}`}>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.currentTarget.value = ""; }} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="grid h-12 w-10 shrink-0 place-items-center text-slate-400 transition-colors hover:text-white disabled:opacity-40" aria-label={tr("Anexar foto")} title={tr("Anexar foto")}>
              {uploading ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="animate-spin"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" /><path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
              ) : (
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.6" /><path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              )}
            </button>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              autoComplete="off"
              placeholder={`Conversar em #${channel.name}`}
              className="flex-1 bg-transparent px-1.5 py-3.5 text-[1.02rem] text-white placeholder:text-slate-500 outline-none"
            />
            {/* Marcador do assunto, colado no campo. */}
            <div className="hidden items-center gap-1 pr-1 md:flex">
              {TAGS.map((t) => (
                <button
                  key={t.k}
                  onClick={() => setTag(tag === t.k ? null : t.k)}
                  title={`${tr("Marcar como")} ${tr(t.k)}`}
                  className="h-7 rounded px-2 text-[0.7rem] font-semibold uppercase tracking-wide transition-colors"
                  style={tag === t.k ? { color: "#04140d", background: t.c } : { color: `${t.c}cc` }}
                >
                  {tr(t.k)}
                </button>
              ))}
            </div>
            <button onClick={send} disabled={!input.trim() && !pendingImage} className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-gradient-to-r from-brand-green to-brand-blue text-ink-900 transition-transform hover:scale-105 disabled:opacity-40">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 12l16-8-6 16-2.5-6.5L4 12z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>

          {/* No celular as marcações não cabem ao lado do campo. */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 md:hidden">
            <span className="text-[0.65rem] uppercase tracking-wider text-slate-500">{tr("Marcar")}</span>
            {TAGS.map((t) => (
              <button key={t.k} onClick={() => setTag(tag === t.k ? null : t.k)} className="rounded border px-2 py-0.5 text-[0.65rem] font-medium" style={tag === t.k ? { color: "#04140d", background: t.c, borderColor: t.c } : { color: t.c, borderColor: `${t.c}55` }}>
                {tr(t.k)}
              </button>
            ))}
          </div>

          <p className="mt-2 px-1 text-[0.72rem] text-slate-600">{tr("Enter envia · solução dá +10 pontos a quem respondeu")}</p>
        </div>
      </div>

      {/* Coluna dos membros */}
      {mostrarMembros && (
        <aside className="hidden w-60 shrink-0 flex-col overflow-y-auto border-l border-black/40 bg-[#070d14] py-5 lg:flex xl:w-72">
          {grupos.map((g) => (
            <div key={g.titulo} className="mb-5 px-3.5">
              <p className="mb-2 px-1 text-[0.7rem] font-bold uppercase tracking-wider text-slate-500">
                {g.titulo} — {g.gente.length}
              </p>
              {g.gente.map((p) => (
                <span
                  key={p.id}
                  title={p.online ? `${p.name} está online` : `${p.name} já participou deste canal`}
                  className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-white/[0.04] ${p.online ? "" : "opacity-45"}`}
                >
                  <MedalAvatar name={p.name} src={p.avatar} casa={p.casa} rank={medalRanks[p.id]} size="sm" />
                  <span className={`truncate text-[0.92rem] ${p.casa === "Oficial" ? "font-semibold text-[#9fd3ff]" : p.casa ? "font-semibold text-[#f6d68c]" : "text-slate-300"}`}>
                    {p.name}
                    {p.id === me.id && <span className="ml-1 text-[0.65rem] text-slate-500">{tr("(você)")}</span>}
                  </span>
                </span>
              ))}
            </div>
          ))}
        </aside>
      )}
    </div>
  );
}
