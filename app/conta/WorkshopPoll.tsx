import { voteWorkshop } from "./actions";

// Mesma função de antes: um form por opção, voto trocável, Server Action
// inalterada. Só a linguagem visual mudou.
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
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-ds-line pb-2.5">
        <h2 className="font-display text-section font-semibold text-ds-text">
          Escolha o próximo workshop
        </h2>
        <span className="text-meta uppercase text-ds-text-3">
          {total} {total === 1 ? "voto" : "votos"}
        </span>
      </div>
      <p className="mt-3 text-body-sm text-ds-text-2">
        Seu voto define o tema do próximo encontro ao vivo. Dá para trocar quando quiser.
      </p>

      <div className="mt-4 flex flex-col gap-1.5">
        {options.map((opt) => {
          const n = counts[opt] || 0;
          const pct = total ? Math.round((n / total) * 100) : 0;
          const mine = myVote === opt;
          return (
            <form key={opt} action={voteWorkshop}>
              <input type="hidden" name="option" value={opt} />
              <button
                aria-pressed={mine}
                className={`relative block w-full overflow-hidden rounded-ctl border px-3.5 py-2.5 text-left transition-colors duration-fast ease-ds ${
                  mine
                    ? "border-ds-accent/45 bg-ds-accent/[0.06]"
                    : "border-ds-line hover:border-ds-text-3"
                }`}
              >
                {/* Proporção fica no fundo, discreta, sem gradiente. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 bg-ds-line-soft"
                  style={{ width: `${pct}%` }}
                />
                <span className="relative flex items-center justify-between gap-3">
                  <span className={`text-body-sm ${mine ? "font-medium text-ds-text" : "text-ds-text-2"}`}>
                    {mine && <span className="mr-1.5 text-ds-accent" aria-hidden="true">✓</span>}
                    {opt}
                    {mine && <span className="sr-only"> (seu voto)</span>}
                  </span>
                  <span className="shrink-0 font-mono text-meta tabular-nums text-ds-text-3">{pct}%</span>
                </span>
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
