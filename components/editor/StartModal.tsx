"use client";

import { useEffect, useState } from "react";
import { Blocks, Sigma, Code2, X } from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import { PALETAS } from "@/lib/editor/paletas";
import Modal from "./Modal";

const COMO = [
  { icon: Blocks, titulo: "Monte o card", texto: "Arraste componentes da esquerda: KPI, gauge, funil, tabela…" },
  { icon: Sigma, titulo: "Aponte suas medidas", texto: "Troque o valor para “Dinâmico” e informe a medida do seu modelo." },
  { icon: Code2, titulo: "Leve pro Power BI", texto: "Clique em “Código”, copie a DAX e use no visual HTML Content." },
];

const PRESETS = [
  { label: "KPI pequeno", w: 280, h: 150 },
  { label: "KPI tile", w: 320, h: 180 },
  { label: "Card largo", w: 480, h: 200 },
  { label: "Quadrado", w: 280, h: 280 },
  { label: "Banner", w: 640, h: 160 },
  { label: "Card alto", w: 300, h: 360 },
];

export default function StartModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const atualizarCard = useEditor((s) => s.atualizarCard);
  const setPaleta = useEditor((s) => s.setPaleta);
  const paletaAtual = useEditor((s) => s.doc.paleta);

  const [dashW, setDashW] = useState(1280);
  const [dashH, setDashH] = useState(720);
  const [cols, setCols] = useState(4);
  const [rows, setRows] = useState(3);
  const [gap, setGap] = useState(8);

  // Faixa "como funciona": aparece até o aluno dispensar (lembrado no navegador).
  const [verComo, setVerComo] = useState(false);
  useEffect(() => {
    if (!open) return;
    try { setVerComo(localStorage.getItem("dd-onboarding-visto") !== "1"); } catch { setVerComo(true); }
  }, [open]);
  function dispensarComo() {
    setVerComo(false);
    try { localStorage.setItem("dd-onboarding-visto", "1"); } catch { /* ignora */ }
  }

  const cardW = Math.max(80, Math.floor((dashW - gap * (cols + 1)) / cols));
  const cardH = Math.max(60, Math.floor((dashH - gap * (rows + 1)) / rows));

  function aplicar(w: number, h: number) {
    atualizarCard({ w, h });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} titulo="Novo visual" wide>
      {verComo && (
        <div className="relative border-b border-border bg-viz/5 px-5 py-4">
          <button onClick={dispensarComo} aria-label="Não mostrar novamente" title="Não mostrar novamente" className="absolute right-3 top-3 text-muted hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-viz-dark">Como funciona</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {COMO.map((c, i) => (
              <div key={c.titulo} className="flex gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-viz/15 text-viz-dark">
                  <c.icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold">{i + 1}. {c.titulo}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted">{c.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="border-b border-border px-5 pb-4 pt-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Paleta de cores</h3>
          <span className="text-[11px] text-muted">Temas completos ficam no painel à direita</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PALETAS.map((p) => {
            const ativa = JSON.stringify(p.cores) === JSON.stringify(paletaAtual);
            return (
              <button key={p.nome} onClick={() => setPaleta([...p.cores])} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${ativa ? "border-viz bg-viz/10" : "border-border hover:border-viz/50"}`}>
                <span className="flex h-4 w-12 overflow-hidden rounded">
                  {p.cores.slice(0, 4).map((c, i) => (<span key={i} className="flex-1" style={{ background: c }} />))}
                </span>
                <span className="text-xs font-medium">{p.nome}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid gap-5 p-5 sm:grid-cols-2">
        {/* Presets */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Tamanhos comuns</h3>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => aplicar(p.w, p.h)}
                className="flex flex-col items-start gap-1 rounded-xl border border-border bg-background p-3 text-left transition-colors hover:border-viz hover:bg-viz/5"
              >
                <div className="flex h-12 w-full items-center justify-center">
                  <div className="rounded border border-viz/40 bg-viz/10" style={{ width: Math.min(80, p.w / 6), height: Math.min(44, p.h / 6) }} />
                </div>
                <span className="text-sm font-medium">{p.label}</span>
                <span className="font-mono text-[11px] text-muted">{p.w}×{p.h}px</span>
              </button>
            ))}
          </div>
        </div>

        {/* Calculadora */}
        <div className="rounded-xl border border-border bg-background p-4">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Calcular pelo dashboard</h3>
          <p className="mb-3 text-xs text-muted">Informe o tamanho da sua página e em quantos cards quer dividir.</p>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Campo rotulo="Largura da página" valor={dashW} onChange={setDashW} />
              <Campo rotulo="Altura da página" valor={dashH} onChange={setDashH} />
            </div>
            <div className="flex gap-2">
              <Campo rotulo="Colunas" valor={cols} onChange={(v) => setCols(Math.max(1, v))} />
              <Campo rotulo="Linhas" valor={rows} onChange={(v) => setRows(Math.max(1, v))} />
              <Campo rotulo="Espaço" valor={gap} onChange={(v) => setGap(Math.max(0, v))} />
            </div>
            <div className="rounded-lg border border-viz/30 bg-viz/5 p-3 text-center">
              <p className="text-xs text-muted">Tamanho sugerido do card</p>
              <p className="font-mono text-lg font-bold text-viz-dark">{cardW} × {cardH}px</p>
            </div>
            <button onClick={() => aplicar(cardW, cardH)} className="rounded-lg bg-viz py-2.5 text-sm font-medium text-white transition-colors hover:bg-viz-dark">
              Usar esse tamanho
            </button>
          </div>
        </div>
      </div>
      <div className="border-t border-border px-5 py-3 text-center">
        <button onClick={onClose} className="text-sm text-muted hover:text-foreground">
          Pular e usar o tamanho atual
        </button>
      </div>
    </Modal>
  );
}

function Campo({ rotulo, valor, onChange }: { rotulo: string; valor: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className="text-[10px] uppercase text-muted">{rotulo}</span>
      <input
        type="number"
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-border bg-surface px-2 py-1.5 font-mono text-xs focus:border-viz focus:outline-none"
      />
    </label>
  );
}
