"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ITENS, NOME_LINGUAGEM, filtrar, tagsDe, type Item, type Linguagem } from "@/lib/biblioteca";
import TourBiblioteca, { tourBibliotecaJaVisto } from "@/components/biblioteca/TourBiblioteca";

/* A Biblioteca é uma consulta, não uma leitura.

   Ninguém abre isso aqui para estudar: abre no meio do expediente, com alguém
   esperando, acha o padrão certo e volta ao trabalho. A tela segue três
   decisões, nessa ordem:

   1. uma barra de comando com busca e linguagem, que fica fixa no topo;
   2. a lista, agrupada por linguagem, com título e "quando usar";
   3. o verbete ao lado no computador, e em folha inteira no celular.

   Assunto (tag) é filtro de segunda ordem, então fica atrás de um botão:
   quatorze chips na primeira olhada era o que mais confundia. */

const LINGUAGENS: Linguagem[] = ["dax", "sql", "m", "oracle", "protheus"];

const COR: Record<Linguagem, { chip: string; borda: string; ponto: string }> = {
  dax: { chip: "bg-amber-400/15 text-amber-200", borda: "border-amber-400/40", ponto: "bg-amber-400" },
  sql: { chip: "bg-sky-400/15 text-sky-200", borda: "border-sky-400/40", ponto: "bg-sky-400" },
  m: { chip: "bg-emerald-400/15 text-emerald-200", borda: "border-emerald-400/40", ponto: "bg-emerald-400" },
  oracle: { chip: "bg-red-400/15 text-red-200", borda: "border-red-400/40", ponto: "bg-red-400" },
  protheus: { chip: "bg-violet-400/15 text-violet-200", borda: "border-violet-400/40", ponto: "bg-violet-400" },
};

/* Cada acervo tem uma regra que vale para todos os verbetes dele. Dizer isso
   uma vez, quando o aluno escolhe a linguagem, evita repetir em cada verbete. */
const ABERTURA: Record<Linguagem, string> = {
  dax: "As medidas usam a tabela Vendas e uma tabela de calendário marcada como tabela de datas.",
  sql: "SQL padrão, que roda em SQL Server, Postgres, Snowflake e BigQuery com ajuste mínimo.",
  m: "Todo trecho assume um passo anterior chamado Origem. Se o seu passo tem outro nome, troque só essa palavra.",
  oracle: "Sintaxe do Oracle 12c em diante. Onde o dialeto muda, a armadilha avisa.",
  protheus: "Tabelas com sufixo 010, padrão da empresa 01. Antes de qualquer consulta: filtre D_E_L_E_T_ e a filial.",
};

export default function Biblioteca() {
  const [busca, setBusca] = useState("");
  const [linguagem, setLinguagem] = useState<Linguagem | "todas">("todas");
  const [tag, setTag] = useState("");
  const [verAssuntos, setVerAssuntos] = useState(false);
  const [selecionado, setSelecionado] = useState<string>(ITENS[0]?.id ?? "");
  const [abertoNoCelular, setAbertoNoCelular] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [tour, setTour] = useState(false);

  const campoBusca = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => { if (!tourBibliotecaJaVisto()) setTour(true); }, 700);
    return () => clearTimeout(t);
  }, []);

  const resultado = useMemo(() => filtrar(ITENS, busca, linguagem, tag), [busca, linguagem, tag]);

  const porLinguagem = useMemo(() => {
    const mapa = new Map<Linguagem, number>();
    for (const i of ITENS) mapa.set(i.linguagem, (mapa.get(i.linguagem) ?? 0) + 1);
    return mapa;
  }, []);

  // As tags oferecidas são as que existem dentro do recorte de linguagem:
  // sugerir assunto que devolve zero resultado é enganar quem clica.
  const tags = useMemo(() => tagsDe(filtrar(ITENS, "", linguagem, "")).slice(0, 16), [linguagem]);

  // Grupos da lista, na ordem do acervo, com cabeçalho por linguagem.
  const grupos = useMemo(() => {
    const mapa = new Map<Linguagem, Item[]>();
    for (const i of resultado) mapa.set(i.linguagem, [...(mapa.get(i.linguagem) ?? []), i]);
    return [...mapa.entries()];
  }, [resultado]);

  useEffect(() => {
    if (resultado.length && !resultado.some((i) => i.id === selecionado)) setSelecionado(resultado[0].id);
  }, [resultado, selecionado]);

  const item = resultado.find((i) => i.id === selecionado) ?? resultado[0] ?? null;
  const posicao = item ? resultado.findIndex((i) => i.id === item.id) : -1;

  useEffect(() => { setCopiado(false); }, [selecionado]);

  // Teclado de quem consulta muito: "/" busca, setas andam, Esc sai do campo.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const emCampo = ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName);
      if (e.key === "/" && !emCampo) { e.preventDefault(); campoBusca.current?.focus(); }
      if (e.key === "Escape" && emCampo) campoBusca.current?.blur();
      if (e.key === "Escape" && !emCampo) setAbertoNoCelular(false);
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && resultado.length) {
        const i = resultado.findIndex((x) => x.id === selecionado);
        const proximo = e.key === "ArrowDown" ? Math.min(resultado.length - 1, i + 1) : Math.max(0, i - 1);
        if (proximo !== i) { e.preventDefault(); setSelecionado(resultado[proximo].id); }
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [resultado, selecionado]);

  function andar(passo: number) {
    if (posicao < 0) return;
    const proximo = resultado[Math.min(resultado.length - 1, Math.max(0, posicao + passo))];
    if (proximo) setSelecionado(proximo.id);
  }

  async function copiar() {
    if (!item) return;
    try {
      await navigator.clipboard.writeText(item.codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  const filtrando = !!busca.trim() || linguagem !== "todas" || !!tag;
  const limparTudo = () => { setBusca(""); setLinguagem("todas"); setTag(""); };

  return (
    <div className="mt-6">
      {/* 1. Barra de comando: busca e linguagem, sempre no mesmo lugar. */}
      <div data-tour="bib-busca" className="sticky top-[61px] z-20 -mx-4 border-b border-white/8 bg-ink-900/92 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:top-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[13rem] flex-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
              <path d="M21 21l-4.3-4.3M11 19a8 8 0 100-16 8 8 0 000 16z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              ref={campoBusca}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar pelo problema: não bate, duplicata, mês anterior..."
              aria-label="Buscar na biblioteca"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-16 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60"
            />
            <span className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
              {busca ? (
                <button onClick={() => setBusca("")} aria-label="Limpar busca" className="rounded-md px-1.5 text-slate-500 hover:text-white">✕</button>
              ) : (
                <kbd className="rounded border border-white/10 px-1.5 text-[0.65rem] text-slate-500">/</kbd>
              )}
              <span className="font-mono text-[0.7rem] tabular-nums text-slate-500">{resultado.length}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-white/[0.04] p-1">
            <button
              onClick={() => { setLinguagem("todas"); setTag(""); }}
              className={`rounded-lg px-2.5 py-1.5 text-xs transition-colors ${linguagem === "todas" ? "bg-white/10 font-semibold text-white" : "text-slate-400 hover:text-white"}`}
            >
              Todas <span className="font-mono tabular-nums opacity-60">{ITENS.length}</span>
            </button>
            {LINGUAGENS.map((l) => (
              <button
                key={l}
                onClick={() => { setLinguagem(linguagem === l ? "todas" : l); setTag(""); }}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${linguagem === l ? "bg-white/10 font-semibold text-white" : "text-slate-400 hover:text-white"}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${COR[l].ponto}`} aria-hidden="true" />
                {NOME_LINGUAGEM[l]} <span className="font-mono tabular-nums opacity-60">{porLinguagem.get(l) ?? 0}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setVerAssuntos((v) => !v)}
            aria-expanded={verAssuntos}
            className={`rounded-xl border px-3 py-2 text-xs transition-colors ${tag ? "border-brand-green/50 text-brand-green" : "border-white/10 text-slate-300 hover:text-white"}`}
          >
            {tag ? `Assunto: ${tag}` : "Assunto"}
            <span aria-hidden="true" className="ml-1.5 opacity-60">{verAssuntos ? "▲" : "▼"}</span>
          </button>

          {filtrando && (
            <button onClick={limparTudo} className="text-xs text-slate-400 underline underline-offset-4 hover:text-white">limpar</button>
          )}
        </div>

        {verAssuntos && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map(([t, n]) => (
              <button
                key={t}
                onClick={() => setTag(tag === t ? "" : t)}
                className={`rounded-md px-2 py-0.5 text-[0.72rem] transition-colors ${tag === t ? "bg-brand-green/20 font-semibold text-brand-green" : "bg-white/[0.05] text-slate-400 hover:text-white"}`}
              >
                {t} <span className="font-mono tabular-nums opacity-60">{n}</span>
              </button>
            ))}
          </div>
        )}

        {linguagem !== "todas" && !busca.trim() && (
          <p className="mt-2 text-xs leading-relaxed text-slate-500">{ABERTURA[linguagem]}</p>
        )}
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* 2. Lista, agrupada por linguagem. */}
        <div className="min-w-0">
          <ul data-tour="bib-lista" className="space-y-1 lg:max-h-[calc(100vh-13rem)] lg:overflow-y-auto lg:pr-1">
            {grupos.map(([l, itens]) => (
              <li key={l}>
                {linguagem === "todas" && (
                  <p className="sticky top-0 z-10 flex items-center gap-2 bg-ink-900/95 px-2 py-1.5 text-[0.68rem] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur">
                    <span className={`h-1.5 w-1.5 rounded-full ${COR[l].ponto}`} aria-hidden="true" />
                    {NOME_LINGUAGEM[l]}
                    <span className="font-mono tabular-nums opacity-70">{itens.length}</span>
                  </p>
                )}
                <ul className="space-y-1">
                  {itens.map((i) => {
                    const ativo = i.id === item?.id;
                    return (
                      <li key={i.id}>
                        <button
                          onClick={() => { setSelecionado(i.id); setAbertoNoCelular(true); }}
                          aria-current={ativo ? "true" : undefined}
                          className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                            ativo ? `${COR[i.linguagem].borda} bg-white/[0.06]` : "border-transparent hover:bg-white/[0.03]"
                          }`}
                        >
                          <span className={`block text-sm font-medium ${ativo ? "text-white" : "text-slate-200"}`}>{i.titulo}</span>
                          <span className="mt-0.5 block text-xs leading-snug text-slate-500">{i.quando}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}

            {!resultado.length && (
              <li className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-8 text-center">
                <p className="text-sm text-slate-300">Nada com esse termo.</p>
                <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">
                  Tente pelo problema, não pela função: “não bate”, “duplicata”, “mês anterior”, “filial”.
                </p>
                {filtrando && <button onClick={limparTudo} className="mt-3 text-xs text-brand-green hover:underline">limpar os filtros</button>}
              </li>
            )}
          </ul>
        </div>

        {/* 3. Verbete. No computador fica ao lado; no celular vira folha por cima. */}
        <div className={`min-w-0 ${abertoNoCelular ? "fixed inset-0 z-40 overflow-y-auto bg-ink-900 p-4 lg:static lg:z-auto lg:overflow-visible lg:bg-transparent lg:p-0" : "hidden lg:block"}`}>
          {item ? (
            <article className="rounded-3xl border border-white/8 bg-white/[0.02] p-5 sm:p-6 lg:sticky lg:top-[7.5rem]">
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => setAbertoNoCelular(false)} className="mr-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300 lg:hidden">
                  ← Lista
                </button>
                <span className={`rounded px-1.5 py-0.5 font-mono text-[0.65rem] font-bold uppercase ${COR[item.linguagem].chip}`}>
                  {NOME_LINGUAGEM[item.linguagem]}
                </span>
                <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[0.65rem] text-slate-300">{item.nivel}</span>
                {item.tags.map((t) => (
                  <button key={t} onClick={() => { setTag(t); setVerAssuntos(true); }} className="rounded px-1 text-[0.68rem] text-slate-500 transition-colors hover:text-white">
                    #{t}
                  </button>
                ))}
                <span className="ml-auto flex items-center gap-1 text-[0.7rem] text-slate-500">
                  <button onClick={() => andar(-1)} disabled={posicao <= 0} aria-label="Verbete anterior" className="rounded px-1.5 py-0.5 hover:text-white disabled:opacity-30">↑</button>
                  <span className="font-mono tabular-nums">{posicao + 1}/{resultado.length}</span>
                  <button onClick={() => andar(1)} disabled={posicao >= resultado.length - 1} aria-label="Próximo verbete" className="rounded px-1.5 py-0.5 hover:text-white disabled:opacity-30">↓</button>
                </span>
              </div>

              <h2 className="mt-3 font-display text-2xl font-bold text-white">{item.titulo}</h2>

              <div data-tour="bib-quando" className="mt-3 border-l-2 border-brand-green/50 pl-3">
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-brand-green">Quando usar</p>
                <p className="mt-0.5 text-sm text-slate-200">{item.quando}</p>
              </div>

              <div data-tour="bib-codigo" className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">O código</p>
                  <button
                    onClick={copiar}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      copiado ? "border-brand-green/60 text-brand-green" : "border-white/10 text-slate-300 hover:border-brand-green/50 hover:text-white"
                    }`}
                  >
                    {copiado ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <pre className="mt-2 overflow-x-auto rounded-xl border border-white/10 bg-[#0b1020] p-4 text-[0.8rem] leading-relaxed text-slate-200">
                  <code>{item.codigo}</code>
                </pre>
              </div>

              <div className="mt-5">
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">Por que é assim</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">{item.explicacao}</p>
              </div>

              {item.armadilha && (
                <div data-tour="bib-armadilha" className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-4">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-amber-300">A armadilha</p>
                  <p className="mt-1 text-sm leading-relaxed text-amber-100/90">{item.armadilha}</p>
                </div>
              )}

              <p className="mt-4 hidden text-[0.7rem] text-slate-600 lg:block">
                Atalhos: <kbd className="rounded border border-white/10 px-1">/</kbd> busca ·{" "}
                <kbd className="rounded border border-white/10 px-1">↑</kbd>{" "}
                <kbd className="rounded border border-white/10 px-1">↓</kbd> andam na lista
              </p>
            </article>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-400">
              Escolha um verbete na lista.
            </div>
          )}
        </div>
      </div>

      <TourBiblioteca aberto={tour} aoFechar={() => setTour(false)} />
    </div>
  );
}
