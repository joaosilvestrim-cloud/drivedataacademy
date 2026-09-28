"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { UniversoPublico as Dados } from "@/lib/knowledge/publico";

/* Universo 4D na página pública do portfólio.

   Versão para quem visita: sem abas, sem desafios, sem nada que peça login.
   Três gestos só: girar o espaço, tocar numa competência, arrastar o tempo.

   O tempo é o que faz disto um 4D e não um gráfico de radar. As competências
   aparecem conforme foram demonstradas, então dar play mostra o universo do
   aluno nascendo e crescendo mês a mês. É a resposta visual para a pergunta
   que todo recrutador faz: essa pessoa está evoluindo? */

const Canvas = dynamic(() => import("./UniverseCanvas"), {
  ssr: false,
  loading: () => <p className="grid h-full place-items-center text-sm text-slate-400">Organizando as constelações...</p>,
});

// A carreira pode ir por ano, por mês ou, na camada da plataforma, por semana.
const rotulo = (iso: string, passo: "semana" | "mes" | "ano") =>
  passo === "ano"
    ? String(new Date(iso).getUTCFullYear())
    : new Intl.DateTimeFormat("pt-BR", passo === "semana" ? { day: "numeric", month: "short", timeZone: "UTC" } : { month: "short", year: "numeric", timeZone: "UTC" })
        .format(new Date(iso))
        .replace(/\./g, "")
        .replace(" de ", " ");

export default function UniversoPublico({ slug, nome, aoFechar }: { slug: string; nome: string; aoFechar: () => void }) {
  const [dados, setDados] = useState<Dados | null>(null);
  const [estado, setEstado] = useState<"carregando" | "ok" | "vazio" | "erro">("carregando");
  const [quadro, setQuadro] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [reset, setReset] = useState(0);
  const [zoom, setZoom] = useState(0);
  const [reduzido, setReduzido] = useState(false);
  const primeiro = (nome || "").split(" ")[0] || "o aluno";

  useEffect(() => {
    setReduzido(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    fetch(`/api/portfolio/${slug}/universo`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => {
        if (j?.vazio || !j?.quadros?.length) return setEstado("vazio");
        setDados(j);
        // Abre no fim: primeiro o visitante vê onde o aluno chegou.
        setQuadro(j.quadros.length - 1);
        setEstado("ok");
      })
      .catch(() => setEstado("erro"));
  }, [slug]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [aoFechar]);

  // Play: volta ao começo e avança um mês por vez.
  useEffect(() => {
    if (!tocando || !dados) return;
    if (quadro >= dados.quadros.length - 1) { setTocando(false); return; }
    const t = setTimeout(() => setQuadro((q) => q + 1), 900);
    return () => clearTimeout(t);
  }, [tocando, quadro, dados]);

  const atual = dados?.quadros[quadro];
  const scores = atual?.scores ?? {};
  const visiveis = useMemo(
    () => (dados ? dados.catalog.competencies.filter((c) => (scores[c.id]?.score ?? 0) > 0).map((c) => c.id) : []),
    [dados, scores],
  );
  const ranking = useMemo(
    () =>
      dados
        ? dados.catalog.competencies
            .filter((c) => (scores[c.id]?.score ?? 0) > 0)
            .sort((a, b) => scores[b.id].score - scores[a.id].score)
            .slice(0, 6)
        : [],
    [dados, scores],
  );
  /* Os projetos que provam uma competência, até o ponto da linha do tempo
     em que o visitante está. É a resposta para "por que essa esfera acendeu". */
  const provasAte = (id: string) =>
    (dados?.provas?.[id] ?? []).filter((p) => !p.at || !atual || p.at <= atual.at.slice(0, 7));
  const comp = dados?.catalog.competencies.find((c) => c.id === selecionada);
  /* Com quem a competência tocada se conecta, e por qual projeto. Só as que
     já estão acesas no ponto da linha do tempo em que o visitante está. */
  const conectadas = comp
    ? Object.entries(dados?.conexoes ?? {})
        .filter(([chave]) => chave.split("|").includes(comp.id))
        .map(([chave, projetos]) => {
          const outro = chave.split("|").find((x) => x !== comp.id)!;
          return { id: outro, nome: dados!.catalog.competencies.find((c) => c.id === outro)?.name ?? outro, projetos };
        })
        .filter((c) => (scores[c.id]?.score ?? 0) > 0)
    : [];
  const area = comp ? dados?.catalog.areas.find((a) => a.id === comp.area) : null;
  const sc = comp ? scores[comp.id] : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050b18] text-white" role="dialog" aria-modal="true" aria-label={`Universo de competências de ${nome}`}>
      <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-8">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-brand-green">Knowledge Universe 4D</p>
          {/* No celular o título curto: a constelação precisa da altura. */}
          <h2 className="mt-1 font-display text-lg font-bold sm:text-2xl">
            <span className="sm:hidden">Universo de {primeiro}</span>
            <span className="hidden sm:inline">Universo de competências de {nome}</span>
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-slate-400 sm:text-sm">
            Cada competência acende porque um projeto de {primeiro} a demonstra. Toque numa esfera para ver qual, e aperte play para ver a carreira crescer.
          </p>
        </div>
        <button onClick={aoFechar} className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-sm text-slate-300 hover:text-white" aria-label="Fechar o universo">
          Fechar
        </button>
      </header>

      <div className="relative min-h-0 flex-1">
        {estado === "carregando" && <p className="grid h-full place-items-center text-sm text-slate-400">Calculando o universo de {primeiro}...</p>}
        {estado === "vazio" && <p className="grid h-full place-items-center px-6 text-center text-sm text-slate-400">Os projetos de {primeiro} ainda não acenderam nenhuma competência.</p>}
        {estado === "erro" && <p className="grid h-full place-items-center text-sm text-slate-400">Não foi possível carregar o universo agora.</p>}

        {estado === "ok" && dados && (
          <>
            <Canvas
              catalog={dados.catalog}
              scores={scores}
              visible={visiveis}
              selected={selecionada}
              onSelect={setSelecionada}
              onArea={() => setSelecionada(null)}
              reduced={reduzido}
              reset={reset}
              zoom={zoom}
            />

            {/* Painel: a competência tocada, ou o resumo quando nada está tocado. */}
            <aside className="absolute bottom-3 left-3 right-3 max-h-[42%] overflow-y-auto rounded-2xl border border-white/10 bg-[#0a1428]/90 p-3 backdrop-blur sm:bottom-auto sm:left-auto sm:right-5 sm:top-5 sm:w-72 sm:p-4">
              {comp && sc ? (
                <>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-wider" style={{ color: area?.color }}>{area?.name}</p>
                  <p className="mt-1 font-display text-lg font-bold">{comp.name}</p>
                  <p className="mt-1 text-xs text-slate-400">{comp.description}</p>
                  {/* Sem nota de 0 a 100: aqui a esfera não é prova de aula, é
                      prova de projeto, e "45/100" leria como uma nota ruim. O
                      que o visitante precisa ver é o projeto. */}
                  <p className="mt-3 text-sm text-slate-300">{sc.level}</p>
                  {provasAte(comp.id).length > 0 && (
                    <ul className="mt-2 flex flex-col gap-2.5">
                      {provasAte(comp.id).map((p) => (
                        <li key={p.titulo} className="text-sm">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="min-w-0 truncate font-medium">{p.titulo}</span>
                            {p.at && <span className="shrink-0 font-mono text-xs text-slate-400">{rotulo(`${p.at}-15T12:00:00Z`, "mes")}</span>}
                          </div>
                          {/* O porquê: o trecho do próprio projeto, ou a ferramenta usada. */}
                          {p.motivo && <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{p.motivo}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {conectadas.length > 0 && (
                    <div className="mt-3 border-t border-white/10 pt-3">
                      <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">Conecta com</p>
                      <ul className="mt-1.5 flex flex-col gap-1.5">
                        {conectadas.map((c) => (
                          <li key={c.id} className="text-xs">
                            <button onClick={() => setSelecionada(c.id)} className="text-left text-slate-200 hover:text-brand-green">
                              <span className="font-semibold">{c.nome}</span>
                              <span className="text-slate-400"> pelo projeto {c.projetos.join(", ")}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <button onClick={() => setSelecionada(null)} className="mt-3 text-xs text-slate-400 hover:text-white">Ver resumo</button>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold">
                    {visiveis.length} {visiveis.length === 1 ? "competência" : "competências"}
                    {dados.projetos ? ` em ${dados.projetos} ${dados.projetos === 1 ? "projeto" : "projetos"}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">até {atual ? rotulo(atual.at, dados.passo) : ""}. Toque numa esfera para ver o detalhe.</p>
                  <ol className="mt-3 hidden flex-col gap-2 sm:flex">
                    {ranking.map((c) => {
                      const cor = dados.catalog.areas.find((a) => a.id === c.area)?.color;
                      return (
                        <li key={c.id}>
                          <button onClick={() => setSelecionada(c.id)} className="flex w-full items-center justify-between gap-3 text-left text-sm hover:text-brand-green">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cor }} />
                              <span className="truncate">{c.name}</span>
                            </span>
                            <span className="shrink-0 font-mono text-xs tabular-nums text-slate-400">{provasAte(c.id).length || "perfil"}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </>
              )}
            </aside>

            <div className="absolute left-3 top-3 flex gap-1.5 sm:left-5 sm:top-5">
              <button onClick={() => setZoom((z) => z + 1)} className="h-8 w-8 rounded-lg border border-white/15 bg-black/30 text-slate-200" aria-label="Aproximar">+</button>
              <button onClick={() => setZoom((z) => z - 1)} className="h-8 w-8 rounded-lg border border-white/15 bg-black/30 text-slate-200" aria-label="Afastar">−</button>
              <button onClick={() => { setReset((r) => r + 1); setSelecionada(null); }} className="h-8 rounded-lg border border-white/15 bg-black/30 px-2.5 text-xs text-slate-200">Centralizar</button>
            </div>
          </>
        )}
      </div>

      {/* A quarta dimensão. */}
      {estado === "ok" && dados && dados.quadros.length > 1 && (
        <footer className="flex items-center gap-3 border-t border-white/10 px-5 py-3 sm:gap-4 sm:px-8">
          <button
            onClick={() => {
              if (tocando) return setTocando(false);
              if (quadro >= dados.quadros.length - 1) setQuadro(0);
              setTocando(true);
            }}
            className="shrink-0 rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2 text-sm font-semibold text-ink-900"
          >
            {tocando ? "Pausar" : "Ver a evolução"}
          </button>
          <input
            type="range"
            min={0}
            max={dados.quadros.length - 1}
            value={quadro}
            onChange={(e) => { setTocando(false); setQuadro(Number(e.target.value)); }}
            className="min-w-0 flex-1 accent-[#15c47e]"
            aria-label="Linha do tempo"
          />
          <span className="w-20 shrink-0 text-right font-mono text-xs tabular-nums text-slate-300">{atual ? rotulo(atual.at, dados.passo) : ""}</span>
        </footer>
      )}
    </div>
  );
}
