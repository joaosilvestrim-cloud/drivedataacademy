import { voteWorkshop } from "./actions";

export default function WorkshopPoll({
  options,
  counts,
  myVote,
}: {
  options: string[];
  counts: Record<string, number>;
  myVote: string | null;
}) {
  const total = Object.values(counts).reduce((s, v) => s + v, 0);

  return (
    <div className="overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-brand-blue/[0.06] via-transparent to-brand-green/[0.05] p-6">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-blue to-brand-cyan text-ink-900 shadow">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <div>
          <h2 className="font-display text-lg font-bold text-white">Escolha o próximo workshop ao vivo</h2>
          <p className="text-xs text-slate-400">Seu voto ajuda a definir o tema do próximo encontro. {total} voto{total === 1 ? "" : "s"}.</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {options.map((opt) => {
          const n = counts[opt] || 0;
          const pct = total ? Math.round((n / total) * 100) : 0;
          const mine = myVote === opt;
          return (
            <form key={opt} action={voteWorkshop}>
              <input type="hidden" name="option" value={opt} />
              <button className={`group relative block w-full overflow-hidden rounded-xl border px-4 py-3 text-left transition-colors ${mine ? "border-brand-green/50" : "border-white/10 hover:border-white/25"}`}>
                <span className="absolute inset-0 bg-gradient-to-r from-brand-green/15 to-brand-blue/10 transition-all" style={{ width: `${pct}%` }} />
                <span className="relative flex items-center justify-between gap-3">
                  <span className={`flex items-center gap-2 text-sm ${mine ? "font-semibold text-white" : "text-slate-200"}`}>
                    {mine && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-brand-green"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    {opt}
                  </span>
                  <span className="relative shrink-0 text-xs font-semibold text-slate-400">{pct}%</span>
                </span>
              </button>
            </form>
          );
        })}
      </div>
      <p className="mt-3 text-[0.7rem] text-slate-500">Clique para votar. Dá pra trocar o voto quando quiser.</p>
    </div>
  );
}
