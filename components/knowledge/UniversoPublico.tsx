"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type { UniversoPublico as Dados } from "@/lib/knowledge/publico";
import type { Score, Vec3 } from "@/lib/knowledge/types";
import type { Selecao } from "./CarreiraNoEspaco";
import RoteiroDaCarreira, { capitulosDaCarreira, type Alvo } from "./RoteiroDaCarreira";

/* Universo 4D na página pública do portfólio.

   Versão para quem visita: sem abas, sem desafios, sem nada que peça login.
   Três gestos só: girar o espaço, tocar numa competência, arrastar o tempo.

   O tempo é o que faz disto um 4D e não um gráfico de radar. As competências
   aparecem conforme foram demonstradas, então dar play mostra o universo do
   aluno nascendo e crescendo mês a mês. É a resposta visual para a pergunta
   que todo recrutador faz: essa pessoa está evoluindo? */

// O aviso de carregamento é um componente de verdade: o tr é hook e não existe
// fora de um componente, como na opção "loading" do dynamic.
function Carregando() {
  const tr = usarTraducao();
  return <p className="grid h-full place-items-center text-sm text-slate-400">{tr("Organizando as constelações...")}</p>;
}
const Canvas = dynamic(() => import("./UniverseCanvas"), { ssr: false, loading: () => <Carregando /> });
// A carreira no espaço usa o motor 3D, então também fica fora do servidor.
const CarreiraNoEspaco = dynamic(() => import("./CarreiraNoEspaco"), { ssr: false });

/* A constelação do catálogo foi desenhada para a tela interna, com rótulos
   pequenos. Aqui os rótulos são maiores e ainda há planetas, nave e cometas
   em volta: na escala original os nomes encavalavam. Afastar as estrelas do
   centro abre espaço sem mudar a forma do desenho. */
const ESPACO = 1.6;
function espacar(d: Dados): Dados {
  const cs = d.catalog.competencies;
  if (!cs.length) return d;
  const c = [0, 1, 2].map((i) => cs.reduce((s, x) => s + x.position[i], 0) / cs.length);
  const longe = (p: number[]) => p.map((v, i) => c[i] + (v - c[i]) * ESPACO) as typeof cs[number]["position"];
  return {
    ...d,
    catalog: {
      ...d.catalog,
      competencies: cs.map((x) => ({ ...x, position: longe(x.position) })),
      areas: d.catalog.areas.map((a: any) => (Array.isArray(a.position) ? { ...a, position: longe(a.position) } : a)),
    },
  };
}

const mesAno = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" }).replace(/\./g, "").replace(" de ", " ") : "";

// A carreira pode ir por ano, por mês ou, na camada da plataforma, por semana.
const rotulo = (iso: string, passo: "semana" | "mes" | "ano") =>
  passo === "ano"
    ? String(new Date(iso).getUTCFullYear())
    : new Intl.DateTimeFormat("pt-BR", passo === "semana" ? { day: "numeric", month: "short", timeZone: "UTC" } : { month: "short", year: "numeric", timeZone: "UTC" })
        .format(new Date(iso))
        .replace(/\./g, "")
        .replace(" de ", " ");

/* autoplay e final servem ao momento da publicação: o aluno clica em
   Publicar, a carreira dele acende sozinha na tela, e no fim aparece o
   cartão de "está no ar". Na página pública nenhum dos dois é usado. */
export default function UniversoPublico({
  slug,
  nome,
  aoFechar,
  autoplay = false,
  final,
}: {
  slug: string;
  nome: string;
  aoFechar: () => void;
  autoplay?: boolean;
  final?: React.ReactNode;
}) {
  const tr = usarTraducao();
  const [terminou, setTerminou] = useState(false);
  const jaTocou = useRef(false);
  const [dados, setDados] = useState<Dados | null>(null);
  const [estado, setEstado] = useState<"carregando" | "ok" | "vazio" | "erro">("carregando");
  const [quadro, setQuadro] = useState(0);
  const capitulos = useMemo(() => (dados ? capitulosDaCarreira(dados) : []), [dados]);
  const noEspaco = useMemo(() => (dados ? espacar(dados) : null), [dados]);
  const [tocando, setTocando] = useState(false);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  // Um objeto da carreira tocado: planeta, lua, parada da nave, cometa, sinal...
  const [extra, setExtra] = useState<Selecao | null>(null);
  const [pontosExtras, setPontosExtras] = useState<Vec3[]>([]);
  // O roteiro ao lado: abre sozinho no play e fica até o visitante fechar.
  const [roteiro, setRoteiro] = useState(false);
  // Comparação com uma vaga: o visitante cola a descrição, a IA lê o que ela pede.
  const [vagaAberta, setVagaAberta] = useState(false);
  const [vagaTexto, setVagaTexto] = useState("");
  const [vagaLendo, setVagaLendo] = useState(false);
  const [vagaErro, setVagaErro] = useState("");
  const [vaga, setVaga] = useState<Aderencia | null>(null);
  const compararVaga = async () => {
    setVagaLendo(true);
    setVagaErro("");
    try {
      const r = await fetch(`/api/portfolio/${encodeURIComponent(slug)}/aderencia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: vagaTexto }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Não foi possível comparar agora.");
      setVaga(j as Aderencia);
      setSelecionada(null);
      setExtra(null);
      setReset((n) => n + 1);
    } catch (e: any) {
      setVagaErro(e.message);
    } finally {
      setVagaLendo(false);
    }
  };
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

  /* A evolução como narrativa, não como slide.

     O play apaga o universo (quadro -1), espera um instante no escuro e acende
     a carreira quadro a quadro, com tempo para cada projeto ser lido na
     legenda. No último quadro a câmera ainda gira um pouco antes de parar. */
  useEffect(() => {
    if (!tocando || !dados) return;
    if (quadro >= dados.quadros.length - 1) {
      const t = setTimeout(() => { setTocando(false); setTerminou(true); }, 2600);
      return () => clearTimeout(t);
    }
    // Cada capítulo fica na tela o tempo de ler o que ele explica no roteiro.
    const linhas = quadro >= 0 ? capitulos[quadro]?.linhas.length ?? 1 : 0;
    const t = setTimeout(() => setQuadro((q) => q + 1), quadro < 0 ? 1100 : Math.min(7000, 2800 + Math.max(0, linhas - 1) * 1200));
    return () => clearTimeout(t);
  }, [tocando, quadro, dados, capitulos]);

  useEffect(() => {
    if (!autoplay || estado !== "ok" || jaTocou.current) return;
    jaTocou.current = true;
    setQuadro(-1);
    setTocando(true);
  }, [autoplay, estado]);

  const atual = quadro >= 0 ? dados?.quadros[quadro] : undefined;
  const alvo = useMemo(() => atual?.scores ?? {}, [atual]);

  /* As esferas crescem em vez de pular. Entre um quadro e outro a nota de
     cada competência é interpolada, e o raio da esfera acompanha a nota. */
  const [exibidos, setExibidos] = useState<Record<string, Score>>({});
  const exibidosRef = useRef(exibidos);
  exibidosRef.current = exibidos;
  useEffect(() => {
    if (reduzido) { setExibidos(alvo); return; }
    const de = exibidosRef.current;
    const t0 = performance.now();
    let raf = 0;
    const passo = (agora: number) => {
      // O carimbo do requestAnimationFrame pode vir de antes do t0: sem o
      // piso em zero, a nota fica negativa por um quadro e o raio vira NaN.
      const k = Math.min(1, Math.max(0, (agora - t0) / 900));
      const e = 1 - Math.pow(1 - k, 3);
      const prox: Record<string, Score> = {};
      for (const [id, sc] of Object.entries(alvo)) {
        const a = de[id]?.score ?? 0;
        prox[id] = { ...sc, score: a + (sc.score - a) * e };
      }
      setExibidos(prox);
      if (k < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [alvo, reduzido]);

  // Competência recém-acesa ainda não tem valor interpolado: entra com zero,
  // e a ignição do canvas a faz nascer de dentro para fora.
  const scores = useMemo(() => {
    const r: Record<string, Score> = {};
    for (const [id, sc] of Object.entries(alvo)) r[id] = exibidos[id] ?? { ...sc, score: 0 };
    return r;
  }, [alvo, exibidos]);

  // No fim da linha do tempo (e fora do play) vale tudo, inclusive a estrela-guia.
  const ateMs = quadro < 0 || !atual ? -Infinity : !tocando && dados && quadro === dados.quadros.length - 1 ? Date.now() : Date.parse(atual.at);
  const visiveis = useMemo(
    () => (dados ? dados.catalog.competencies.filter((c) => (alvo[c.id]?.score ?? 0) > 0).map((c) => c.id) : []),
    [dados, alvo],
  );
  const ranking = useMemo(
    () =>
      dados
        ? dados.catalog.competencies
            .filter((c) => (alvo[c.id]?.score ?? 0) > 0)
            .sort((a, b) => alvo[b.id].score - alvo[a.id].score)
            .slice(0, 6)
        : [],
    [dados, alvo],
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

  const comecar = () => {
    setSelecionada(null);
    setExtra(null);
    setVaga(null);
    setVagaAberta(false);
    setReset((r) => r + 1);
    setQuadro(-1);
    setRoteiro(true);
    setTocando(true);
  };
  const irPara = (i: number) => {
    setTocando(false);
    setSelecionada(null);
    setExtra(null);
    setQuadro(i);
  };
  // Tocar numa linha do roteiro pausa e abre o objeto no painel.
  const focar = (alvo: Alvo) => {
    setTocando(false);
    if (alvo.comp) { setExtra(null); setSelecionada(alvo.comp); }
    else if (alvo.extra) { setSelecionada(null); setExtra(alvo.extra); }
  };
  const mostraRoteiro = roteiro && (tocando || (!extra && !comp && !vaga && !vagaAberta));
  const sc = comp ? scores[comp.id] : null;

  return (
    <div className="escuro fixed inset-0 z-50 flex flex-col bg-ink-900 text-tinta" role="dialog" aria-modal="true" aria-label={`Universo de competências de ${nome}`}>
      <style>{`@keyframes surgir{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}.surgir{animation:surgir .7s cubic-bezier(.2,.8,.2,1) both}@media (prefers-reduced-motion:reduce){.surgir{animation:none}}`}</style>
      <header className="flex items-start justify-between gap-4 border-b border-tinta/10 px-5 py-4 sm:px-8">
        <div>
          <p className="text-[0.7rem] font-semibold text-marca">{tr("Knowledge Universe 4D")}</p>
          {/* No celular o título curto: a constelação precisa da altura. */}
          <h2 className="mt-1 font-display text-lg font-bold sm:text-2xl">
            <span className="sm:hidden">{tr("Universo de")} {primeiro}</span>
            <span className="hidden sm:inline">{tr("Universo de competências de")} {nome}</span>
          </h2>
          <p className={`mt-1 max-w-2xl text-xs text-slate-400 sm:text-sm ${tocando ? "hidden sm:block" : ""}`}>
            {tr("Cada competência acende porque um projeto a demonstra.")} {tr("Toque numa esfera para ver qual, e aperte play para ver a carreira crescer.")}
          </p>
        </div>
        <button onClick={aoFechar} className="shrink-0 rounded-lg border border-tinta/15 px-3 py-1.5 text-sm text-slate-300 hover:text-tinta" aria-label={tr("Fechar o universo")}>
          {tr("Fechar")}
        </button>
      </header>

      <div className="relative min-h-0 flex-1">
        {estado === "carregando" && <p className="grid h-full place-items-center text-sm text-slate-400">{tr("Calculando o universo de")} {primeiro}...</p>}
        {estado === "vazio" && <p className="grid h-full place-items-center px-6 text-center text-sm text-slate-400">{tr("Os projetos de")} {primeiro} {tr("ainda não acenderam nenhuma competência.")}</p>}
        {estado === "erro" && <p className="grid h-full place-items-center text-sm text-slate-400">{tr("Não foi possível carregar o universo agora.")}</p>}

        {estado === "ok" && dados && (
          <>
            <Canvas
              catalog={noEspaco!.catalog}
              scores={scores}
              visible={visiveis}
              selected={selecionada}
              onSelect={(id) => { setExtra(null); setSelecionada(id); }}
              onArea={() => { setSelecionada(null); setExtra(null); }}
              reduced={reduzido}
              reset={reset}
              zoom={zoom}
              cinema={!reduzido}
              girando={tocando && !reduzido}
              pontosExtras={pontosExtras}
              ceu
              extras={
                <CarreiraNoEspaco
                  dados={noEspaco!}
                  acesas={visiveis}
                  ate={ateMs}
                  cinema={!reduzido}
                  reduzido={reduzido}
                  onSelect={(s) => { setSelecionada(null); setExtra(s); }}
                  aoPosicionar={setPontosExtras}
                  vaga={vaga ? vaga.itens.map((i) => ({ id: i.id, tem: i.tem })) : null}
                />
              }
            />

            {/* A data grande ao fundo e a legenda da carreira, só durante o play. */}
            {tocando && atual && (
              <p key={`data-${quadro}`} className="surgir pointer-events-none absolute inset-x-0 top-4 text-center font-display text-5xl font-bold tracking-tight text-tinta/[0.09] sm:top-6 sm:text-8xl">
                {rotulo(atual.at, dados.passo)}
              </p>
            )}
            {mostraRoteiro && (
              <RoteiroDaCarreira
                capitulos={capitulos}
                quadro={quadro}
                tocando={tocando}
                rotulo={(iso) => rotulo(iso, dados.passo)}
                onIr={irPara}
                onTocar={() => (quadro >= capitulos.length - 1 ? comecar() : setTocando(true))}
                onPausar={() => setTocando(false)}
                onFoco={focar}
                onFechar={() => setRoteiro(false)}
              />
            )}

            {/* Painel: a competência tocada, ou o resumo quando nada está tocado. */}
            {!tocando && !mostraRoteiro && <aside className="absolute bottom-3 left-3 right-3 max-h-[42%] overflow-y-auto rounded-2xl border border-tinta/10 bg-ink-800/90 p-3 backdrop-blur sm:bottom-auto sm:left-auto sm:right-5 sm:top-5 sm:max-h-[calc(100%-2.5rem)] sm:w-72 sm:p-4">
              {vaga ? (
                <PainelDaVaga vaga={vaga} aoFechar={() => setVaga(null)} aoCompetencia={(id) => { setExtra(null); setSelecionada(id); }} />
              ) : vagaAberta ? (
                <>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">{tr("Comparar com uma vaga")}</p>
                  <p className="mt-1 text-sm text-slate-300">{tr("Cole a descrição da vaga. A constelação mostra o que ela pede e o que já está provado em projeto.")}</p>
                  <textarea
                    value={vagaTexto}
                    onChange={(e) => setVagaTexto(e.target.value)}
                    rows={7}
                    maxLength={9000}
                    placeholder={tr("Responsabilidades, requisitos, ferramentas...")}
                    className="mt-3 w-full resize-y rounded-lg border border-tinta/15 bg-black/30 p-2 text-sm text-slate-100 outline-none focus:border-acento/60"
                  />
                  {vagaErro && <p className="mt-2 text-xs text-red-300">{vagaErro}</p>}
                  <div className="mt-3 flex gap-2">
                    <button disabled={vagaLendo || vagaTexto.trim().length < 80} onClick={compararVaga} className="h-9 rounded-lg bg-brand-green px-4 text-sm font-semibold text-slate-900 disabled:opacity-40">
                      {vagaLendo ? "Lendo a vaga..." : "Comparar"}
                    </button>
                    <button onClick={() => setVagaAberta(false)} className="h-9 px-3 text-sm text-slate-400 hover:text-tinta">{tr("Cancelar")}</button>
                  </div>
                </>
              ) : extra ? (
                <PainelDaCarreira dados={dados} extra={extra} aoVoltar={() => setExtra(null)} aoCompetencia={(id) => { setExtra(null); setSelecionada(id); }} />
              ) : comp && sc ? (
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
                    <div className="mt-3 border-t border-tinta/10 pt-3">
                      <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">{tr("Conecta com")}</p>
                      <ul className="mt-1.5 flex flex-col gap-1.5">
                        {conectadas.map((c) => (
                          <li key={c.id} className="text-xs">
                            <button onClick={() => setSelecionada(c.id)} className="text-left text-slate-200 hover:text-acento">
                              <span className="font-semibold">{c.nome}</span>
                              <span className="text-slate-400"> pelo projeto {c.projetos.join(", ")}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <button onClick={() => setSelecionada(null)} className="mt-3 text-xs text-slate-400 hover:text-tinta">{tr("Ver resumo")}</button>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold">
                    {visiveis.length} {tr(visiveis.length === 1 ? "competência" : "competências")}
                    {dados.projetos ? ` ${tr("em")} ${dados.projetos} ${tr(dados.projetos === 1 ? "projeto" : "projetos")}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {tr("até")} {atual ? rotulo(atual.at, dados.passo) : ""}
                    {(dados.trajetoria ?? []).length ? `, ${tr("carreira desde")} ${new Date([...(dados.trajetoria ?? [])].sort((a, b) => a.inicio.localeCompare(b.inicio))[0].inicio).getUTCFullYear()}` : ""}
                    {tr(". Toque numa esfera, num planeta ou na nave para ver o detalhe.")}
                  </p>
                  {capitulos.length > 1 && (
                    <button onClick={() => setRoteiro(true)} className="mt-3 w-full rounded-lg border border-tinta/15 px-3 py-2 text-left text-sm hover:border-tinta/40">
                      <span className="font-semibold">{tr("Ler o roteiro da carreira")}</span>
                      <span className="block text-xs text-slate-400">{capitulos.length} {tr("capítulos, do primeiro fato até hoje")}</span>
                    </button>
                  )}
                  <ol className="mt-3 hidden flex-col gap-2 sm:flex">
                    {ranking.map((c) => {
                      const cor = dados.catalog.areas.find((a) => a.id === c.area)?.color;
                      return (
                        <li key={c.id}>
                          <button onClick={() => setSelecionada(c.id)} className="flex w-full items-center justify-between gap-3 text-left text-sm hover:text-acento">
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
            </aside>}

            <div className="absolute left-3 top-3 flex gap-1.5 sm:left-5 sm:top-5">
              <button onClick={() => setZoom((z) => z + 1)} className="h-8 w-8 rounded-lg border border-tinta/15 bg-black/30 text-slate-200" aria-label={tr("Aproximar")}>+</button>
              <button onClick={() => setZoom((z) => z - 1)} className="h-8 w-8 rounded-lg border border-tinta/15 bg-black/30 text-slate-200" aria-label={tr("Afastar")}>−</button>
              <button onClick={() => { setReset((r) => r + 1); setSelecionada(null); setExtra(null); }} className="h-8 rounded-lg border border-tinta/15 bg-black/30 px-2.5 text-xs text-slate-200">{tr("Centralizar")}</button>
              {!tocando && !autoplay && (
                <button
                  onClick={() => { setVaga(null); setExtra(null); setSelecionada(null); setVagaAberta(true); }}
                  className="h-8 rounded-lg border border-acento/40 bg-black/30 px-2.5 text-xs font-semibold text-acento"
                >
                  {tr("Comparar com vaga")}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* O final da revelação. Sem universo para tocar (aluno sem projeto
          provado, ou que desligou o 4D), aparece direto. */}
      {final && (terminou || estado === "vazio" || estado === "erro") && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-ink-800/70 p-4 backdrop-blur-sm">
          <div className="surgir w-full max-w-lg">{final}</div>
        </div>
      )}

      {/* A quarta dimensão. */}
      {estado === "ok" && dados && dados.quadros.length > 1 && (
        <footer className="flex items-center gap-3 border-t border-tinta/10 px-5 py-3 sm:gap-4 sm:px-8">
          <button
            onClick={() => (tocando ? setTocando(false) : comecar())}
            className="shrink-0 rounded-lg bg-marca-verde px-4 py-2 text-sm font-semibold text-sobre-acento"
          >
            {tocando ? tr("Pausar") : tr("Ver a evolução")}
          </button>
          <input
            type="range"
            min={0}
            max={dados.quadros.length - 1}
            value={Math.max(0, quadro)}
            onChange={(e) => { setTocando(false); setQuadro(Number(e.target.value)); }}
            className="min-w-0 flex-1 accent-[#15c47e]"
            aria-label={tr("Linha do tempo")}
          />
          <span className="w-20 shrink-0 text-right font-mono text-xs tabular-nums text-slate-300">{atual ? rotulo(atual.at, dados.passo) : ""}</span>
        </footer>
      )}
    </div>
  );
}

/* O painel de cada objeto da carreira. Cada um responde a pergunta que o
   visitante faria ao tocar: que projeto é esse, que certificado, que
   emprego, que conquista, quem recomendou, para onde essa pessoa vai. */
function PainelDaCarreira({
  dados,
  extra,
  aoVoltar,
  aoCompetencia,
}: {
  dados: Dados;
  extra: Selecao;
  aoVoltar: () => void;
  aoCompetencia: (id: string) => void;
}) {
  const tr = usarTraducao();
  const nome = (id: string) => dados.catalog.competencies.find((c) => c.id === id)?.name ?? id;
  const Rotulo = ({ children }: { children: React.ReactNode }) => <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">{children}</p>;
  const Titulo = ({ children }: { children: React.ReactNode }) => <p className="mt-1 font-display text-lg font-bold leading-snug">{children}</p>;
  const Campo = ({ r, v }: { r: string; v: React.ReactNode }) => (v ? <div className="mt-2 text-sm"><span className="text-xs text-slate-400">{r}</span><p className="text-slate-200">{v}</p></div> : null);
  const voltar = <button onClick={aoVoltar} className="mt-3 text-xs text-slate-400 hover:text-tinta">{tr("Ver resumo")}</button>;

  if (extra.tipo === "planeta") {
    const p = (dados.planetas ?? []).find((x) => x.id === extra.id);
    if (!p) return voltar;
    const recs = (dados.sinais ?? []).filter((s) => s.projeto === p.id);
    return (
      <>
        <Rotulo>Projeto · {mesAno(p.at)}{p.setor ? ` · ${p.setor}` : ""}</Rotulo>
        <Titulo>{p.titulo}</Titulo>
        {p.resumo && <p className="mt-1 text-xs text-slate-300">{p.resumo}</p>}
        <Campo r="Papel" v={p.papel} />
        <Campo r="Time e duração" v={[p.time ? `${p.time} ${p.time === 1 ? "pessoa" : "pessoas"}` : "", p.duracao ? `${p.duracao} ${p.duracao === 1 ? "mês" : "meses"}` : ""].filter(Boolean).join(" · ")} />
        <Campo r="O problema" v={p.problema} />
        <Campo r="O que mudou" v={p.resultado} />
        <Campo r="O que aprendeu" v={p.aprendizado} />
        {p.competencias.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.competencias.map((c) => (
              <button key={c} onClick={() => aoCompetencia(c)} className="rounded-full border border-tinta/15 px-2 py-0.5 text-xs text-slate-200 hover:border-acento/60">{nome(c)}</button>
            ))}
          </div>
        )}
        {recs.map((r) => (
          <div key={r.id} className="mt-3 border-t border-tinta/10 pt-3 text-xs">
            <p className="text-slate-200">&ldquo;{r.texto}&rdquo;</p>
            <p className="mt-1 text-slate-400">{r.autor}{r.cargo ? `, ${r.cargo}` : ""}</p>
          </div>
        ))}
        {voltar}
      </>
    );
  }

  if (extra.tipo === "lua") {
    const l = (dados.luas ?? []).find((x) => x.id === extra.id);
    if (!l) return voltar;
    return (
      <>
        <Rotulo>Certificado · {mesAno(l.at)}</Rotulo>
        <Titulo>{l.titulo}</Titulo>
        <p className="mt-1 text-xs text-slate-400">Orbita {nome(l.competencia)}{tr(", a competência que ele trabalha.")}</p>
        <a href={l.verificacao} target="_blank" rel="noopener" className="mt-3 inline-block text-sm text-acento hover:underline">{tr("Verificar o certificado")}</a>
        {voltar}
      </>
    );
  }

  if (extra.tipo === "parada") {
    const t = (dados.trajetoria ?? []).find((x) => x.id === extra.id);
    if (!t) return voltar;
    return (
      <>
        <Rotulo>{tr("Trajetória ·")} {mesAno(t.inicio)} a {t.fim ? mesAno(t.fim) : "hoje"}</Rotulo>
        <Titulo>{t.cargo}</Titulo>
        {t.organizacao && <p className="mt-1 text-sm text-slate-300">{t.organizacao}</p>}
        {t.setor && <p className="mt-1 text-xs text-slate-400">Setor: {t.setor}</p>}
        {voltar}
      </>
    );
  }

  if (extra.tipo === "cometa") {
    const c = (dados.conquistas ?? []).find((x) => x.id === extra.id);
    if (!c) return voltar;
    return (
      <>
        <Rotulo>Conquista · {mesAno(c.at)}</Rotulo>
        <Titulo>{c.titulo}</Titulo>
        {c.descricao && <p className="mt-1 text-sm text-slate-300">{c.descricao}</p>}
        {c.link && <a href={c.link} target="_blank" rel="noopener" className="mt-3 inline-block text-sm text-acento hover:underline">{tr("Ver a prova")}</a>}
        {voltar}
      </>
    );
  }

  if (extra.tipo === "sinal") {
    const r = (dados.sinais ?? []).find((x) => x.id === extra.id);
    if (!r) return voltar;
    const projeto = r.projeto ? (dados.planetas ?? []).find((p) => p.id === r.projeto)?.titulo : null;
    return (
      <>
        <Rotulo>{tr("Recomendação")}{projeto ? ` · ${projeto}` : ""}</Rotulo>
        <p className="mt-2 text-sm leading-relaxed text-slate-100">&ldquo;{r.texto}&rdquo;</p>
        <p className="mt-2 text-sm font-semibold">{r.autor}</p>
        <p className="text-xs text-slate-400">{[r.cargo, r.relacao].filter(Boolean).join(" · ")}</p>
        <p className="mt-2 text-[0.7rem] text-slate-500">{tr("Escrita por quem assina, com e-mail confirmado pela DriveData Academy.")}</p>
        {voltar}
      </>
    );
  }

  if (extra.tipo === "formacao") {
    const f = dados.formacao?.[extra.id];
    return (
      <>
        <Rotulo>{tr("Em formação")}</Rotulo>
        <Titulo>{nome(extra.id)}</Titulo>
        <p className="mt-1 text-sm text-slate-300">{tr("Estudando na DriveData Academy")}{f ? `: ${f.level.toLowerCase()}` : ""}.</p>
        <p className="mt-1 text-xs text-slate-400">{tr("Ainda sem projeto que prove. Quando provar, vira estrela.")}</p>
        {voltar}
      </>
    );
  }

  const g = dados.guia;
  if (!g) return voltar;
  const tem = g.requeridas.filter((r) => r.tem).length;
  return (
    <>
      <Rotulo>{tr("Objetivo")}</Rotulo>
      <Titulo>{g.titulo}</Titulo>
      <p className="mt-1 text-xs text-slate-400">{tr("O que esse cargo costuma pedir, segundo a IA.")} {tem} de {g.requeridas.length} {tr("já comprovadas por projeto.")}</p>
      <ul className="mt-3 flex flex-col gap-2">
        {g.requeridas.map((r) => (
          <li key={r.id} className="text-sm">
            <button onClick={() => r.tem && aoCompetencia(r.id)} className={r.tem ? "font-semibold text-acento hover:underline" : "font-semibold text-slate-300"}>
              {r.tem ? "✓ " : "○ "}{nome(r.id)}
            </button>
            <p className="text-xs text-slate-400">{r.motivo}</p>
            {!r.tem && r.cursos.length > 0 && (
              <p className="text-xs text-slate-400">
                {tr("Para acender:")} {r.cursos.map((c, i) => (
                  <a key={c.slug} href={`/cursos/${c.slug}`} target="_top" className="text-sky-300 hover:underline">{i > 0 ? ", " : ""}{c.titulo}</a>
                ))}
              </p>
            )}
          </li>
        ))}
      </ul>
      {voltar}
    </>
  );
}

type Aderencia = {
  itens: { id: string; nome: string; trecho: string; tem: boolean; projetos: string[]; cursos: { titulo: string; slug: string }[] }[];
  tem: number;
  total: number;
};

function PainelDaVaga({ vaga, aoFechar, aoCompetencia }: { vaga: Aderencia; aoFechar: () => void; aoCompetencia: (id: string) => void }) {
  const tr = usarTraducao();
  return (
    <>
      <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400">{tr("Aderência à vaga")}</p>
      <p className="mt-1 font-display text-2xl font-bold">
        {vaga.tem} <span className="text-base font-normal text-slate-400">{tr("de")} {vaga.total} {tr("pedidas já provadas")}</span>
      </p>
      <p className="mt-1 text-xs text-slate-400">{tr("Anel verde: provada em projeto. Estrela vazada: a vaga pede e ainda não há projeto que prove.")}</p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {vaga.itens.map((i) => (
          <li key={i.id} className="text-sm">
            <button onClick={() => i.tem && aoCompetencia(i.id)} className={i.tem ? "font-semibold text-acento hover:underline" : "font-semibold text-orange-200"}>
              {i.tem ? "✓ " : "○ "}{i.nome}
            </button>
            <p className="text-xs text-slate-400">A vaga: &ldquo;{i.trecho}&rdquo;</p>
            {i.tem && <p className="text-xs text-slate-300">{tr("Provada em")} {i.projetos.join(", ")}</p>}
            {!i.tem && i.cursos.length > 0 && (
              <p className="text-xs text-slate-400">
                {tr("Curso na Academy:")} {i.cursos.map((c, k) => (
                  <a key={c.slug} href={`/cursos/${c.slug}`} target="_top" className="text-sky-300 hover:underline">{k > 0 ? ", " : ""}{c.titulo}</a>
                ))}
              </p>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[0.7rem] text-slate-500">{tr("Leitura feita por IA a partir do texto da vaga. Confira os trechos.")}</p>
      <button onClick={aoFechar} className="mt-2 text-xs text-slate-400 hover:text-tinta">{tr("Fechar comparação")}</button>
    </>
  );
}
