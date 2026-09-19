import type { ReactNode } from "react";

/* Peças comuns às três abas do analytics. */

export const n = (v: number) => v.toLocaleString("pt-BR");
export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const dataCurta = (iso: string | null | undefined) =>
  iso ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso.length === 10 ? iso + "T12:00:00-03:00" : iso)) : "—";
export const horas = (seg: number) => (seg >= 3600 ? `${(seg / 3600).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h` : `${Math.round(seg / 60)} min`);

export function Kpi({ rotulo, valor, detalhe, tom }: { rotulo: string; valor: string; detalhe?: string; tom?: "danger" | "attention" }) {
  const cor = tom === "danger" ? "text-ds-danger" : tom === "attention" ? "text-ds-attention" : "text-ds-text";
  const borda = tom === "danger" ? "border-ds-danger/40 bg-ds-danger/[0.05]" : "border-ds-line bg-ds-surface";
  return (
    <div className={`rounded-srf border px-4 py-3 ${borda}`}>
      <span className="block text-meta uppercase tracking-wide text-ds-text-3">{rotulo}</span>
      <span className={`mt-1 block font-mono text-data tabular-nums ${cor}`}>{valor}</span>
      {detalhe && <span className="mt-0.5 block text-caption text-ds-text-3">{detalhe}</span>}
    </div>
  );
}

export function Tabela({ colunas, linhas, vazio }: { colunas: string[]; linhas: ReactNode[][]; vazio: string }) {
  return (
    <div className="overflow-x-auto rounded-srf border border-ds-line bg-ds-surface">
      <table className="w-full min-w-[640px] text-body-sm">
        <thead>
          <tr className="border-b border-ds-line text-left text-meta uppercase text-ds-text-3">
            {colunas.map((c, i) => (
              <th key={c + i} className={`px-3 py-2.5 font-medium ${i === 0 ? "pl-4" : ""}`}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i} className="border-b border-ds-line-soft align-top last:border-0">
              {l.map((c, j) => (
                <td key={j} className={`px-3 py-2.5 text-ds-text-2 ${j === 0 ? "max-w-[260px] pl-4" : ""}`}>{c}</td>
              ))}
            </tr>
          ))}
          {!linhas.length && vazio && (
            <tr><td colSpan={colunas.length} className="px-4 py-8 text-center text-ds-text-3">{vazio}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Curva de retenção em 20 barrinhas: quanto dos alunos viu cada trecho de 5% do vídeo. */
export function Curva({ valores, largura = 160 }: { valores: number[]; largura?: number }) {
  const alto = 28;
  const w = largura / valores.length;
  return (
    <svg width={largura} height={alto} viewBox={`0 0 ${largura} ${alto}`} role="img" aria-label={`Retenção: começa em ${valores[0] ?? 0}% e termina em ${valores.at(-1) ?? 0}%`}>
      {valores.map((v, i) => (
        <rect key={i} x={i * w + 0.5} y={alto - (v / 100) * alto} width={Math.max(1, w - 1)} height={Math.max(1, (v / 100) * alto)} rx="1" fill="rgb(var(--ds-accent-c))" opacity={0.35 + (v / 100) * 0.65} />
      ))}
    </svg>
  );
}
