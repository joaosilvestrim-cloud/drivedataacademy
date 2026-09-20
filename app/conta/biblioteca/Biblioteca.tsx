"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ITENS, NOME_LINGUAGEM, filtrar, tagsDe, type Item, type Linguagem } from "@/lib/biblioteca";
import TourBiblioteca, { tourBibliotecaJaVisto } from "@/components/biblioteca/TourBiblioteca";

/* A Biblioteca é uma consulta, não uma leitura.

   Ninguém abre isso aqui para estudar: abre no meio do expediente, com o chefe
   esperando, para achar o padrão certo e voltar para o trabalho. Por isso a
   tela é uma lista à esquerda e o verbete à direita, com busca que responde a
   cada tecla. Nada de paginação e nada de abrir e fechar sanfona.

   Tudo roda no navegador. O acervo inteiro vem junto com a página, então a
   busca é instantânea e funciona até com a internet oscilando. */

const LINGUAGENS: (Linguagem | "todas")[] = ["todas", "dax", "sql", "m", "oracle", "protheus"];

const COR: Record<Linguagem, { chip: string; borda: string; texto: string }> = {
  dax: { chip: "bg-amber-400/15 text-amber-200", borda: "border-amber-400/40", texto: "text-amber-200" },
  sql: { chip: "bg-sky-400/15 text-sky-200", borda: "border-sky-400/40", texto: "text-sky-200" },
  m: { chip: "bg-emerald-400/15 text-emerald-200", borda: "border-emerald-400/40", texto: "text-emerald-200" },
  oracle: { chip: "bg-red-400/15 text-red-200", borda: "border-red-400/40", texto: "text-red-200" },
  protheus: { chip: "bg-violet-400/15 text-violet-200", borda: "border-violet-400/40", texto: "text-violet-200" },
};

const NIVEL: Record<Item["nivel"], string> = {
  "básico": "bg-white/8 text-slate-300",
  "intermediário": "bg-white/8 text-slate-300",
  "avançado": "bg-white/8 text-slate-300",
};

export default function Biblioteca() {
  const [busca, setBusca] = useState("");
  const [linguagem, setLinguagem] = useState<Linguagem | "todas">("todas");
  const [tag, setTag] = useState("");
  const [selecionado, setSelecionado] = useState<string>(ITENS[0]?.id ?? "");
  const [copiado, setCopiado] = useState(false);
  const [tour, setTour] = useState(false);

  const campoBusca = useRef<HTMLInputElement>(null);
  const detalhe = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => { if (!tourBibliotecaJaVisto()) setTour(true); }, 700);
    return () => clearTimeout(t);
  }, []);

  const resultado = useMemo(() => filtrar(ITENS, busca, linguagem, tag), [busca, linguagem, tag]);

  // As tags mostradas são as que existem dentro do recorte atual de linguagem:
  // oferecer tag que devolve zero resultado é enganar quem clica.
  const tags = useMemo(() => tagsDe(filtrar(ITENS, "", linguagem, "")).slice(0, 14), [linguagem]);

  // Se o filtro tirou o verbete aberto da lista, abre o primeiro que sobrou.
  useEffect(() => {
    if (resultado.length && !resultado.some((i) => i.id === selecionado)) setSelecionado(resultado[0].id);
  }, [resultado, selecionado]);

  const item = resultado.find((i) => i.id === selecionado) ?? resultado[0] ?? null;

  useEffect(() => { setCopiado(false); }, [selecionado]);

  // Barra de "/" foca a busca, setas andam na lista. Quem consulta muito não tira a mão do teclado.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const dentroDeCampo = ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName);
      if (e.key === "/" && !dentroDeCampo) { e.preventDefault(); campoBusca.current?.focus(); }
      if (e.key === "Escape" && dentroDeCampo) campoBusca.current?.blur();
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && resultado.length) {
        const i = resultado.findIndex((x) => x.id === selecionado);
        const proximo = e.key === "ArrowDown" ? Math.min(resultado.length - 1, i + 1) : Math.max(0, i - 1);
        if (proximo !== i) { e.preventDefault(); setSelecionado(resultado[proximo].id); }
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [resultado, selecionado]);

  function abrir(id: string) {
    setSelecionado(id);
    // No celular a lista e o verbete ficam empilhados, então levar a tela até o verbete é o que faz o clique parecer ter feito algo.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      setTimeout(() => detalhe.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    }
  }

  async function copiar() {
    if (!item) return;
    try {
      await navigator.clipboard.writeText(item.codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Navegador sem permissão de área de transferência: o código está na tela, dá para selecionar.
      setCopiado(false);
    }
  }

  return (
    <div className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          <span className="font-mono font-bold tabular-nums text-white">{resultado.length}</span>{" "}
          {resultado.length === 1 ? "verbete" : "verbetes"} de {ITENS.length}
        </p>
        <button
          onClick={() => setTour(true)}
          className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-brand-green/50 hover:text-white"
        >
          Como usar
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* Coluna da esquerda: busca, filtros e lista */}
        <div className="min-w-0">
          <div data-tour="bib-busca" className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <div className="relative">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <path d="M21 21l-4.3-4.3M11 19a8 8 0 100-16 8 8 0 000 16z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                ref={campoBusca}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="ano anterior, duplicata, nulo..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 pl-9 pr-9 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60"
              />
              {busca ? (
                <button onClick={() => setBusca("")} aria-label="Limpar busca" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-1 text-slate-500 transition-colors hover:text-white">
                  ✕
                </button>
              ) : (
                <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-white/10 px-1.5 text-[0.65rem] text-slate-500">/</kbd>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {LINGUAGENS.map((l) => (
                <button
                  key={l}
                  onClick={() => { setLinguagem(l); setTag(""); }}
                  className={`rounded-full px-3 py-1 text-xs transition-colors ${
                    linguagem === l ? "bg-brand-green/20 font-semibold text-brand-green" : "bg-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  {l === "todas" ? "Todas" : NOME_LINGUAGEM[l]}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map(([t, n]) => (
                <button
                  key={t}
                  onClick={() => setTag(tag === t ? "" : t)}
                  className={`rounded-md px-2 py-0.5 text-[0.7rem] transition-colors ${
                    tag === t ? "bg-white/15 font-semibold text-white" : "bg-white/[0.04] text-slate-400 hover:text-white"
                  }`}
                >
                  {t} <span className="font-mono tabular-nums text-slate-500">{n}</span>
                </button>
              ))}
            </div>
          </div>

          <ul data-tour="bib-lista" className="mt-3 max-h-[60vh] space-y-1 overflow-y-auto pr-1 lg:max-h-[calc(100vh-18rem)]">
            {resultado.map((i) => {
              const ativo = i.id === item?.id;
              return (
                <li key={i.id}>
                  <button
                    onClick={() => abrir(i.id)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      ativo ? `${COR[i.linguagem].borda} bg-white/[0.06]` : "border-transparent hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[0.6rem] font-bold uppercase ${COR[i.linguagem].chip}`}>
                        {NOME_LINGUAGEM[i.linguagem]}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm font-medium ${ativo ? "text-white" : "text-slate-200"}`}>{i.titulo}</span>
                        <span className="mt-0.5 block text-xs leading-snug text-slate-500">{i.quando}</span>
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
            {!resultado.length && (
              <li className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-6 text-sm text-slate-400">
                Nada com esse termo. Tente pelo problema e não pela função: “duplicata”, “não bate”, “mês anterior”.
              </li>
            )}
          </ul>
        </div>

        {/* Coluna da direita: o verbete */}
        <div ref={detalhe} className="min-w-0">
          {item ? (
            <article className="rounded-3xl border border-white/8 bg-white/[0.02] p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-1.5 py-0.5 font-mono text-[0.65rem] font-bold uppercase ${COR[item.linguagem].chip}`}>
                  {NOME_LINGUAGEM[item.linguagem]}
                </span>
                <span className={`rounded px-2 py-0.5 text-[0.65rem] ${NIVEL[item.nivel]}`}>{item.nivel}</span>
                {item.tags.map((t) => (
                  <button key={t} onClick={() => setTag(t)} className="rounded px-1.5 py-0.5 text-[0.65rem] text-slate-500 transition-colors hover:text-white">
                    #{t}
                  </button>
                ))}
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
            </article>
          ) : (
            <div className="rounded-3xl border border-white/8 bg-white/[0.02] p-10 text-center text-sm text-slate-400">
              Escolha um verbete na lista.
            </div>
          )}
        </div>
      </div>

      <TourBiblioteca aberto={tour} aoFechar={() => setTour(false)} />
    </div>
  );
}
