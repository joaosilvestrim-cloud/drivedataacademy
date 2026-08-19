import { createAdminClient } from "@/lib/supabase/admin";
import AdminError from "../AdminError";
import { createChannel, updateChannel, deleteChannel, moveChannel } from "./actions";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";
const smallBtn = "rounded-lg border border-white/10 px-2.5 py-1 text-xs font-medium text-slate-300 hover:border-white/30 hover:text-white";

export default async function AdminComunidadePage() {
  let channels: any[] = [];
  let counts: Record<string, number> = {};
  try {
    const admin = createAdminClient();
    const [{ data, error }, { data: threads }] = await Promise.all([
      admin.from("forum_channels").select("id, slug, name, description").order("position"),
      admin.from("forum_threads").select("channel_id"),
    ]);
    if (error) throw new Error(error.message);
    channels = data ?? [];
    for (const t of threads ?? []) counts[t.channel_id] = (counts[t.channel_id] || 0) + 1;
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Comunidade</h1>
        <div className="mt-6"><AdminError message={(e instanceof Error ? e.message : "Erro.") + " — rode o SQL da comunidade no Supabase."} /></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Comunidade — canais</h1>
      <p className="mt-1 text-sm text-slate-400">Organize os canais do fórum. Use ↑ ↓ para ordenar.</p>

      <div className="mt-6 space-y-3">
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

      {/* Novo canal */}
      <form action={createChannel} className="mt-6 space-y-2 rounded-2xl border border-dashed border-white/10 p-4">
        <p className="text-sm font-semibold text-white">Novo canal</p>
        <input name="name" required placeholder="Nome (ex.: Power BI)" className={field} />
        <input name="description" placeholder="Descrição (opcional)" className={field} />
        <button className="rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2 text-sm font-semibold text-ink-900">+ Criar canal</button>
      </form>
    </div>
  );
}
