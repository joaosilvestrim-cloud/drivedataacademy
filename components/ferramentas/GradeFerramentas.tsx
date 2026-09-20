"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";

import { useMemo, useState } from "react";
import CartaoFerramenta, { type Ferramenta } from "./CartaoFerramenta";

/* Grade das ferramentas com filtro por tipo.

   O filtro nasce das próprias ferramentas: cada uma declara a sua categoria e
   as abas são montadas a partir do que existe, com a contagem do lado. Quando
   entrar a sexta ferramenta de Power BI, a aba se ajusta sozinha, e quando uma
   categoria ficar vazia ela some. Nada de lista fixa para alguém esquecer de
   atualizar.

   "Novidades" é a exceção: não é categoria, é recorte. Fica primeiro porque é
   a pergunta mais comum de quem volta à tela, "o que mudou desde a última vez
   que entrei aqui". */

export default function GradeFerramentas({ ferramentas }: { ferramentas: Ferramenta[] }) {
  const tr = usarTraducao();
  const [filtro, setFiltro] = useState("todas");

  const categorias = useMemo(() => {
    const conta = new Map<string, number>();
    for (const f of ferramentas) conta.set(f.categoria, (conta.get(f.categoria) || 0) + 1);
    return [...conta.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"));
  }, [ferramentas]);

  const novidades = ferramentas.filter((f) => f.novo).length;

  const abas = [
    { chave: "todas", rotulo: tr("Todas"), quantas: ferramentas.length },
    ...(novidades ? [{ chave: "novidades", rotulo: "Novidades", quantas: novidades }] : []),
    ...categorias.map(([c, n]) => ({ chave: c, rotulo: c, quantas: n })),
  ];

  const visiveis = ferramentas.filter((f) =>
    filtro === "todas" ? true : filtro === "novidades" ? f.novo : f.categoria === filtro
  );

  return (
    <>
      <nav aria-label={tr("Filtrar ferramentas por tipo")} className="mt-6 flex flex-wrap gap-2">
        {abas.map((a) => {
          const ativa = filtro === a.chave;
          return (
            <button
              key={a.chave}
              type="button"
              onClick={() => setFiltro(a.chave)}
              aria-pressed={ativa}
              className={`inline-flex items-baseline gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
                ativa
                  ? "border-brand-green/50 bg-brand-green/[0.10] text-white"
                  : "border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/25 hover:text-white"
              }`}
            >
              {a.chave === "novidades" && (
                <span className={`h-1.5 w-1.5 rounded-full ${ativa ? "bg-brand-green" : "bg-brand-green/70"}`} aria-hidden="true" />
              )}
              {a.rotulo}
              <span className="font-mono text-[0.7rem] tabular-nums text-slate-500">{a.quantas}</span>
            </button>
          );
        })}
      </nav>

      {/* A chave muda junto com o filtro: a grade inteira é remontada, e a
          animação de entrada dos cartões roda de novo a cada troca de aba. */}
      <div key={filtro} className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visiveis.map((f, i) => (
          <CartaoFerramenta key={f.key} t={f} ordem={i} />
        ))}
      </div>

      {visiveis.length === 0 && (
        <p className="mt-6 rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-500">
          {tr("Nenhuma ferramenta nesta categoria por enquanto.")}
        </p>
      )}
    </>
  );
}
