import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadProfiles, displayName } from "@/lib/community";
import AdminError from "../AdminError";
import {
  createChannel, updateChannel, deleteChannel, moveChannel,
  togglePinThread, toggleLockThread, deleteThread,
} from "./actions";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";
const smallBtn = "rounded-lg border border-white/10 px-2.5 py-1 text-xs font-medium text-slate-300 hover:border-white/30 hover:text-white";

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

export default async function AdminComunidadePage() {
  let channels: any[] = [];
  let threads: any[] = [];
  let postCount = 0;
  let nameById: Record<string, string> = {};
  const counts: Record<string, number> = {};
  try {
    const admin = createAdminClient();
    const [{ data: chs, error }, { data: ths }, { count: pc }] = await Promise.all([
      admin.from("forum_channels").select("id, slug, name, description").order("position"),
      admin.from("forum_threads").select("id, channel_id, user_id, title, reply_count, solved, pinned, locked, created_at").order("pinned", { ascending: false }).order("created_at", { ascending: false }),
      admin.from("forum_posts").select("*", { count: "exact", head: true }),
    ]);
    if (error) throw new Error(error.message);
    channels = chs ?? [];
    threads = ths ?? [];
    postCount = pc ?? 0;
    for (const t of threads) counts[t.channel_id] = (counts[t.channel_id] || 0) + 1;
    const prof = await loadProfiles(admin, threads.map((t: any) => t.user_id));
    nameById = prof.nameById;
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Comunidade</h1>
        <div className="mt-6"><AdminError message={(e instanceof Error ? e.message : "Erro.") + " — rode o SQL da comunidade no Supabase."} /></div>
      </div>
    );
  }

  const chNameById: Record<string, string> = {};
  for (const c of channels) chNameById[c.id] = c.name;

  const totalThreads = threads.length;
  const solved = threads.filter((t) => t.solved).length;
  const unanswered = threads.filter((t) => (t.reply_count || 0) === 0).length;
  const solvedRate = totalThreads ? Math.round((solved / totalThreads) * 100) : 0;

  const stats = [
    { label: "Canais", value: channels.length, d: "M4 6h16M4 12h16M4 18h16" },
    { label: "Tópicos", value: totalThreads, d: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" },
    { label: "Respostas", value: postCount, d: "M8 10h8M8 14h5M21 12a9 9 0 11-4.5-7.8" },
    { label: "Resolvidos", value: `${solvedRate}%`, d: "M20 6L9 17l-5-5" },
    { label: "Sem resposta", value: unanswered, d: "M12 9v4m0 4h.01M10.3 3.9l-8 14A2 2 0 004 21h16a2 2 0 001.7-3l-8-14a2 2 0 00-3.4 0z" },
  ];

  const moderation = threads.slice(0, 30);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Comunidade</h1>
      <p className="mt-1 text-sm text-slate-400">Modere os tópicos e organize os canais do fórum.</p>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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

      {/* Moderação */}
      <h2 className="mt-10 font-display text-lg font-bold text-white">Moderação de tópicos</h2>
      <p className="mt-1 text-sm text-slate-400">Fixe, tranque ou remova tópicos. Clique no título para abrir.</p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/8">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Tópico</th>
              <th className="px-4 py-3">Canal</th>
              <th className="px-4 py-3">Autor</th>
              <th className="px-4 py-3 text-center">Resp.</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {moderation.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">Nenhum tópico ainda.</td></tr>
            )}
            {moderation.map((t) => (
              <tr key={t.id} className="align-top text-slate-200">
                <td className="px-4 py-3">
                  <Link href={`/conta/comunidade/t/${t.id}`} target="_blank" className="font-medium text-white hover:text-brand-green">{t.title}</Link>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {t.pinned && <span className="rounded-full bg-brand-teal/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-brand-teal">fixado</span>}
                    {t.locked && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-amber-300">trancado</span>}
                    {t.solved && <span className="rounded-full bg-brand-green/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-brand-green">resolvido</span>}
                    {(t.reply_count || 0) === 0 && <span className="rounded-full bg-white/5 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-slate-400">sem resposta</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-400">{chNameById[t.channel_id] || "—"}</td>
                <td className="px-4 py-3 text-slate-400">{displayName(nameById, t.user_id)}</td>
                <td className="px-4 py-3 text-center text-slate-400">{t.reply_count || 0}</td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-400">{fmt(t.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <form action={togglePinThread}>
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="next" value={(!t.pinned).toString()} />
                      <button className={smallBtn} title={t.pinned ? "Desafixar" : "Fixar"}>{t.pinned ? "Desafixar" : "Fixar"}</button>
                    </form>
                    <form action={toggleLockThread}>
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="next" value={(!t.locked).toString()} />
                      <button className={smallBtn} title={t.locked ? "Destrancar" : "Trancar"}>{t.locked ? "Destrancar" : "Trancar"}</button>
                    </form>
                    <form action={deleteThread}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="rounded-lg border border-white/10 px-2.5 py-1 text-xs font-medium text-slate-300 hover:border-red-400/40 hover:text-red-400" title="Excluir">Excluir</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {threads.length > 30 && <p className="mt-2 text-xs text-slate-500">Mostrando os 30 tópicos mais recentes de {threads.length}.</p>}

      {/* Canais */}
      <h2 className="mt-12 font-display text-lg font-bold text-white">Canais</h2>
      <p className="mt-1 text-sm text-slate-400">Organize os canais do fórum. Use ↑ ↓ para ordenar.</p>
      <div className="mt-4 space-y-3">
        {channels.map((c) => (
          <div key={c.id} className="glass rounded-2xl border border-white/8 p-4">
            <form action={updateChannel} className="space-y-2">
              <input type="hidden" name="id" value={c.id} />
              <div className="flex flex-wrap items-center gap-2">
                <input name="name" defaultValue={c.name} className={`${field} flex-1 font-semibold`} />
                <span className="text-xs text-slate-500">/{c.slug} · {counts[c.id] || 0} tópico(s)</span>
                <button className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/15">Salvar</button>
              </div>
              <input name="description" defaultValue={c.description ?? ""} placeholder="Descrição" className={field} />
            </form>
            <div className="mt-2 flex items-center gap-1.5">
              <form action={moveChannel}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="dir" value={-1} /><button className={smallBtn}>↑</button></form>
              <form action={moveChannel}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="dir" value={1} /><button className={smallBtn}>↓</button></form>
              <form action={deleteChannel}><input type="hidden" name="id" value={c.id} /><button className="rounded-lg border border-white/10 px-2.5 py-1 text-xs font-medium text-slate-300 hover:border-red-400/40 hover:text-red-400">Excluir</button></form>
            </div>
          </div>
        ))}
      </div>

      <form action={createChannel} className="mt-6 space-y-2 rounded-2xl border border-dashed border-white/10 p-4">
        <p className="text-sm font-semibold text-white">Novo canal</p>
        <input name="name" required placeholder="Nome (ex.: Power BI)" className={field} />
        <input name="description" placeholder="Descrição (opcional)" className={field} />
        <button className="rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2 text-sm font-semibold text-ink-900">+ Criar canal</button>
      </form>
    </div>
  );
}
