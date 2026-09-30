"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";

import { useEffect, useRef } from "react";
import type { UniversoPublico as Dados } from "@/lib/knowledge/publico";
import type { Selecao } from "./CarreiraNoEspaco";

/* O roteiro da carreira, ao lado da animação.

   A animação sozinha confundia: estrelas acendendo, planetas nascendo, a nave
   andando, tudo ao mesmo tempo e sem dizer o que era. O roteiro divide o play
   em capítulos, um por ponto da linha do tempo, e cada linha do capítulo diz
   o que se mexeu no espaço e o que aquilo significa. O visitante pode pular
   para um capítulo, pausar e tocar numa linha para ver o objeto de perto. */

export type Alvo = { comp?: string; extra?: Selecao };
export type Tipo = "nave" | "planeta" | "estrela" | "reforco" | "perfil" | "cometa" | "lua" | "sinal" | "formacao" | "guia" | "constelacao" | "ecliptica";
export type LinhaDoRoteiro = { tipo: Tipo; texto: string; explica: string; alvo?: Alvo };
export type Capitulo = { at: string; titulo: string; linhas: LinhaDoRoteiro[] };

const noPeriodo = (iso: string | null | undefined, ant: string, at: string) => !!iso && iso.slice(0, 7) <= at && iso.slice(0, 7) > ant;
const lista = (nomes: string[]) => (nomes.length <= 1 ? nomes.join("") : `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)}`);

export function capitulosDaCarreira(d: Dados): Capitulo[] {
  const nome = (id: string) => d.catalog.competencies.find((c) => c.id === id)?.name ?? id;
  const trajeto = [...(d.trajetoria ?? [])].sort((a, b) => a.inicio.localeCompare(b.inicio));
  const ultimo = d.quadros.length - 1;

  return d.quadros.map((q, i) => {
    const at = q.at.slice(0, 7);
    const ant = i > 0 ? d.quadros[i - 1].at.slice(0, 7) : "";
    const antes = i > 0 ? d.quadros[i - 1].scores : {};
    const linhas: LinhaDoRoteiro[] = [];

    for (const t of trajeto.filter((t) => noPeriodo(t.inicio, ant, at))) {
      const primeira = trajeto[0].id === t.id;
      linhas.push({
        tipo: "nave",
        texto: `${t.cargo}${t.organizacao ? `, ${t.organizacao}` : ""}`,
        explica: primeira
          ? "A nave entra no espaço. Ela é a trajetória profissional, e cada parada da rota é um cargo."
          : "A nave segue a rota até uma nova parada: começa este cargo.",
        alvo: { extra: { tipo: "parada", id: t.id } },
      });
    }

    for (const p of (d.planetas ?? []).filter((p) => noPeriodo(p.at, ant, at))) {
      const partes = [`Nasce um planeta perto das ${p.competencias.length} competências que este projeto prova`];
      if (p.duracao) partes.push(`o tamanho vem da duração, ${p.duracao} ${p.duracao === 1 ? "mês" : "meses"}`);
      if (p.time) partes.push(`os anéis vêm do time, ${p.time} ${p.time === 1 ? "pessoa" : "pessoas"}`);
      linhas.push({ tipo: "planeta", texto: p.titulo, explica: `${partes.join("; ")}.`, alvo: { extra: { tipo: "planeta", id: p.id } } });
    }

    const agora = d.catalog.competencies.filter((c) => (q.scores[c.id]?.score ?? 0) > 0);
    const novas = agora.filter((c) => !((antes[c.id]?.score ?? 0) > 0));
    const declarada = (id: string) => /declarada/i.test(q.scores[id]?.level ?? "");
    const provadas = novas.filter((c) => !declarada(c.id));
    const doPerfil = novas.filter((c) => declarada(c.id));
    if (provadas.length) {
      linhas.push({
        tipo: "estrela",
        texto: lista(provadas.map((c) => c.name)),
        explica:
          provadas.length === 1
            ? "Uma estrela acende: competência provada em projeto pela primeira vez. A cor é a área."
            : "Estrelas acendem: competências provadas em projeto pela primeira vez. A cor é a área.",
        alvo: { comp: provadas[0].id },
      });
    }
    const reforcadas = agora.filter((c) => (antes[c.id]?.score ?? 0) > 0 && (q.scores[c.id]?.score ?? 0) > (antes[c.id]?.score ?? 0));
    if (reforcadas.length) {
      linhas.push({
        tipo: "reforco",
        texto: lista(reforcadas.map((c) => c.name)),
        explica: "Estas estrelas crescem: outro projeto provou a mesma competência de novo.",
        alvo: { comp: reforcadas[0].id },
      });
    }
    if (doPerfil.length) {
      linhas.push({
        tipo: "perfil",
        texto: lista(doPerfil.map((c) => c.name)),
        explica: "Declaradas no perfil, ainda sem projeto que prove. Aparecem menores e apagadas.",
        alvo: { comp: doPerfil[0].id },
      });
    }

    for (const c of (d.conquistas ?? []).filter((c) => noPeriodo(c.at, ant, at))) {
      linhas.push({ tipo: "cometa", texto: c.titulo, explica: "Um cometa cruza o céu: uma conquista, com data e prova.", alvo: { extra: { tipo: "cometa", id: c.id } } });
    }
    for (const l of (d.luas ?? []).filter((l) => noPeriodo(l.at, ant, at))) {
      linhas.push({ tipo: "lua", texto: l.titulo, explica: `Uma lua passa a orbitar ${nome(l.competencia)}: certificado verificável da Academy.`, alvo: { extra: { tipo: "lua", id: l.id } } });
    }

    // Hoje: o que não tem data de acontecimento, mas descreve onde a pessoa está.
    if (i === ultimo) {
      for (const s of d.sinais ?? []) {
        linhas.push({ tipo: "sinal", texto: `Recomendação de ${s.autor}`, explica: "Um sinal de rádio pulsa: recomendação escrita por quem trabalhou junto, com e-mail confirmado.", alvo: { extra: { tipo: "sinal", id: s.id } } });
      }
      const formacao = Object.keys(d.formacao ?? {});
      if (formacao.length) {
        linhas.push({
          tipo: "formacao",
          texto: lista(formacao.map(nome)),
          explica: "Estrela vazada: estudando na DriveData Academy, ainda sem projeto que prove.",
          alvo: { extra: { tipo: "formacao", id: formacao[0] } },
        });
      }
      if (d.guia) {
        const tem = d.guia.requeridas.filter((r) => r.tem).length;
        linhas.push({
          tipo: "guia",
          texto: `Objetivo: ${d.guia.titulo}`,
          explica: `A estrela-guia aparece no fim. As linhas douradas ligam ao que o cargo pede: ${tem} de ${d.guia.requeridas.length} já provadas.`,
          alvo: { extra: { tipo: "guia" } },
        });
      }
    }

    const principal = linhas.find((l) => l.tipo === "planeta") ?? linhas.find((l) => l.tipo === "nave") ?? linhas.find((l) => l.tipo === "cometa") ?? linhas.find((l) => l.tipo === "lua");
    const titulo = principal
      ? principal.texto
      : i === ultimo
        ? "Hoje"
        : linhas.length
          ? linhas[0].texto
          : "Sem mudança";
    return { at: q.at, titulo, linhas };
  });
}

/* Um desenho pequeno para cada tipo, com a mesma cor do objeto no espaço,
   para o visitante achar na cena o que está lendo no roteiro. */
export function Simbolo({ tipo }: { tipo: Tipo }) {
  const p = { width: 16, height: 16, viewBox: "0 0 16 16", "aria-hidden": true, className: "mt-0.5 shrink-0" } as const;
  switch (tipo) {
    case "nave":
      return <svg {...p}><path d="M8 2 L12 13 L8 10.5 L4 13 Z" fill="#7fe9ff" /></svg>;
    case "planeta":
      return <svg {...p}><circle cx="8" cy="8" r="4.2" fill="#b39cff" /><ellipse cx="8" cy="8" rx="7.2" ry="2.2" fill="none" stroke="#d9ccff" strokeWidth="1" /></svg>;
    case "estrela":
      return <svg {...p}><circle cx="8" cy="8" r="6" fill="#6dffb0" opacity=".18" /><circle cx="8" cy="8" r="3.2" fill="#6dffb0" /></svg>;
    case "reforco":
      return <svg {...p}><circle cx="8" cy="8" r="3.4" fill="#6dffb0" /><circle cx="8" cy="8" r="6.2" fill="none" stroke="#6dffb0" strokeWidth="1" opacity=".6" /></svg>;
    case "perfil":
      return <svg {...p}><circle cx="8" cy="8" r="2.6" fill="#8393ac" /></svg>;
    case "cometa":
      return <svg {...p}><path d="M2 3 L10.5 9.5" stroke="#ffe7a8" strokeWidth="1.4" strokeLinecap="round" opacity=".7" /><circle cx="11.5" cy="10.5" r="2.6" fill="#ffe29a" /></svg>;
    case "lua":
      return <svg {...p}><circle cx="7" cy="8" r="3" fill="none" stroke="#9fb3c8" strokeWidth="1" /><circle cx="12.5" cy="5" r="2" fill="#e8eef6" /></svg>;
    case "sinal":
      return <svg {...p}><circle cx="8" cy="8" r="1.8" fill="#8ff3d6" /><circle cx="8" cy="8" r="4.2" fill="none" stroke="#8ff3d6" strokeWidth="1" opacity=".7" /><circle cx="8" cy="8" r="6.8" fill="none" stroke="#8ff3d6" strokeWidth="1" opacity=".35" /></svg>;
    case "formacao":
      return <svg {...p}><circle cx="8" cy="8" r="4.5" fill="none" stroke="#9fb3c8" strokeWidth="1.2" strokeDasharray="2 1.6" /></svg>;
    case "constelacao":
      return <svg {...p}><path d="M3 5 L9 3 L14 7 L12 13 L5 12 Z" fill="none" stroke="#9fb3c8" strokeWidth="1" strokeDasharray="1.6 1.2" /><path d="M6 6 L9 5 L11 9" stroke="#6dffb0" strokeWidth="1.1" fill="none" /><circle cx="6" cy="6" r="1.3" fill="#6dffb0" /><circle cx="9" cy="5" r="1.3" fill="#6dffb0" /><circle cx="11" cy="9" r="1.3" fill="#6dffb0" /></svg>;
    case "ecliptica":
      return <svg {...p}><ellipse cx="8" cy="8" rx="7" ry="4.5" fill="none" stroke="#ffd27a" strokeWidth="1" strokeDasharray="1.6 1.2" /><circle cx="3" cy="10" r="1.6" fill="#b39cff" /><circle cx="13" cy="10" r="1.6" fill="#b39cff" /></svg>;
    case "guia":
      return <svg {...p}><path d="M8 1.5 L9.6 6.4 L14.5 8 L9.6 9.6 L8 14.5 L6.4 9.6 L1.5 8 L6.4 6.4 Z" fill="#ffd27a" /></svg>;
  }
}

// Quando a linha repete o título do capítulo, ela diz só o que apareceu.
const NOME_DO_TIPO: Record<Tipo, string> = {
  nave: "Nova parada da nave",
  planeta: "Novo planeta",
  estrela: "Estrelas novas",
  reforco: "Estrelas maiores",
  perfil: "Do perfil",
  cometa: "Cometa",
  lua: "Nova lua",
  sinal: "Sinal",
  formacao: "Em formação",
  guia: "Estrela-guia",
  constelacao: "Constelação",
  ecliptica: "Eclíptica",
};

const LEGENDA: { tipo: Tipo; nome: string }[] = [
  { tipo: "constelacao", nome: "Constelação: uma área de competências, com fronteira e figura" },
  { tipo: "ecliptica", nome: "Eclíptica: o anel dos projetos, em ordem de data" },
  { tipo: "estrela", nome: "Estrela: competência provada em projeto" },
  { tipo: "planeta", nome: "Planeta: projeto" },
  { tipo: "nave", nome: "Nave e rota: trajetória profissional" },
  { tipo: "cometa", nome: "Cometa: conquista" },
  { tipo: "lua", nome: "Lua: certificado" },
  { tipo: "sinal", nome: "Sinal: recomendação" },
  { tipo: "formacao", nome: "Estrela vazada: em formação na Academy" },
  { tipo: "perfil", nome: "Ponto apagado: declarada no perfil" },
  { tipo: "guia", nome: "Estrela-guia: objetivo" },
];

export default function RoteiroDaCarreira({
  capitulos,
  quadro,
  tocando,
  rotulo,
  onIr,
  onTocar,
  onPausar,
  onFoco,
  onFechar,
}: {
  capitulos: Capitulo[];
  /** -1 enquanto o universo está apagado, no começo do play. */
  quadro: number;
  tocando: boolean;
  rotulo: (iso: string) => string;
  onIr: (i: number) => void;
  onTocar: () => void;
  onPausar: () => void;
  onFoco: (alvo: Alvo) => void;
  onFechar: () => void;
}) {
  const tr = usarTraducao();
  const itens = useRef<(HTMLLIElement | null)[]>([]);
  useEffect(() => {
    itens.current[quadro]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [quadro]);

  const tipos = new Set(capitulos.flatMap((c) => c.linhas.map((l) => l.tipo)));
  const atual = quadro >= 0 ? capitulos[quadro] : null;
  const botao = "grid h-8 w-8 place-items-center rounded-lg border border-tinta/15 text-slate-200 hover:border-tinta/40 disabled:opacity-30";

  return (
    <aside
      aria-label={tr("Roteiro da carreira")}
      className="absolute bottom-3 left-3 right-3 flex max-h-[46%] flex-col rounded-2xl border border-tinta/10 bg-ink-800/92 backdrop-blur sm:bottom-5 sm:left-auto sm:right-5 sm:top-5 sm:max-h-none sm:w-[23.5rem]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-tinta/10 px-3 py-2 sm:px-4 sm:py-3">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold sm:text-base">{tr("Roteiro")}<span className="hidden sm:inline"> {tr("da carreira")}</span></p>
          <p className="font-mono text-xs tabular-nums text-slate-400">
            {quadro < 0 ? "começando" : `${quadro + 1} de ${capitulos.length}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button className={botao} onClick={() => onIr(Math.max(0, quadro - 1))} disabled={quadro <= 0} aria-label={tr("Capítulo anterior")}>‹</button>
          <button
            className="h-8 rounded-lg bg-white px-3 text-xs font-semibold text-ink-800 hover:bg-slate-200"
            onClick={tocando ? onPausar : onTocar}
          >
            {tocando ? "Pausar" : quadro >= capitulos.length - 1 ? "Do início" : "Continuar"}
          </button>
          <button className={botao} onClick={() => onIr(Math.min(capitulos.length - 1, quadro + 1))} disabled={quadro >= capitulos.length - 1} aria-label={tr("Próximo capítulo")}>›</button>
          <button className={`${botao} ml-1`} onClick={onFechar} aria-label={tr("Fechar o roteiro")}>×</button>
        </div>
      </div>

      {/* No celular, só o capítulo atual: a constelação precisa da tela. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {quadro < 0 && <p className="px-2 py-3 text-sm text-slate-400">{tr("O espaço começa vazio. A carreira acende em ordem de data.")}</p>}
        <ol className="flex flex-col">
          {capitulos.map((c, i) => {
            const aqui = i === quadro;
            return (
              <li key={c.at + i} ref={(el) => { itens.current[i] = el; }} className={aqui ? "" : "hidden sm:block"}>
                <button
                  onClick={() => onIr(i)}
                  className={`flex w-full items-baseline gap-3 border-l-2 px-2 py-1.5 text-left ${aqui ? "border-acento" : "border-transparent hover:border-tinta/20"}`}
                >
                  <span className={`w-16 shrink-0 font-mono text-xs tabular-nums ${aqui ? "text-acento" : i < quadro ? "text-slate-400" : "text-slate-600"}`}>{rotulo(c.at)}</span>
                  <span className={`min-w-0 text-sm leading-snug ${aqui ? "font-semibold text-tinta" : i < quadro ? "text-slate-300" : "text-slate-500"}`}>{c.titulo}</span>
                </button>
                {aqui && c.linhas.length > 0 && (
                  <ul key={`linhas-${i}`} className="surgir mb-2 ml-[1.1rem] flex flex-col gap-2.5 border-l border-tinta/10 py-1 pl-3">
                    {c.linhas.map((l, k) => (
                      <li key={k}>
                        <button
                          onClick={() => l.alvo && onFoco(l.alvo)}
                          disabled={!l.alvo}
                          className="group flex w-full gap-2.5 text-left"
                          title={tr("Ver no espaço")}
                        >
                          <Simbolo tipo={l.tipo} />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-slate-100 group-hover:text-acento">
                              {l.texto === c.titulo ? NOME_DO_TIPO[l.tipo] : l.texto}
                            </span>
                            <span className="block text-xs leading-relaxed text-slate-400">{l.explica}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {atual && <p className="hidden border-t border-tinta/10 px-4 py-2 text-[0.72rem] text-slate-500 sm:block">{tr("Toque numa linha para ver o objeto de perto.")}</p>}

      <details className="hidden border-t border-tinta/10 px-4 py-2.5 sm:block">
        <summary className="cursor-pointer text-xs font-semibold text-slate-300 hover:text-tinta">{tr("Como ler o espaço")}</summary>
        <ul className="mt-2 flex flex-col gap-1.5">
          {LEGENDA.filter((l) => tipos.has(l.tipo) || l.tipo === "estrela" || l.tipo === "constelacao" || (l.tipo === "ecliptica" && tipos.has("planeta"))).map((l) => (
            <li key={l.tipo} className="flex items-start gap-2 text-xs text-slate-400">
              <Simbolo tipo={l.tipo} />
              {l.nome}
            </li>
          ))}
        </ul>
      </details>
    </aside>
  );
}
