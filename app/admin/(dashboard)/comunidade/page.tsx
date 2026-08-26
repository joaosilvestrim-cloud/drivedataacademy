import { createAdminClient } from "@/lib/supabase/admin";
import { loadProfiles, displayName } from "@/lib/community";
import AdminError from "../AdminError";
import {
  createChannel, updateChannel, deleteChannel, moveChannel, deleteMessage,
} from "./actions";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";
const smallBtn = "rounded-lg border border-white/10 px-2.5 py-1 text-xs font-medium text-slate-300 hover:border-white/30 hover:text-white";

const CHANNEL_COLORS: Record<string, [string, string]> = {
  geral: ["#34e8a0", "#2ee6d6"],
  "power-bi": ["#fbbf24", "#f59e0b"],
  "inteligencia-artificial": ["#a78bfa", "#3b9dff"],
  "html-web": ["#3b9dff", "#22d3ee"],
  "gestao-de-projetos": ["#2ee6d6", "#34e8a0"],
};
function colorOf(slug: string): [string, string] {
  return CHANNEL_COLORS[slug] || ["#3b9dff", "#22d3ee"];
}

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

export default async function AdminComunidadePage() {
  let channels: any[] = [];
  let messages: any[] = [];
  let msgCount = 0;
  let likeCount = 0;
  let nameById: Record<string, string> = {};
  const counts: Record<string, number> = {};
  const likesByMsg: Record<string, number> = {};
  let activeMembers = 0;
  try {
    const admin = createAdminClient();
    const [{ data: chs, error }, { data: msgs }, { count: mc }, { count: lc }] = await Promise.all([
      admin.from("forum_channels").select("id, slug, name, description").order("position"),
      admin.from("channel_messages").select("id, channel_id, user_id, body, created_at").order("created_at", { ascending: false }).limit(50),
      admin.from("channel_messages").select("*", { count: "exact", head: true }),
      admin.from("message_reactions").select("*", { count: "exact", head: true }),
    ]);
    if (error) throw new Error(error.message);
    channels = chs ?? [];
    messages = msgs ?? [];
    msgCount = mc ?? 0;
    likeCount = lc ?? 0;

    // curtidas por mensagem (só das exibidas) e nomes dos autores
    const shownIds = messages.map((m: any) => m.id);
    if (shownIds.length) {
      const { data: reacts } = await admin.from("message_reactions").select("message_id").in("message_id", shownIds);
      for (const r of reacts ?? []) likesByMsg[r.message_id] = (likesByMsg[r.message_id] || 0) + 1;
    }
    const prof = await loadProfiles(admin, messages.map((m: any) => m.user_id));
    nameById = prof.nameById;

    // contagens por canal + membros ativos (autores distintos)
    const { data: allForCount } = await admin.from("channel_messages").select("channel_id, user_id");
    const seen = new Set<string>();
    for (const m of allForCount ?? []) {
      counts[m.channel_id] = (counts[m.channel_id] || 0) + 1;
      if (m.user_id) seen.add(m.user_id);
    }
    activeMembers = seen.size;
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Comunidade</h1>
        <div className="mt-6"><AdminError message={(e instanceof Error ? e.message : "Erro.") + " — rode o SQL do chat (channel_messages / message_reactions) no Supabase."} /></div>
      </div>
    );
  }

  const chById: Record<string, any> = {};
  for (const c of channels) chById[c.id] = c;

  const stats = [
    { label: "Canais", value: channels.length, d: "M4 6h16M4 12h16M4 18h16" },
    { label: "Mensagens", value: msgCount, d: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" },
    { label: "Curtidas", value: likeCount, d: "M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" },
    { label: "Membros ativos", value: activeMembers, d: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Comunidade</h1>
      <p className="mt-1 text-sm text-slate-400">Modere o chat em tempo real, organize os canais e controle o acesso.</p>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-2xl border border-white/8 p-4">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-green/10">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-brand-green"><path d={s.d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Moderação do chat */}
      <h2 className="mt-10 font-display text-lg font-bold text-white">Moderação do chat</h2>
      <p className="mt-1 text-sm text-slate-400">Mensagens mais recentes de todos os canais. Excluir remove a mensagem do chat em tempo real.</p>
      <div className="mt-4 space-y-2">
        {messages.length === 0 && (
          <p className="rounded-2xl border border-dashed border-white/10 px-4 py-12 text-center text-slate-500">Nenhuma mensagem ainda.</p>
        )}
        {messages.map((m) => {
          const ch = chById[m.channel_id];
          const [c1, c2] = colorOf(ch?.slug || "geral");
          return (
            <div key={m.id} className="group flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-3.5 transition-colors hover:border-white/15">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-bold text-ink-900" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                {(displayName(nameById, m.user_id) || "A").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-white">{displayName(nameById, m.user_id)}</span>
                  <span className="rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase" style={{ color: c1, background: `${c1}22` }}>#{ch?.name || "canal"}</span>
                  <span className="text-xs text-slate-500">{fmt(m.created_at)}</span>
                  {(likesByMsg[m.id] || 0) > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-rose-400"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" /></svg>
                      {likesByMsg[m.id]}
                    </span>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-200">{m.body}</p>
              </div>
              <form action={deleteMessage} className="shrink-0">
                <input type="hidden" name="id" value={m.id} />
                <button className="rounded-lg border border-white/10 px-2.5 py-1 text-xs font-medium text-slate-400 opacity-0 transition hover:border-red-400/40 hover:text-red-400 group-hover:opacity-100" title="Excluir mensagem">Excluir</button>
              </form>
            </div>
          );
        })}
      </div>
      {msgCount > 50 && <p className="mt-2 text-xs text-slate-500">Mostrando as 50 mensagens mais recentes de {msgCount}.</p>}

      {/* Canais */}
      <h2 className="mt-12 font-display text-lg font-bold text-white">Canais</h2>
      <p className="mt-1 text-sm text-slate-400">Cada canal é uma "sala" do chat. Use ↑ ↓ para ordenar como aparecem para o aluno.</p>
      <div className="mt-4 space-y-3">
        {channels.map((c) => {
          const [c1, c2] = colorOf(c.slug);
          return (
            <div key={c.id} className="glass rounded-2xl border border-white/8 p-4">
              <form action={updateChannel} className="space-y-2">
                <input type="hidden" name="id" value={c.id} />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold text-ink-900" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <input name="name" defaultValue={c.name} className={`${field} flex-1 font-semibold`} />
                  <span className="text-xs text-slate-500">/{c.slug} · {counts[c.id] || 0} msg</span>
                  <button className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/15">Salvar</button>
                </div>
                <input name="description" defaultValue={c.description ?? ""} placeholder="Descrição (aparece no topo do canal)" className={field} />
              </form>
              <div className="mt-2 flex items-center gap-1.5">
                <form action={moveChannel}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="dir" value={-1} /><button className={smallBtn}>↑</button></form>
                <form action={moveChannel}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="dir" value={1} /><button className={smallBtn}>↓</button></form>
                <form action={deleteChannel}><input type="hidden" name="id" value={c.id} /><button className="rounded-lg border border-white/10 px-2.5 py-1 text-xs font-medium text-slate-300 hover:border-red-400/40 hover:text-red-400">Excluir</button></form>
              </div>
            </div>
          );
        })}
      </div>

      <form action={createChannel} className="mt-6 space-y-2 rounded-2xl border border-dashed border-white/10 p-4">
        <p className="text-sm font-semibold text-white">Novo canal</p>
        <input name="name" required placeholder="Nome (ex.: Power BI)" className={field} />
        <input name="description" placeholder="Descrição (opcional)" className={field} />
        <button className="rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2 text-sm font-semibold text-ink-900">+ Criar canal</button>
      </form>

      {/* Permissões / acesso */}
      <h2 className="mt-12 font-display text-lg font-bold text-white">Permissões de acesso</h2>
      <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-blue/10">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-brand-blue"><path d="M12 1l9 4v6c0 5-3.8 9-9 11-5.2-2-9-6-9-11V5l9-4z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div className="text-sm text-slate-300">
            <p className="font-semibold text-white">Quem entra na comunidade</p>
            <p className="mt-1 text-slate-400">Só quem tem <span className="text-slate-200">acesso a algum treinamento</span> (via Turma, Acesso Full ou matrícula) participa do chat. Alunos sem acesso não conseguem abrir a comunidade.</p>
            <ul className="mt-3 space-y-1.5 text-slate-400">
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-brand-green" /> Libere alunos em <span className="text-slate-200">Vendas → Turmas</span> (em lote) ou <span className="text-slate-200">Acessos</span>.</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-brand-green" /> Para tirar alguém do chat, remova o acesso dele em <span className="text-slate-200">Acessos</span>.</li>
              <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-brand-green" /> Toda mensagem enviada é atribuída ao autor — dá pra excluir individualmente acima.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
