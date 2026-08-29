import { createAdminClient } from "@/lib/supabase/admin";
import AdminError from "../AdminError";
import { saveLive, deleteLive } from "./actions";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";

// ISO -> "YYYY-MM-DDTHH:mm" no fuso do Brasil, para o input datetime-local.
function toLocalInput(iso: string): string {
  const p = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const g = (t: string) => p.find((x) => x.type === t)?.value || "";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

export default async function LivesPage({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  let lives: any[] = [];
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("live_events").select("*").order("starts_at", { ascending: false });
    if (error) throw new Error(error.message);
    lives = data ?? [];
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Lives</h1>
        <div className="mt-6"><AdminError message={(e instanceof Error ? e.message : "Erro.") + " — rode o SQL das lives no Supabase."} /></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Lives & roadmap</h1>
      <p className="mt-1 text-sm text-slate-400">Agenda de lives que aparece como roadmap para os alunos.</p>

      {searchParams?.ok && <div className="mt-5 rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm text-brand-green">Salvo!</div>}
      {searchParams?.error && <div className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{searchParams.error}</div>}

      {/* Nova live */}
      <details className="mt-6 glass rounded-2xl border border-white/8 p-5" open={lives.length === 0}>
        <summary className="cursor-pointer text-sm font-semibold text-white">+ Nova live</summary>
        <form action={saveLive} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
            <select name="kind" defaultValue="live" className={field}>
              <option value="live">Live / Aula</option>
              <option value="mentoria">Mentoria</option>
            </select>
            <input name="title" required placeholder="Título" className={field} />
          </div>
          <textarea name="description" rows={2} placeholder="Descrição (opcional)" className={`${field} resize-y`} />
          <div className="grid gap-3 sm:grid-cols-3">
            <input name="starts_at" type="datetime-local" required className={field} />
            <input name="duration_min" type="number" placeholder="Duração (min)" className={field} />
            <input name="cover_url" placeholder="Capa (URL, opcional)" className={field} />
          </div>
          <input name="url" placeholder="Link da live (YouTube, Meet...)" className={field} />
          <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" name="published" defaultChecked className="h-4 w-4 accent-emerald-400" /> Publicada (visível para alunos)</label>
          <button className="rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2 text-sm font-semibold text-ink-900">Salvar live</button>
        </form>
      </details>

      {/* Lista */}
      <div className="mt-6 space-y-3">
        {lives.map((l) => (
          <details key={l.id} className="glass rounded-2xl border border-white/8 p-5">
            <summary className="flex cursor-pointer items-center justify-between gap-3">
              <span className="flex items-center gap-2 font-medium text-white">
                {l.kind === "mentoria" && <span className="rounded-full bg-brand-blue/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-brand-teal">Mentoria</span>}
                {l.title}
              </span>
              <span className="text-xs text-slate-400">{fmt(l.starts_at)}{!l.published && " · rascunho"}</span>
            </summary>
            <form action={saveLive} className="mt-4 space-y-3">
              <input type="hidden" name="id" value={l.id} />
              <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                <select name="kind" defaultValue={l.kind || "live"} className={field}>
                  <option value="live">Live / Aula</option>
                  <option value="mentoria">Mentoria</option>
                </select>
                <input name="title" defaultValue={l.title} className={field} />
              </div>
              <textarea name="description" rows={2} defaultValue={l.description ?? ""} className={`${field} resize-y`} />
              <div className="grid gap-3 sm:grid-cols-3">
                <input name="starts_at" type="datetime-local" defaultValue={toLocalInput(l.starts_at)} className={field} />
                <input name="duration_min" type="number" defaultValue={l.duration_min ?? ""} className={field} />
                <input name="cover_url" defaultValue={l.cover_url ?? ""} placeholder="Capa (URL)" className={field} />
              </div>
              <input name="url" defaultValue={l.url ?? ""} placeholder="Link da live" className={field} />
              <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" name="published" defaultChecked={l.published} className="h-4 w-4 accent-emerald-400" /> Publicada</label>
              <div className="flex items-center gap-2">
                <button className="rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2 text-xs font-semibold text-ink-900">Salvar</button>
                <button formAction={deleteLive} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 hover:border-red-400/40 hover:text-red-400">Excluir</button>
              </div>
            </form>
          </details>
        ))}
        {lives.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-slate-500">Nenhuma live agendada ainda.</p>}
      </div>
    </div>
  );
}
