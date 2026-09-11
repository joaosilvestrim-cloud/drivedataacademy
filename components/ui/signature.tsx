import type { ReactNode } from "react";

/* --------------------------------------------------------------------------
   Signature Components.
   Todos são alimentados por dado que o motor JÁ CALCULA e que hoje não aparece
   em lugar nenhum. Nenhum é decoração: se removido, informação se perde.
   -------------------------------------------------------------------------- */

const cx = (...p: (string | false | undefined | null)[]) => p.filter(Boolean).join(" ");

/* ============================ 01 · Régua de Dados ==========================
   Substitui a fileira de KPI cards. Mesma informação, um quarto do peso
   visual, e estabelece a linha de base numérica da página inteira.
   ========================================================================= */
export type Reading = { label: string; value: ReactNode; hint?: string };

export function DataRule({ items, className }: { items: Reading[]; className?: string }) {
  return (
    <dl
      className={cx(
        "grid grid-cols-2 gap-x-6 gap-y-5 border-y border-ds-line py-4 tablet:grid-cols-3 lg:flex lg:justify-between lg:gap-x-10",
        className
      )}
    >
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <dd className="font-mono text-data tabular-nums text-ds-text">{it.value}</dd>
          <dt className="mt-1 text-caption text-ds-text-2">{it.label}</dt>
          {it.hint && <p className="font-mono text-meta uppercase text-ds-text-3">{it.hint}</p>}
        </div>
      ))}
    </dl>
  );
}

/* ========================= 02 · Barra de Evidência =========================
   O motor decompõe cada competência em cinco dimensões com pesos fixos. Isso
   vive em score.parts e nunca foi exibido. A barra responde sozinha a pergunta
   "por que estou em 68?", que uma barra de progresso comum não responde.
   ========================================================================= */
export const DIMENSIONS = [
  { key: "learning", label: "Aprendizagem", color: "var(--ds-dim-learning)" },
  { key: "assessment", label: "Avaliações", color: "var(--ds-dim-assessment)" },
  { key: "exercise", label: "Exercícios", color: "var(--ds-dim-exercise)" },
  { key: "challenge", label: "Desafios", color: "var(--ds-dim-challenge)" },
  { key: "retention", label: "Revisões", color: "var(--ds-dim-retention)" },
] as const;

export type Parts = Partial<Record<(typeof DIMENSIONS)[number]["key"], number>>;

export function EvidenceBar({
  parts,
  max = 100,
  legend = true,
  className,
}: {
  parts: Parts;
  max?: number;
  legend?: boolean;
  className?: string;
}) {
  const rows = DIMENSIONS.map((d) => ({ ...d, value: Math.max(0, parts[d.key] ?? 0) }));
  const total = rows.reduce((a, b) => a + b.value, 0);
  const scale = max > 0 ? max : 100;
  const descricao = rows.filter((r) => r.value > 0).map((r) => `${r.label} ${r.value.toFixed(0)}`).join(", ");

  return (
    <div className={className}>
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-ctl bg-ds-line-soft"
        role="img"
        aria-label={total > 0 ? `Composição da evidência: ${descricao}. Total ${total.toFixed(0)} de ${scale}.` : "Ainda sem evidência registrada."}
      >
        {rows.map((r) =>
          r.value > 0 ? (
            <span
              key={r.key}
              style={{ width: `${(r.value / scale) * 100}%`, background: r.color }}
              className="h-full"
            />
          ) : null
        )}
      </div>
      {legend && (
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
          {rows.map((r) => (
            <li key={r.key} className="flex items-baseline gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 shrink-0 translate-y-px rounded-[2px]"
                style={{ background: r.color, opacity: r.value > 0 ? 1 : 0.28 }}
              />
              <span className={cx("text-caption", r.value > 0 ? "text-ds-text-2" : "text-ds-text-3")}>
                {r.label}
              </span>
              <span className="font-mono text-meta tabular-nums text-ds-text-3">{r.value.toFixed(0)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ========================== 03 · Halo de Frescor ===========================
   O frescor decai por meia-vida e hoje só pinta uma estrela dentro do 3D.
   Como anel ele viaja para qualquer lugar onde uma competência apareça, e
   comunica "isto está esfriando" sem depender de ler um número.
   ========================================================================= */
export function FreshnessRing({
  value,
  name,
  days,
  size = 56,
}: {
  value: number;
  name: string;
  days: number;
  size?: number;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const r = size / 2 - 4;
  const circ = 2 * Math.PI * r;
  // Cor acompanha a queda, mas o número sempre aparece: nunca só cor.
  const tone = pct >= 70 ? "var(--ds-accent)" : pct >= 40 ? "var(--ds-dim-assessment)" : "var(--ds-attention)";

  return (
    <div className="flex items-center gap-3">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${name}: frescor ${pct}%, ${days} dias sem atividade.`}
        className="shrink-0"
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ds-line)" strokeWidth="3" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="3"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          fill="var(--ds-text-2)"
          style={{ fontFamily: "var(--font-mono)", fontSize: size * 0.24 }}
        >
          {pct}
        </text>
      </svg>
      <div className="min-w-0">
        <p className="truncate text-label font-medium text-ds-text">{name}</p>
        <p className="font-mono text-meta uppercase text-ds-text-3">{days} dias parado</p>
      </div>
    </div>
  );
}
