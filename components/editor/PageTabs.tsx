"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Plus, Copy, Trash2, FileStack, ArrowLeftRight, FlipHorizontal, GalleryHorizontal, Layers as LayersIcon, type LucideIcon } from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import type { TransicaoTipo } from "@/lib/editor/types";

const OPCOES: { v: TransicaoTipo; label: string; curto: string; icon: LucideIcon }[] = [
  { v: "none", label: "Nenhuma", curto: "Nenhuma", icon: LayersIcon },
  { v: "flip", label: "Virar (frente/verso)", curto: "Virar", icon: FlipHorizontal },
  { v: "fade", label: "Fade", curto: "Fade", icon: GalleryHorizontal },
  { v: "slide", label: "Slide", curto: "Slide", icon: GalleryHorizontal },
];

function Range({ label, valor, min, max, step, onChange, suf = "" }: { label: string; valor: number; min: number; max: number; step: number; onChange: (v: number) => void; suf?: string }) {
  return (
    <label className="flex items-center justify-between gap-2 px-1 py-0.5 text-[11px] text-muted">
      <span className="shrink-0">{label}</span>
      <span className="flex items-center gap-1.5">
        <input type="range" min={min} max={max} step={step} value={valor} onChange={(e) => onChange(Number(e.target.value))} className="w-20 accent-viz" />
        <span className="w-8 text-right font-mono text-foreground">{valor}{suf}</span>
      </span>
    </label>
  );
}

/** Botão de transição ENTRE as páginas — abre a configuração completa num popover. */
function TransicaoInline() {
  const transicao = useEditor((s) => s.doc.transicao);
  const setTransicao = useEditor((s) => s.setTransicao);
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false); };
    window.addEventListener("pointerdown", fora);
    return () => window.removeEventListener("pointerdown", fora);
  }, [aberto]);

  const atual = OPCOES.find((o) => o.v === transicao.tipo) ?? OPCOES[0];
  const ativo = transicao.tipo !== "none";
  const ehFlip = transicao.tipo === "flip";
  const ehSlideshow = transicao.tipo === "fade" || transicao.tipo === "slide";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setAberto((v) => !v)}
        title="Configurar a transição entre as páginas"
        className={`flex items-center gap-1 rounded-full border border-dashed px-2 py-1 text-[10px] font-medium transition-colors ${ativo ? "border-viz bg-viz/10 text-viz-dark" : "border-viz/40 text-muted hover:text-viz-dark"}`}
      >
        <ArrowLeftRight className="h-3 w-3" /> {ativo ? atual.curto : "Transição"}
      </button>
      {aberto && (
        <div className="absolute bottom-9 left-1/2 z-40 w-56 -translate-x-1/2 rounded-xl border border-border bg-surface p-2 shadow-2xl">
          <p className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">Transição entre páginas</p>
          <div className="grid grid-cols-2 gap-1">
            {OPCOES.map((o) => {
              const Ic = o.icon;
              return (
                <button key={o.v} onClick={() => setTransicao({ tipo: o.v })} className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] ${transicao.tipo === o.v ? "border-viz bg-viz/10 text-viz-dark" : "border-border text-muted hover:border-viz/50"}`}>
                  <Ic className="h-3.5 w-3.5 shrink-0" /> {o.curto}
                </button>
              );
            })}
          </div>

          {ehFlip && (
            <div className="mt-2 border-t border-border pt-1.5">
              <div className="flex items-center justify-between gap-2 px-1 py-0.5">
                <span className="text-[11px] text-muted">Vira</span>
                <div className="flex gap-0.5 rounded-md bg-background p-0.5">
                  <button onClick={() => setTransicao({ auto: false })} className={`rounded px-2 py-0.5 text-[11px] ${!transicao.auto ? "bg-surface shadow-sm" : "text-muted"}`}>No hover</button>
                  <button onClick={() => setTransicao({ auto: true })} className={`rounded px-2 py-0.5 text-[11px] ${transicao.auto ? "bg-surface shadow-sm" : "text-muted"}`}>Sozinho</button>
                </div>
              </div>
              <Range label="Velocidade" valor={transicao.duracao} min={0.2} max={2} step={0.1} onChange={(duracao) => setTransicao({ duracao })} suf="s" />
              {transicao.auto && <Range label="Tempo/lado" valor={transicao.intervalo} min={1} max={10} step={0.5} onChange={(intervalo) => setTransicao({ intervalo })} suf="s" />}
            </div>
          )}
          {ehSlideshow && (
            <div className="mt-2 border-t border-border pt-1.5">
              <Range label="Tempo/página" valor={transicao.intervalo} min={1} max={10} step={0.5} onChange={(intervalo) => setTransicao({ intervalo })} suf="s" />
              <Range label="Velocidade" valor={transicao.duracao} min={0.2} max={2} step={0.1} onChange={(duracao) => setTransicao({ duracao })} suf="s" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PageTabs() {
  const paginas = useEditor((s) => s.doc.paginas);
  const ativa = useEditor((s) => Math.min(s.paginaAtiva, s.doc.paginas.length - 1));
  const setPaginaAtiva = useEditor((s) => s.setPaginaAtiva);
  const adicionarPagina = useEditor((s) => s.adicionarPagina);
  const duplicarPagina = useEditor((s) => s.duplicarPagina);
  const removerPagina = useEditor((s) => s.removerPagina);
  const renomearPagina = useEditor((s) => s.renomearPagina);

  const [editando, setEditando] = useState<number | null>(null);
  const cheio = paginas.length >= 2;

  const tabItens: ReactNode[] = paginas.map((p, i) => {
    const sel = i === ativa;
    return (
      <Fragment key={p.id}>
        {i > 0 && <TransicaoInline />}
        <div
          onClick={() => setPaginaAtiva(i)}
          className={`group flex shrink-0 cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs ${sel ? "border-viz bg-viz/10 text-viz-dark" : "border-border text-muted hover:border-viz/50"}`}
        >
          <span className={`grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold ${sel ? "bg-viz text-white" : "bg-background"}`}>{i + 1}</span>
          {editando === i ? (
            <input
              autoFocus
              defaultValue={p.nome}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => { renomearPagina(i, e.target.value || p.nome); setEditando(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              className="w-20 rounded border border-viz bg-surface px-1 text-xs focus:outline-none"
            />
          ) : (
            <span onDoubleClick={(e) => { e.stopPropagation(); setEditando(i); }} className="max-w-[120px] truncate">{p.nome}</span>
          )}
          {paginas.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); if (confirm(`Excluir "${p.nome}"?`)) removerPagina(i); }}
              title="Excluir página"
              className="text-muted opacity-0 hover:text-red-600 group-hover:opacity-100"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </Fragment>
    );
  });

  return (
    <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1.5">
      <FileStack className="h-4 w-4 shrink-0 text-muted" />
      <span className="shrink-0 text-[11px] font-medium text-muted">Páginas</span>

      <div className="flex items-center gap-1">{tabItens}</div>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        {!cheio && (
          <>
            <button onClick={duplicarPagina} title="Duplicar página atual" className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-foreground">
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button onClick={adicionarPagina} title="Adicionar o verso (2ª página)" className="flex items-center gap-1 rounded-md border border-viz bg-viz/10 px-2 py-1 text-xs font-medium text-viz-dark">
              <Plus className="h-3.5 w-3.5" /> Verso
            </button>
          </>
        )}
        {cheio && <span className="text-[10px] text-muted">máx. 2 páginas</span>}
      </div>
    </div>
  );
}
