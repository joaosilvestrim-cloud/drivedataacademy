"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronDown, AlignLeft, AlignCenter, AlignRight,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
  ArrowUp, ArrowDown, Minus, BringToFront, SendToBack, Copy, ClipboardPaste, RotateCcw,
  Moon, Building2, TrendingUp, Zap, Minimize2, BarChart3, type LucideIcon,
  Type, Hash, Square as SquareIc, Image as ImageIc, Gauge, Tag, MousePointerClick, Users, Table as TableIc, RectangleHorizontal,
  List, SeparatorHorizontal, Thermometer, PieChart, SlidersHorizontal, CreditCard,
  MessageSquareText, Target, Plus, Trash2, Ban, Circle, Squircle, Filter, Funnel, Grid3x3, GitCommitHorizontal,
  SquareActivity, ChartArea, CircleGauge, Columns2,
} from "lucide-react";

const TEMA_ICON: Record<string, LucideIcon> = {
  "Dark Modern": Moon,
  "Corporate Blue": Building2,
  "Finance": TrendingUp,
  "Neon": Zap,
  "Minimal": Minimize2,
  "Power BI": BarChart3,
};
import { Star, AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter } from "lucide-react";
import { useEditor, elementosAtivos } from "@/lib/editor/store";
import { iconeSvg } from "@/lib/editor/icones";
import { PALETAS } from "@/lib/editor/paletas";
import { QUICK_STYLES } from "@/lib/editor/quickStyles";
import { TEMAS } from "@/lib/editor/temas";
import ColorPicker from "./ColorPicker";
import IconePicker from "./IconePicker";
import { criarElemento } from "@/lib/editor/defaults";
import { FORMATOS, TIPOS_FORMATAVEIS } from "@/lib/editor/format";
import type { AnimacaoTipo, Binding, Direcao, ElementType, FormatoNum, OperadorCor, SceneElement } from "@/lib/editor/types";

const TIPO_META: Record<ElementType, { icon: LucideIcon; label: string }> = {
  texto: { icon: Type, label: "Texto" },
  kpi: { icon: Hash, label: "KPI" },
  forma: { icon: SquareIc, label: "Forma" },
  icone: { icon: Star, label: "Ícone" },
  linha: { icon: Minus, label: "Linha" },
  progresso: { icon: RectangleHorizontal, label: "Progresso" },
  imagem: { icon: ImageIc, label: "Imagem" },
  gauge: { icon: Gauge, label: "Meio-gauge" },
  tendencia: { icon: TrendingUp, label: "Tendência" },
  badge: { icon: Tag, label: "Badge" },
  botao: { icon: MousePointerClick, label: "Botão" },
  pictograma: { icon: Users, label: "Pictograma" },
  tabela: { icon: TableIc, label: "Tabela" },
  rating: { icon: Star, label: "Rating" },
  sparkline: { icon: BarChart3, label: "Mini-barras" },
  lista: { icon: List, label: "Lista" },
  divisorRotulo: { icon: SeparatorHorizontal, label: "Divisor c/ texto" },
  velocimetro: { icon: Gauge, label: "Velocímetro" },
  bullet: { icon: SlidersHorizontal, label: "Bullet" },
  termometro: { icon: Thermometer, label: "Termômetro" },
  donut: { icon: PieChart, label: "Donut" },
  cartao: { icon: CreditCard, label: "Cartão KPI" },
  cardGauge: { icon: Gauge, label: "Card + Gauge" },
  narrativo: { icon: MessageSquareText, label: "Texto narrativo" },
  comparativo: { icon: Target, label: "Card comparativo" },
  chip: { icon: Tag, label: "Chip de métrica" },
  filtros: { icon: Filter, label: "Filtros aplicados" },
  funil: { icon: Funnel, label: "Funil" },
  waffle: { icon: Grid3x3, label: "Waffle" },
  timeline: { icon: GitCommitHorizontal, label: "Timeline" },
  kpiCompleto: { icon: SquareActivity, label: "KPI completo" },
  areaMini: { icon: ChartArea, label: "Mini linha" },
  anelKpi: { icon: CircleGauge, label: "Anel KPI" },
  comparaAB: { icon: Columns2, label: "Comparativo A/B" },
};

function MiniPreview({ el }: { el: SceneElement }) {
  const e = el.estilo;
  const conteudo =
    el.type === "icone" ? (
      <span dangerouslySetInnerHTML={{ __html: iconeSvg(el.binding.valor, e.cor, "26px") }} />
    ) : el.type === "tabela" ? (
      <span className="text-xs">Tabela · {(el.colunas ?? []).length} col</span>
    ) : el.type === "forma" || el.type === "linha" ? (
      <span className="text-[11px] opacity-60">{el.type}</span>
    ) : el.type === "progresso" ? (
      <span style={{ display: "block", width: "70%", height: 8, borderRadius: 6, background: e.fundo }}>
        <span style={{ display: "block", width: `${el.binding.valor || 0}%`, height: "100%", borderRadius: 6, background: e.cor }} />
      </span>
    ) : (
      <span className="truncate text-sm font-semibold">{el.binding.valor || el.nome}</span>
    );
  return (
    <div className="border-b border-border px-4 py-3">
      <div
        className="flex h-16 items-center justify-center overflow-hidden rounded-lg"
        style={{
          background: e.fundo && e.fundo !== "transparent" ? e.fundo : "rgba(148,163,184,.12)",
          color: e.cor,
          borderRadius: Math.min(16, e.borderRadius),
          border: e.borderWidth > 0 ? `${e.borderWidth}px solid ${e.borderColor}` : "1px solid var(--border)",
        }}
      >
        {conteudo}
      </div>
      <p className="mt-1.5 text-center text-[11px] text-muted">{el.nome}</p>
    </div>
  );
}

const FONTES = [
  { label: "Segoe UI (padrão)", v: "" }, { label: "Arial", v: "Arial,sans-serif" }, { label: "Georgia", v: "Georgia,serif" },
  { label: "Tahoma", v: "Tahoma,sans-serif" }, { label: "Verdana", v: "Verdana,sans-serif" },
  { label: "Impact", v: "Impact,sans-serif" }, { label: "Mono", v: "monospace" },
];
const CARD_PRESETS = [
  { label: "Tile", w: 320, h: 180 }, { label: "Largo", w: 480, h: 200 },
  { label: "Quadrado", w: 280, h: 280 }, { label: "Banner", w: 640, h: 160 },
];
const DIR_COR: Record<Direcao, string> = { up: "#22C55E", down: "#EF4444", neutral: "#94A3B8" };
const ANIMS: { v: AnimacaoTipo; r: string }[] = [
  { v: "none", r: "Nenhuma" }, { v: "fade", r: "Fade" }, { v: "slide", r: "Slide" }, { v: "zoom", r: "Zoom" },
  { v: "float", r: "Flutuar" }, { v: "pulse", r: "Pulsar" }, { v: "shimmer", r: "Shimmer" },
  { v: "bounce", r: "Quicar" }, { v: "swing", r: "Balançar" }, { v: "blink", r: "Piscar" },
  { v: "rotateIn", r: "Girar" }, { v: "wipe", r: "Revelar" },
];

function Secao({ titulo, children, inicial = true }: { titulo: string; children: ReactNode; inicial?: boolean }) {
  const [aberta, setAberta] = useState(inicial);
  return (
    <div className="border-b border-border">
      <button onClick={() => setAberta((v) => !v)} className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted hover:text-foreground">
        {titulo}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${aberta ? "" : "-rotate-90"}`} />
      </button>
      {aberta && <div className="flex flex-col gap-2.5 px-4 pb-3">{children}</div>}
    </div>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 pt-1 text-sm text-foreground">{rotulo}</span>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">{children}</div>
    </div>
  );
}

/** Controle de largura total com rótulo em cima (para grupos de botões largos). */
function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted">{rotulo}</span>
      {children}
    </div>
  );
}

function Num({ valor, onChange, onStart, min = 0, max = 100, step = 1, suf = "" }: { valor: number; onChange: (v: number) => void; onStart?: () => void; min?: number; max?: number; step?: number; suf?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <input type="range" min={min} max={max} step={step} value={valor} onPointerDown={onStart} onChange={(e) => onChange(Number(e.target.value))} className="w-[72px] accent-viz" />
      <input
        type="number"
        step={step}
        value={valor}
        onFocus={onStart}
        onChange={(e) => { const v = e.target.value; if (v === "") return; const n = Number(v); if (!Number.isNaN(n)) onChange(n); }}
        className="w-11 rounded border border-border bg-surface px-1 py-0.5 text-right font-mono text-xs focus:border-viz focus:outline-none"
      />
      {suf && <span className="w-4 text-[10px] text-muted">{suf}</span>}
    </div>
  );
}

function NumBox({ rotulo, valor, onChange, onStart }: { rotulo: string; valor: number; onChange: (v: number) => void; onStart?: () => void }) {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className="text-[10px] uppercase text-muted">{rotulo}</span>
      <input type="number" value={Math.round(valor)} onFocus={onStart} onChange={(e) => onChange(Number(e.target.value))} className="w-full rounded-md border border-border bg-surface px-2 py-1 font-mono text-xs focus:border-viz focus:outline-none" />
    </label>
  );
}

function PropsCard() {
  const card = useEditor((s) => s.doc.card);
  const paleta = useEditor((s) => s.doc.paleta) ?? [];
  const atualizarCard = useEditor((s) => s.atualizarCard);
  const setPaleta = useEditor((s) => s.setPaleta);
  const aplicarPaletaCard = useEditor((s) => s.aplicarPaletaCard);
  const aplicarTema = useEditor((s) => s.aplicarTema);
  const tema = useEditor((s) => s.doc.tema);
  const setTema = useEditor((s) => s.setTema);
  const aplicarFonteATodos = useEditor((s) => s.aplicarFonteATodos);
  const esvaziarPagina = useEditor((s) => s.esvaziarPagina);

  const [gA, setGA] = useState("#0E7490");
  const [gB, setGB] = useState("#06B6D4");
  const [ang, setAng] = useState(150);
  const [gradCard, setGradCard] = useState(false);

  return (
    <>
      <Secao titulo="Tema (design system)">
        <p className="text-[11px] text-muted">Aplica paleta, fundo, tipografia e estilo de uma vez.</p>
        <div className="grid grid-cols-2 gap-2">
          {TEMAS.map((t) => {
            const Ic = TEMA_ICON[t.nome] ?? Moon;
            return (
              <button key={t.nome} onClick={() => aplicarTema(t)} className="group overflow-hidden rounded-xl border border-border text-left transition-colors hover:border-viz">
                <div className="flex h-12 items-center justify-center" style={{ background: t.cardFundo }}>
                  <Ic className="h-5 w-5" style={{ color: t.paleta[3] }} strokeWidth={2} />
                </div>
                <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                  <span className="truncate text-[11px] font-semibold" style={{ fontFamily: t.fonte || undefined }}>{t.nome}</span>
                  <span className="flex shrink-0 gap-0.5">
                    {t.paleta.slice(2, 5).map((c, i) => (<span key={i} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />))}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </Secao>

      <Secao titulo="Tipografia do tema">
        <Linha rotulo="Fonte">
          <select value={tema.fonte} onChange={(e) => setTema({ fonte: e.target.value })} className="rounded-md border border-border bg-surface px-2 py-1 text-xs focus:border-viz focus:outline-none">
            {FONTES.map((f) => (<option key={f.label} value={f.v} style={{ fontFamily: f.v || "inherit" }}>{f.label}</option>))}
          </select>
        </Linha>
        <button onClick={aplicarFonteATodos} className="rounded-md border border-border py-1.5 text-xs font-medium text-muted hover:text-foreground">Aplicar fonte aos textos</button>
        <Linha rotulo="Título"><Num valor={tema.tamTitulo} onChange={(v) => setTema({ tamTitulo: v })} min={12} max={72} suf="px" /></Linha>
        <Linha rotulo="Subtítulo"><Num valor={tema.tamSubtitulo} onChange={(v) => setTema({ tamSubtitulo: v })} min={10} max={48} suf="px" /></Linha>
        <Linha rotulo="Corpo"><Num valor={tema.tamCorpo} onChange={(v) => setTema({ tamCorpo: v })} min={8} max={32} suf="px" /></Linha>
        <p className="text-[11px] text-muted">Os componentes Título/Subtítulo/Texto usam estes tamanhos.</p>
      </Secao>

      <Secao titulo="Paleta">
        <p className="text-[11px] text-muted">Edite as cores do tema (clique para trocar).</p>
        <div className="flex flex-wrap gap-1.5">
          {paleta.map((c, i) => (
            <input
              key={i}
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(c) ? c : "#000000"}
              onChange={(e) => { const p = [...paleta]; p[i] = e.target.value; setPaleta(p); }}
              title={c}
              className="h-8 w-8 cursor-pointer rounded border border-border bg-surface"
            />
          ))}
        </div>
        <p className="text-[11px] font-medium text-muted">Sugestões</p>
        <div className="grid grid-cols-4 gap-1.5">
          {PALETAS.map((p) => (
            <button key={p.nome} onClick={() => setPaleta([...p.cores])} title={p.nome} className="flex h-7 overflow-hidden rounded-md border border-border hover:border-viz">
              {p.cores.slice(0, 4).map((c, i) => (<span key={i} className="flex-1" style={{ background: c }} />))}
            </button>
          ))}
        </div>
        <button onClick={aplicarPaletaCard} className="rounded-md bg-viz py-2 text-xs font-medium text-white hover:bg-viz-dark">
          Aplicar paleta ao fundo
        </button>
      </Secao>

      <Secao titulo="Tamanho do card">
        <div className="flex gap-2">
          <NumBox rotulo="Largura" valor={card.w} onChange={(w) => atualizarCard({ w })} />
          <NumBox rotulo="Altura" valor={card.h} onChange={(h) => atualizarCard({ h })} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CARD_PRESETS.map((p) => (<button key={p.label} onClick={() => atualizarCard({ w: p.w, h: p.h })} className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:border-viz hover:text-foreground">{p.label}</button>))}
        </div>
        <Linha rotulo="Cantos"><Num valor={card.borderRadius} onChange={(borderRadius) => atualizarCard({ borderRadius })} min={0} max={60} suf="px" /></Linha>
      </Secao>

      <Secao titulo="Fundo do card">
        <Linha rotulo="Cor"><ColorPicker compact valor={card.fundo} onChange={(fundo) => atualizarCard({ fundo })} /></Linha>
        <button onClick={() => setGradCard((v) => !v)} className="flex w-full items-center justify-between rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted hover:text-foreground">
          Gradiente
          <ChevronDown className={`h-3 w-3 transition-transform ${gradCard ? "" : "-rotate-90"}`} />
        </button>
        {gradCard && (
          <div className="rounded-md border border-border p-2">
            <div className="flex items-center justify-between gap-2">
              <ColorPicker compact valor={gA} onChange={setGA} />
              <ColorPicker compact valor={gB} onChange={setGB} />
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted">Ângulo</span>
              <Num valor={ang} onChange={setAng} min={0} max={360} suf="°" />
            </div>
            <button onClick={() => atualizarCard({ fundo: `linear-gradient(${ang}deg,${gA},${gB})` })} className="mt-1.5 w-full rounded-md border border-viz bg-viz/10 py-1 text-[11px] font-medium text-viz-dark hover:bg-viz/20">
              Aplicar gradiente
            </button>
          </div>
        )}
      </Secao>

      <Secao titulo="Borda e sombra" inicial={false}>
        <Linha rotulo="Cor da borda"><ColorPicker compact valor={card.borderColor ?? "#06B6D4"} onChange={(borderColor) => atualizarCard({ borderColor })} /></Linha>
        <Linha rotulo="Espessura"><Num valor={card.borderWidth ?? 0} onChange={(borderWidth) => atualizarCard({ borderWidth })} min={0} max={12} suf="px" /></Linha>
        <Linha rotulo="Sombra"><Num valor={card.sombra ?? 0} onChange={(sombra) => atualizarCard({ sombra })} min={0} max={60} suf="px" /></Linha>
      </Secao>

      <div className="px-4 py-3">
        <button onClick={() => { if (confirm("Remover todos os elementos desta página?")) esvaziarPagina(); }} className="w-full rounded-md border border-red-200 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
          Esvaziar página
        </button>
      </div>
      <p className="px-4 pb-3 text-xs text-muted">Ajustes do canvas/documento. Para editar um objeto, use a aba <b>Objeto</b>.</p>
    </>
  );
}

const PARTES: Partial<Record<ElementType, { k: string; label: string }[]>> = {
  gauge: [{ k: "arco", label: "Arco" }, { k: "valor", label: "Valor" }, { k: "trilho", label: "Trilho" }],
  donut: [{ k: "arco", label: "Anel" }, { k: "valor", label: "Valor" }, { k: "trilho", label: "Trilho" }],
  velocimetro: [{ k: "faixas", label: "Faixas" }, { k: "valor", label: "Valor" }, { k: "trilho", label: "Trilho" }],
  termometro: [{ k: "faixas", label: "Faixas" }, { k: "marcador", label: "Marcador" }, { k: "trilho", label: "Fundo" }],
  progresso: [{ k: "barra", label: "Barra" }, { k: "trilho", label: "Trilho" }],
  bullet: [{ k: "faixas", label: "Cores" }, { k: "escala", label: "Escala" }],
  cartao: [{ k: "fundo", label: "Fundo" }, { k: "icone", label: "Ícone" }, { k: "titulo", label: "Título" }, { k: "valor", label: "Valor" }],
  cardGauge: [{ k: "fundo", label: "Fundo" }, { k: "titulo", label: "Título" }, { k: "valor", label: "Valor" }, { k: "gauge", label: "Gauge" }],
};
const ESP_PADRAO: Partial<Record<string, number>> = { gauge: 3.5, donut: 4.5, velocimetro: 9 };

// Cor condicional: operadores e presets (pensados numa escala 0–100).
const OPS_COR: { v: OperadorCor; l: string }[] = [
  { v: "<=", l: "≤" }, { v: "<", l: "<" }, { v: ">=", l: "≥" }, { v: ">", l: ">" }, { v: "=", l: "=" }, { v: "entre", l: "entre" },
];
const VERDE = "#22C55E", AMBAR = "#F59E0B", VERMELHO = "#EF4444";
type RegraCor = { ate: number; ate2?: number; op?: OperadorCor; cor: string };
const SEMAFORO_PADRAO = (): RegraCor[] => [{ op: ">=", ate: 80, cor: VERDE }, { op: ">=", ate: 50, cor: AMBAR }, { ate: 0, cor: VERMELHO }];
const PRESETS_COR: { nome: string; regras: () => RegraCor[] }[] = [
  { nome: "Semáforo ≥80/≥50", regras: SEMAFORO_PADRAO },
  { nome: "Meta ≥100/≥80", regras: () => [{ op: ">=", ate: 100, cor: VERDE }, { op: ">=", ate: 80, cor: AMBAR }, { ate: 0, cor: VERMELHO }] },
  { nome: "Bom/Ruim ≥60", regras: () => [{ op: ">=", ate: 60, cor: VERDE }, { ate: 0, cor: VERMELHO }] },
];

type EstiloPatch = Partial<SceneElement["estilo"]>;
// Presets de estilo do Badge (consolidam Selo/Sucesso/Aviso num controle).
const BADGE_ESTILOS: { nome: string; estilo: EstiloPatch }[] = [
  { nome: "Neutro", estilo: { fundo: "rgba(148,163,184,.18)", cor: "#E2E8F0", borderRadius: 999, uppercase: true, fontWeight: 700, borderWidth: 0 } },
  { nome: "Sucesso", estilo: { fundo: "rgba(34,197,94,.18)", cor: "#22C55E", borderRadius: 999, uppercase: true, fontWeight: 700, borderWidth: 0 } },
  { nome: "Aviso", estilo: { fundo: "rgba(245,158,11,.18)", cor: "#F59E0B", borderRadius: 999, uppercase: true, fontWeight: 700, borderWidth: 0 } },
  { nome: "Perigo", estilo: { fundo: "rgba(239,68,68,.18)", cor: "#EF4444", borderRadius: 999, uppercase: true, fontWeight: 700, borderWidth: 0 } },
  { nome: "Info", estilo: { fundo: "rgba(6,182,212,.18)", cor: "#06B6D4", borderRadius: 999, uppercase: true, fontWeight: 700, borderWidth: 0 } },
  { nome: "Selo", estilo: { fundo: "rgba(252,211,77,.16)", cor: "#FCD34D", borderRadius: 999, borderColor: "#B45309", borderWidth: 1, uppercase: true, fontWeight: 800 } },
];
// Formatos da Forma (consolidam Círculo/Anel/Pílula/Status/Marcador num controle).
const FORMA_FORMATOS: { nome: string; estilo: EstiloPatch }[] = [
  { nome: "Retângulo", estilo: { borderRadius: 12, borderWidth: 0 } },
  { nome: "Arredondado", estilo: { borderRadius: 24, borderWidth: 0 } },
  { nome: "Círculo/Pílula", estilo: { borderRadius: 999, borderWidth: 0 } },
  { nome: "Anel", estilo: { fundo: "transparent", borderRadius: 999, borderWidth: 5, borderColor: "#0891B2" } },
  { nome: "Contorno", estilo: { fundo: "transparent", borderRadius: 12, borderWidth: 2, borderColor: "#0891B2" } },
  { nome: "Barra/Divisor", estilo: { borderRadius: 3, borderWidth: 0 } },
];

/** Editor por PARTES dos medidores: chips (Arco/Valor/Trilho…) + controles da parte ativa. */
function PropsMedidor({ el }: { el: SceneElement }) {
  const commit = useEditor((s) => s.commit);
  const patchEstilo = useEditor((s) => s.patchEstilo);
  const patchElemento = useEditor((s) => s.patchElemento);
  const parteStore = useEditor((s) => s.parteSel);
  const setParte = useEditor((s) => s.setParte);
  const partes = PARTES[el.type] ?? [];
  const ativa = partes.some((p) => p.k === parteStore) ? parteStore : partes[0]?.k;
  const ref = useRef<HTMLDivElement>(null);
  const [flash, setFlash] = useState(false);
  // ao trocar de elemento, garante que a parte ativa é válida (sincroniza o foco no canvas)
  useEffect(() => {
    if (!partes.some((p) => p.k === parteStore)) setParte(partes[0]?.k ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el.id]);
  // ao mudar a parte, rola até esta seção e dá um flash de destaque
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 900);
    return () => clearTimeout(t);
  }, [parteStore, el.id]);
  const cEstilo = (p: Parameters<typeof patchEstilo>[1]) => { commit(); patchEstilo(el.id, p); };
  const setFaixas = (fs: { ate: number; cor: string }[]) => { commit(); patchElemento(el.id, { faixas: fs }); };

  return (
    <div ref={ref} className={`rounded-xl transition-shadow ${flash ? "ring-2 ring-red-400" : ""}`}>
    <Secao titulo={`Aparência — ${partes.find((p) => p.k === ativa)?.label ?? ""}`}>
      <p className="text-[11px] text-muted">Clique numa parte do componente no canvas (fica com borda vermelha), ou escolha aqui:</p>
      <div className="flex flex-wrap gap-1">
        {partes.map((p) => (
          <button key={p.k} onClick={() => setParte(p.k)} className={`rounded-md border px-2.5 py-1 text-xs font-medium ${ativa === p.k ? "border-viz bg-viz/10 text-viz-dark" : "border-border text-muted hover:border-viz/50"}`}>{p.label}</button>
        ))}
      </div>

      {(ativa === "arco" || ativa === "barra" || ativa === "marcador") && (
        <>
          <Linha rotulo="Cor"><ColorPicker compact valor={el.estilo.cor} onStart={commit} onChange={(cor) => patchEstilo(el.id, { cor })} /></Linha>
          {(ativa === "arco") && <Linha rotulo="Espessura"><Num valor={el.estilo.espessura ?? (ESP_PADRAO[el.type] ?? 4)} onStart={commit} onChange={(espessura) => patchEstilo(el.id, { espessura })} min={1} max={16} step={0.5} suf="px" /></Linha>}
          {(ativa === "barra") && <Linha rotulo="Cantos"><Num valor={el.estilo.borderRadius} onStart={commit} onChange={(borderRadius) => patchEstilo(el.id, { borderRadius })} min={0} max={40} suf="px" /></Linha>}
          {(ativa === "arco" || ativa === "barra") && <Linha rotulo="Animar entrada"><input type="checkbox" checked={el.estilo.animarFill} onChange={(ev) => cEstilo({ animarFill: ev.target.checked })} className="h-4 w-4 accent-viz" /></Linha>}
        </>
      )}

      {ativa === "valor" && (
        <>
          <Linha rotulo="Tamanho"><Num valor={el.estilo.fontSize} onStart={commit} onChange={(fontSize) => patchEstilo(el.id, { fontSize })} min={8} max={72} suf="px" /></Linha>
          <Linha rotulo="Cor"><ColorPicker compact valor={el.type === "cartao" ? el.estilo.cor : el.estilo.corValor || el.estilo.cor} onStart={commit} onChange={(c) => patchEstilo(el.id, el.type === "cartao" ? { cor: c } : { corValor: c })} /></Linha>
        </>
      )}

      {ativa === "trilho" && (
        <Linha rotulo="Cor"><ColorPicker compact valor={el.estilo.fundo} onStart={commit} onChange={(fundo) => patchEstilo(el.id, { fundo })} /></Linha>
      )}

      {ativa === "fundo" && (
        <>
          <Linha rotulo="Cor"><ColorPicker compact valor={el.estilo.fundo} onStart={commit} onChange={(fundo) => patchEstilo(el.id, { fundo })} /></Linha>
          <Linha rotulo="Cantos"><Num valor={el.estilo.borderRadius} onStart={commit} onChange={(borderRadius) => patchEstilo(el.id, { borderRadius })} min={0} max={40} suf="px" /></Linha>
          <Linha rotulo="Borda"><Num valor={el.estilo.borderWidth} onStart={commit} onChange={(borderWidth) => patchEstilo(el.id, { borderWidth })} min={0} max={8} suf="px" /></Linha>
          {el.estilo.borderWidth > 0 && <Linha rotulo="Cor da borda"><ColorPicker compact valor={el.estilo.borderColor} onStart={commit} onChange={(borderColor) => patchEstilo(el.id, { borderColor })} /></Linha>}
        </>
      )}

      {ativa === "icone" && (
        <>
          <Linha rotulo="Cor"><ColorPicker compact valor={el.estilo.corIcone || el.estilo.cor} onStart={commit} onChange={(corIcone) => patchEstilo(el.id, { corIcone })} /></Linha>
          <IconePicker valorAtual={el.iconeNome} cor="#0E7490" stroke={2} onPick={(nome, inner) => { commit(); patchElemento(el.id, { iconeNome: nome, iconeNomePaths: inner }); }} />
        </>
      )}

      {ativa === "titulo" && (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Texto</span>
            <input value={el.titulo ?? ""} onFocus={commit} onChange={(ev) => patchElemento(el.id, { titulo: ev.target.value })} className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm focus:border-viz focus:outline-none" />
          </label>
          <Linha rotulo="Cor"><ColorPicker compact valor={el.estilo.corTitulo || "#94A3B8"} onStart={commit} onChange={(corTitulo) => patchEstilo(el.id, { corTitulo })} /></Linha>
        </>
      )}

      {ativa === "gauge" && (
        <>
          <Linha rotulo="Cor"><ColorPicker compact valor={el.estilo.corIcone || "#06B6D4"} onStart={commit} onChange={(corIcone) => patchEstilo(el.id, { corIcone })} /></Linha>
          <Linha rotulo="Espessura"><Num valor={el.estilo.espessura ?? 4} onStart={commit} onChange={(espessura) => patchEstilo(el.id, { espessura })} min={1} max={12} step={0.5} suf="px" /></Linha>
        </>
      )}

      {ativa === "escala" && (
        <Linha rotulo="Máximo"><Num valor={el.maximo ?? 100} onStart={commit} onChange={(m) => patchElemento(el.id, { maximo: Math.max(1, Math.round(m)) })} min={1} max={10000} step={10} /></Linha>
      )}

      {ativa === "faixas" && (
        <>
          {el.type === "bullet" ? (
            <Linha rotulo="Cor base"><ColorPicker compact valor={el.estilo.cor} onStart={commit} onChange={(cor) => patchEstilo(el.id, { cor })} /></Linha>
          ) : (
            <>
              {(el.faixas ?? []).map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-8 shrink-0 text-[11px] text-muted">até</span>
                  <input type="number" value={f.ate} onFocus={commit} onChange={(ev) => { const fs = [...(el.faixas ?? [])]; fs[i] = { ...fs[i], ate: Number(ev.target.value) || 0 }; patchElemento(el.id, { faixas: fs }); }} className="w-16 rounded-md border border-border bg-surface px-1.5 py-1 font-mono text-xs focus:border-viz focus:outline-none" />
                  <div className="flex-1"><ColorPicker compact valor={f.cor} onStart={commit} onChange={(cor) => { const fs = [...(el.faixas ?? [])]; fs[i] = { ...fs[i], cor }; patchElemento(el.id, { faixas: fs }); }} /></div>
                  <button disabled={(el.faixas ?? []).length <= 1} onClick={() => setFaixas((el.faixas ?? []).filter((_, j) => j !== i))} className="text-muted hover:text-red-600 disabled:opacity-30">×</button>
                </div>
              ))}
              <button onClick={() => setFaixas([...(el.faixas ?? []), { ate: el.maximo ?? 100, cor: "#EF4444" }])} className="rounded-md border border-border py-1.5 text-xs font-medium text-muted hover:text-foreground">+ Faixa</button>
              {el.type === "velocimetro" && <Linha rotulo="Espessura"><Num valor={el.estilo.espessura ?? 9} onStart={commit} onChange={(espessura) => patchEstilo(el.id, { espessura })} min={2} max={20} suf="px" /></Linha>}
            </>
          )}
          {(el.type === "velocimetro" || el.type === "termometro" || el.type === "bullet") && <Linha rotulo="Máximo"><Num valor={el.maximo ?? 100} onStart={commit} onChange={(m) => patchElemento(el.id, { maximo: Math.max(1, Math.round(m)) })} min={1} max={10000} step={10} /></Linha>}
        </>
      )}
      <Linha rotulo="Opacidade"><Num valor={el.estilo.opacidade} onStart={commit} onChange={(opacidade) => patchEstilo(el.id, { opacidade })} min={0} max={1} step={0.05} /></Linha>
    </Secao>
    </div>
  );
}

function PropsElemento({ el }: { el: SceneElement }) {
  const card = useEditor((s) => s.doc.card);
  const commit = useEditor((s) => s.commit);
  const patchElemento = useEditor((s) => s.patchElemento);
  const patchEstilo = useEditor((s) => s.patchEstilo);
  const patchBinding = useEditor((s) => s.patchBinding);
  const patchAnimacao = useEditor((s) => s.patchAnimacao);
  const remover = useEditor((s) => s.removerSelecionado);
  const duplicar = useEditor((s) => s.duplicarSelecionado);
  const alinhar = useEditor((s) => s.alinhar);
  const zOrder = useEditor((s) => s.zOrder);
  const copiarEstilo = useEditor((s) => s.copiarEstilo);
  const colarEstilo = useEditor((s) => s.colarEstilo);
  const temEstiloCopiado = useEditor((s) => !!s.estiloCopiado);
  const salvarFavorito = useEditor((s) => s.salvarFavorito);

  const cEstilo = (p: Parameters<typeof patchEstilo>[1]) => { commit(); patchEstilo(el.id, p); };
  const [gA, setGA] = useState("#0891B2");
  const [gB, setGB] = useState("#06B6D4");
  const [gAng, setGAng] = useState(135);
  const [gradAberto, setGradAberto] = useState(false);

  const ehForma = el.type === "forma" || el.type === "linha";
  const ehFormaPura = el.type === "forma";
  const ehBadge = el.type === "badge";
  const ehProgresso = el.type === "progresso";
  const ehGauge = el.type === "gauge";
  const ehImagem = el.type === "imagem";
  const ehIcone = el.type === "icone";
  const ehTendencia = el.type === "tendencia";
  const ehBotao = el.type === "botao";
  const ehPictograma = el.type === "pictograma";
  const ehTabela = el.type === "tabela";
  const ehRating = el.type === "rating";
  const ehSparkline = el.type === "sparkline";
  const ehLista = el.type === "lista";
  const ehDivisor = el.type === "divisorRotulo";
  const ehDonut = el.type === "donut";
  const ehVelocimetro = el.type === "velocimetro";
  const ehBullet = el.type === "bullet";
  const ehTermometro = el.type === "termometro";
  const ehNarrativo = el.type === "narrativo";
  const ehComparativo = el.type === "comparativo";
  const ehChip = el.type === "chip";
  const ehFiltros = el.type === "filtros";
  const ehFunil = el.type === "funil";
  const ehWaffle = el.type === "waffle";
  const ehTimeline = el.type === "timeline";
  const ehKpiCompleto = el.type === "kpiCompleto";
  const ehAreaMini = el.type === "areaMini";
  const ehAnelKpi = el.type === "anelKpi";
  const ehComparaAB = el.type === "comparaAB";
  const ehAnimavelEntrada = ehWaffle || ehFunil || ehTimeline || ehAreaMini || ehKpiCompleto || ehSparkline || ehRating || ehPictograma;
  const ehMedidor = ehProgresso || ehGauge || ehDonut;
  const temMaximo = ehVelocimetro || ehBullet || ehTermometro;
  const ehMedidorFamilia = !!PARTES[el.type]; // gauge/donut/velocimetro/termometro/progresso/bullet
  const temTexto = el.type === "texto" || el.type === "kpi" || el.type === "badge" || ehTendencia || ehBotao || ehLista || ehDivisor || ehNarrativo || ehComparativo || ehChip || ehFiltros || ehFunil || ehTimeline || ehKpiCompleto || ehAnelKpi || ehComparaAB;
  const temCor = temTexto || ehMedidor || ehIcone || ehPictograma || ehTabela || ehRating || ehSparkline || temMaximo || ehMedidorFamilia || ehWaffle || ehAreaMini;
  const semBind = ehForma || ehIcone || ehTabela || ehSparkline || ehLista || ehNarrativo || ehFiltros || ehFunil || ehTimeline || ehAreaMini;

  function setDirecao(d: Direcao) { commit(); patchElemento(el.id, { direcao: d }); patchEstilo(el.id, { cor: DIR_COR[d] }); }

  const acaoBtn = "flex flex-1 items-center justify-center rounded-md border border-border py-1.5 text-muted hover:text-foreground";

  function salvarFav() {
    const nome = window.prompt("Nome do componente favorito:", el.nome);
    if (nome) salvarFavorito(nome, el);
  }

  return (
    <>
      <MiniPreview el={el} />

      <div className="flex gap-1 border-b border-border px-3 py-2">
        <button onClick={() => zOrder(el.id, "frente")} title="Trazer para frente" className={acaoBtn}><BringToFront className="h-4 w-4" /></button>
        <button onClick={() => zOrder(el.id, "tras")} title="Enviar para trás" className={acaoBtn}><SendToBack className="h-4 w-4" /></button>
        <button onClick={() => copiarEstilo(el.id)} title="Copiar estilo" className={acaoBtn}><Copy className="h-4 w-4" /></button>
        <button onClick={() => colarEstilo(el.id)} disabled={!temEstiloCopiado} title="Colar estilo" className={`${acaoBtn} ${temEstiloCopiado ? "" : "opacity-40"}`}><ClipboardPaste className="h-4 w-4" /></button>
        <button onClick={() => { commit(); patchEstilo(el.id, criarElemento(el.type).estilo); }} title="Restaurar estilo padrão" className={acaoBtn}><RotateCcw className="h-4 w-4" /></button>
        <button onClick={salvarFav} title="Salvar como favorito" className={acaoBtn}><Star className="h-4 w-4" /></button>
      </div>

      <Secao titulo="Estilo rápido" inicial={false}>
        <div className="grid grid-cols-3 gap-1.5">
          {QUICK_STYLES.map((q) => (
            <button key={q.nome} onClick={() => { commit(); patchEstilo(el.id, q.estilo); }} className="flex flex-col items-center gap-1 rounded-md border border-border p-1.5 hover:border-viz">
              <span className="h-5 w-full rounded" style={{ background: q.amostra, border: "1px solid var(--border)" }} />
              <span className="text-[10px] text-muted">{q.nome}</span>
            </button>
          ))}
        </div>
      </Secao>

      <Secao titulo="Camada" inicial={false}>
        <Linha rotulo="Nome">
          <input value={el.nome} onChange={(e) => patchElemento(el.id, { nome: e.target.value })} onFocus={commit} className="w-40 rounded-md border border-border bg-surface px-2 py-1 text-sm focus:border-viz focus:outline-none" />
        </Linha>
      </Secao>

      <Secao titulo="Posição e tamanho">
        <div className="flex gap-2">
          <NumBox rotulo="X" valor={el.x} onStart={commit} onChange={(x) => patchElemento(el.id, { x })} />
          <NumBox rotulo="Y" valor={el.y} onStart={commit} onChange={(y) => patchElemento(el.id, { y })} />
        </div>
        <div className="flex gap-2">
          <NumBox rotulo="Larg." valor={el.w} onStart={commit} onChange={(w) => patchElemento(el.id, { w })} />
          <NumBox rotulo="Alt." valor={el.h} onStart={commit} onChange={(h) => patchElemento(el.id, { h })} />
        </div>
        <div className="flex justify-between gap-0.5 rounded-md bg-background p-0.5">
          {([["esq", AlignLeft], ["centroH", AlignCenter], ["dir", AlignRight], ["topo", AlignStartHorizontal], ["centroV", AlignCenterHorizontal], ["base", AlignEndHorizontal]] as const).map(([m, Ic]) => (
            <button key={m} onClick={() => alinhar(el.id, m)} title="Alinhar" className="flex-1 rounded p-1 text-muted hover:bg-surface hover:text-foreground"><Ic className="mx-auto h-3.5 w-3.5" /></button>
          ))}
        </div>
        <Linha rotulo="Rotação"><Num valor={el.estilo.rotation} onStart={commit} onChange={(rotation) => patchEstilo(el.id, { rotation })} min={-180} max={180} suf="°" /></Linha>
      </Secao>

      {ehBadge && (
        <Secao titulo="Estilo do badge">
          <div className="grid grid-cols-3 gap-1.5">
            {BADGE_ESTILOS.map((p) => (
              <button key={p.nome} onClick={() => { commit(); patchEstilo(el.id, p.estilo); }} className="flex items-center justify-center rounded-full border border-border px-2 py-1 text-[11px] font-medium hover:border-viz" style={{ background: p.estilo.fundo, color: p.estilo.cor }}>{p.nome}</button>
            ))}
          </div>
          <p className="text-[11px] text-muted">Presets rápidos — dá pra ajustar cor/texto depois.</p>
        </Secao>
      )}

      {ehFormaPura && (
        <Secao titulo="Formato">
          <div className="grid grid-cols-2 gap-1.5">
            {FORMA_FORMATOS.map((p) => (
              <button key={p.nome} onClick={() => { commit(); patchEstilo(el.id, p.estilo); }} className="rounded-md border border-border px-2 py-1.5 text-[11px] font-medium text-muted hover:border-viz hover:text-foreground">{p.nome}</button>
            ))}
          </div>
          <p className="text-[11px] text-muted">Para Círculo/Ponto, deixe largura e altura iguais.</p>
        </Secao>
      )}

      {ehIcone && (
        <Secao titulo="Ícone">
          <IconePicker
            valorAtual={el.binding.valor}
            cor="#0E7490"
            stroke={el.estilo.iconeStroke ?? 2}
            onPick={(nome, inner) => { commit(); patchElemento(el.id, { iconePaths: inner }); patchBinding(el.id, { valor: nome }); }}
          />
          <Campo rotulo="Forma">
            <div className="flex gap-0.5 rounded-md bg-background p-0.5">
              {([["Nenhum", 0, Ban, true], ["Círculo", 999, Circle, false], ["Arredondado", 14, Squircle, false], ["Quadrado", 4, SquareIc, false]] as const).map(([lbl, r, Ic, semFundo]) => (
                <button key={lbl} title={lbl} onClick={() => { commit(); patchEstilo(el.id, semFundo ? { borderRadius: r, fundo: "transparent" } : { borderRadius: r }); }} className={`flex flex-1 items-center justify-center rounded py-1.5 ${el.estilo.borderRadius === r ? "bg-surface text-viz-dark shadow-sm" : "text-muted hover:text-foreground"}`}><Ic className="h-4 w-4" /></button>
              ))}
            </div>
          </Campo>
          <Campo rotulo="Peso do traço">
            <div className="flex gap-0.5 rounded-md bg-background p-0.5">
              {([["Fino", 1], ["Médio", 1.5], ["Normal", 2], ["Forte", 2.75]] as const).map(([lbl, w]) => (
                <button key={lbl} onClick={() => cEstilo({ iconeStroke: w })} className={`flex-1 rounded py-1 text-[11px] ${(el.estilo.iconeStroke ?? 2) === w ? "bg-surface shadow-sm" : "text-muted hover:text-foreground"}`}>{lbl}</button>
              ))}
            </div>
          </Campo>
        </Secao>
      )}

      {!semBind && (
        <Secao titulo={ehMedidor || ehPictograma || ehWaffle ? "Valor (%)" : ehRating ? "Nota" : temMaximo ? "Valor" : ehImagem ? "Imagem (URL)" : ehBotao ? "Texto do botão" : ehTendencia ? "Variação" : ehDivisor ? "Rótulo" : "Conteúdo"}>
          {ehTendencia && (
            <div className="flex gap-1">
              {([["up", ArrowUp, "Melhor"], ["down", ArrowDown, "Pior"], ["neutral", Minus, "Neutro"]] as const).map(([d, Ic, lbl]) => (
                <button key={d} onClick={() => setDirecao(d)} className={`flex flex-1 items-center justify-center gap-1 rounded-md border py-1.5 text-xs ${(el.direcao ?? "up") === d ? "border-viz bg-viz/10 text-viz-dark" : "border-border text-muted"}`}><Ic className="h-3.5 w-3.5" /> {lbl}</button>
              ))}
            </div>
          )}
          <div className="flex gap-0.5 rounded-md bg-background p-0.5">
            <button onClick={() => patchBinding(el.id, { dinamico: false })} className={`flex-1 rounded px-2 py-1 text-xs font-medium ${!el.binding.dinamico ? "bg-surface shadow-sm" : "text-muted"}`}>Fixo</button>
            <button onClick={() => patchBinding(el.id, { dinamico: true })} className={`flex-1 rounded px-2 py-1 text-xs font-medium ${el.binding.dinamico ? "bg-viz text-white" : "text-muted"}`}>Dinâmico</button>
          </div>
          {el.binding.dinamico ? (
            <input value={el.binding.ref} onFocus={commit} onChange={(e) => patchBinding(el.id, { ref: e.target.value })} placeholder={ehMedidor || ehPictograma ? "[Atingimento %]" : ehImagem ? "[URL_Imagem]" : "[Minha Medida]"} className="rounded-md border border-border bg-surface px-2 py-1.5 font-mono text-xs focus:border-viz focus:outline-none" />
          ) : (
            <input value={el.binding.valor} onFocus={commit} onChange={(e) => patchBinding(el.id, { valor: e.target.value })} className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm focus:border-viz focus:outline-none" />
          )}
          {el.binding.dinamico && TIPOS_FORMATAVEIS.has(el.type) && (
            <FormatoSel binding={el.binding} commit={commit} onChange={(p) => patchBinding(el.id, p)} />
          )}
          {(ehMedidor || ehPictograma || ehWaffle) && <p className="text-[11px] text-muted">Número de 0 a 100.</p>}
          {ehRating && (
            <>
              <Linha rotulo="Nº de estrelas"><Num valor={el.quantidade ?? 5} onStart={commit} onChange={(q) => patchElemento(el.id, { quantidade: Math.round(q) })} min={1} max={10} /></Linha>
              <p className="text-[11px] text-muted">A nota vai de 0 até o nº de estrelas (ex.: 4,2 de 5).</p>
            </>
          )}
          {temMaximo && !ehMedidorFamilia && (
            <>
              <Linha rotulo="Máximo da escala"><Num valor={el.maximo ?? 100} onStart={commit} onChange={(m) => patchElemento(el.id, { maximo: Math.max(1, Math.round(m)) })} min={1} max={10000} step={10} /></Linha>
              <p className="text-[11px] text-muted">O valor vai de 0 até o máximo.</p>
            </>
          )}
          {(ehMedidor || ehVelocimetro || ehTermometro) && !ehMedidorFamilia && (
            <Linha rotulo="Animar entrada"><input type="checkbox" checked={el.estilo.animarFill} onChange={(e) => cEstilo({ animarFill: e.target.checked })} className="h-4 w-4 accent-viz" /></Linha>
          )}
          {ehBotao && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">URL ao clicar</span>
              <input value={el.href ?? ""} onFocus={commit} onChange={(e) => patchElemento(el.id, { href: e.target.value })} placeholder="https://..." className="rounded-md border border-border bg-surface px-2 py-1.5 font-mono text-xs focus:border-viz focus:outline-none" />
            </label>
          )}
          {ehPictograma && (
            <Linha rotulo="Qtd. de ícones"><Num valor={el.quantidade ?? 10} onStart={commit} onChange={(q) => patchElemento(el.id, { quantidade: Math.round(q) })} min={1} max={20} /></Linha>
          )}
          {ehImagem && (
            <Linha rotulo="Ajuste">
              <div className="flex gap-0.5 rounded-md bg-background p-0.5">
                <button onClick={() => { commit(); patchElemento(el.id, { contain: true }); }} className={`rounded px-2 py-1 text-xs ${el.contain ? "bg-surface shadow-sm" : "text-muted"}`}>Conter</button>
                <button onClick={() => { commit(); patchElemento(el.id, { contain: false }); }} className={`rounded px-2 py-1 text-xs ${!el.contain ? "bg-surface shadow-sm" : "text-muted"}`}>Preencher</button>
              </div>
            </Linha>
          )}
        </Secao>
      )}

      {ehPictograma && (
        <Secao titulo="Ícone do pictograma">
          <IconePicker valorAtual={el.iconeNome} cor="#0E7490" stroke={2} onPick={(nome, inner) => { commit(); patchElemento(el.id, { iconeNome: nome, iconeNomePaths: inner }); }} />
        </Secao>
      )}

      {ehTabela && (
        <Secao titulo="Tabela">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Tabela do Power BI</span>
            <input value={el.tabela ?? ""} onFocus={commit} onChange={(e) => patchElemento(el.id, { tabela: e.target.value })} placeholder="Vendas" className="rounded-md border border-border bg-surface px-2 py-1.5 font-mono text-xs focus:border-viz focus:outline-none" />
          </label>
          <Linha rotulo="Tamanho da fonte"><Num valor={el.estilo.fontSize} onStart={commit} onChange={(fontSize) => patchEstilo(el.id, { fontSize })} min={8} max={28} suf="px" /></Linha>
          <p className="text-xs font-medium text-muted">Colunas</p>
          {(el.colunas ?? []).map((c, i) => (
            <div key={i} className="flex items-center gap-1">
              <input value={c.coluna} onFocus={commit} onChange={(e) => { const cols = [...(el.colunas ?? [])]; cols[i] = { ...cols[i], coluna: e.target.value }; patchElemento(el.id, { colunas: cols }); }} placeholder="Vendas[Coluna]" className="w-1/2 rounded-md border border-border bg-surface px-2 py-1 font-mono text-[11px] focus:border-viz focus:outline-none" />
              <input value={c.rotulo} onFocus={commit} onChange={(e) => { const cols = [...(el.colunas ?? [])]; cols[i] = { ...cols[i], rotulo: e.target.value }; patchElemento(el.id, { colunas: cols }); }} placeholder="Rótulo" className="w-1/2 rounded-md border border-border bg-surface px-2 py-1 text-[11px] focus:border-viz focus:outline-none" />
              <button disabled={(el.colunas ?? []).length <= 1} onClick={() => { commit(); patchElemento(el.id, { colunas: (el.colunas ?? []).filter((_, j) => j !== i) }); }} title={(el.colunas ?? []).length <= 1 ? "A tabela precisa de ao menos 1 coluna" : "Remover coluna"} className="text-muted hover:text-red-600 disabled:opacity-30">×</button>
            </div>
          ))}
          <button onClick={() => { commit(); patchElemento(el.id, { colunas: [...(el.colunas ?? []), { coluna: (el.tabela ?? "Tabela") + "[Coluna]", rotulo: "Coluna" }] }); }} className="rounded-md border border-border py-1.5 text-xs font-medium text-muted hover:text-foreground">+ Coluna</button>
          <p className="text-[11px] text-muted">A DAX gera as linhas via CONCATENATEX sobre essa tabela.</p>
        </Secao>
      )}

      {ehSparkline && (
        <Secao titulo="Mini-gráfico">
          <div className="flex gap-0.5 rounded-md bg-background p-0.5">
            <button onClick={() => patchBinding(el.id, { dinamico: false })} className={`flex-1 rounded px-2 py-1 text-xs font-medium ${!el.binding.dinamico ? "bg-surface shadow-sm" : "text-muted"}`}>Valores fixos</button>
            <button onClick={() => patchBinding(el.id, { dinamico: true })} className={`flex-1 rounded px-2 py-1 text-xs font-medium ${el.binding.dinamico ? "bg-viz text-white" : "text-muted"}`}>Da tabela</button>
          </div>
          {el.binding.dinamico ? (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted">Tabela do Power BI</span>
                <input value={el.tabela ?? ""} onFocus={commit} onChange={(e) => patchElemento(el.id, { tabela: e.target.value })} placeholder="Vendas" className="rounded-md border border-border bg-surface px-2 py-1.5 font-mono text-xs focus:border-viz focus:outline-none" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted">Coluna de valor</span>
                <input value={el.binding.ref} onFocus={commit} onChange={(e) => patchBinding(el.id, { ref: e.target.value })} placeholder="Vendas[Valor]" className="rounded-md border border-border bg-surface px-2 py-1.5 font-mono text-xs focus:border-viz focus:outline-none" />
              </label>
              <p className="text-[11px] text-muted">Uma barra por linha (altura = valor ÷ maior valor), gerada por CONCATENATEX — o mesmo conceito da tabela.</p>
            </>
          ) : (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted">Valores (0–100, separados por vírgula)</span>
                <input
                  value={(el.barras ?? []).join(", ")}
                  onFocus={commit}
                  onChange={(e) => patchElemento(el.id, { barras: e.target.value.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 24).map((s) => Math.max(0, Math.min(100, Number(s) || 0))) })}
                  placeholder="40, 65, 30, 80, 55, 70"
                  className="rounded-md border border-border bg-surface px-2 py-1.5 font-mono text-xs focus:border-viz focus:outline-none"
                />
              </label>
              <p className="text-[11px] text-muted">Alturas fixas (decorativo).</p>
            </>
          )}
        </Secao>
      )}

      {ehLista && (
        <Secao titulo="Itens da lista">
          {(el.itens ?? []).map((t, i) => (
            <div key={i} className="flex items-center gap-1">
              <input value={t} onFocus={commit} onChange={(e) => { const arr = [...(el.itens ?? [])]; arr[i] = e.target.value; patchElemento(el.id, { itens: arr }); }} className="flex-1 rounded-md border border-border bg-surface px-2 py-1 text-[13px] focus:border-viz focus:outline-none" />
              <button disabled={(el.itens ?? []).length <= 1} onClick={() => { commit(); patchElemento(el.id, { itens: (el.itens ?? []).filter((_, j) => j !== i) }); }} title="Remover item" className="text-muted hover:text-red-600 disabled:opacity-30">×</button>
            </div>
          ))}
          <button onClick={() => { commit(); patchElemento(el.id, { itens: [...(el.itens ?? []), "Novo item"] }); }} className="rounded-md border border-border py-1.5 text-xs font-medium text-muted hover:text-foreground">+ Item</button>
          <p className="mt-1 text-xs font-medium text-muted">Ícone dos itens</p>
          <IconePicker valorAtual={el.iconeNome} cor="#0E7490" stroke={2} onPick={(nome, inner) => { commit(); patchElemento(el.id, { iconeNome: nome, iconeNomePaths: inner }); }} />
        </Secao>
      )}

      {(ehVelocimetro || ehTermometro) && !ehMedidorFamilia && (
        <Secao titulo="Faixas de cor">
          <p className="text-[11px] text-muted">Cada faixa preenche até o valor indicado (verde/amarelo/vermelho).</p>
          {(el.faixas ?? []).map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[11px] text-muted">até</span>
              <input type="number" value={f.ate} onFocus={commit} onChange={(ev) => { const fs = [...(el.faixas ?? [])]; fs[i] = { ...fs[i], ate: Number(ev.target.value) || 0 }; patchElemento(el.id, { faixas: fs }); }} className="w-16 rounded-md border border-border bg-surface px-1.5 py-1 font-mono text-xs focus:border-viz focus:outline-none" />
              <div className="flex-1"><ColorPicker compact valor={f.cor} onStart={commit} onChange={(cor) => { const fs = [...(el.faixas ?? [])]; fs[i] = { ...fs[i], cor }; patchElemento(el.id, { faixas: fs }); }} /></div>
              <button disabled={(el.faixas ?? []).length <= 1} onClick={() => { commit(); patchElemento(el.id, { faixas: (el.faixas ?? []).filter((_, j) => j !== i) }); }} title="Remover faixa" className="text-muted hover:text-red-600 disabled:opacity-30">×</button>
            </div>
          ))}
          <button onClick={() => { commit(); patchElemento(el.id, { faixas: [...(el.faixas ?? []), { ate: el.maximo ?? 100, cor: "#EF4444" }] }); }} className="rounded-md border border-border py-1.5 text-xs font-medium text-muted hover:text-foreground">+ Faixa</button>
        </Secao>
      )}

      {ehNarrativo && (
        <Secao titulo="Texto narrativo">
          <textarea
            value={el.binding.valor}
            onFocus={commit}
            onChange={(ev) => patchBinding(el.id, { valor: ev.target.value })}
            rows={3}
            className="w-full resize-y rounded-md border border-border bg-surface px-2 py-1.5 text-sm leading-relaxed focus:border-viz focus:outline-none"
          />
          <p className="text-[11px] text-muted">Escreva o texto e insira as medidas entre chaves. Disponíveis: {(el.medidas ?? []).map((m) => `{${m.chave}}`).join("  ") || "(nenhuma)"}</p>
        </Secao>
      )}

      {(ehNarrativo || ehComparativo) && (
        <Secao titulo={ehComparativo ? "Meta e atingimento" : "Medidas embutidas"}>
          <MedidasEditor el={el} bloqueado={ehComparativo} comCor={ehNarrativo} />
        </Secao>
      )}

      {ehComparativo && (
        <Secao titulo="Título e cores">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Título</span>
            <input value={el.titulo ?? ""} onFocus={commit} onChange={(ev) => patchElemento(el.id, { titulo: ev.target.value })} className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm focus:border-viz focus:outline-none" />
          </label>
          <Linha rotulo="Cor do título"><ColorPicker compact valor={el.estilo.corTitulo ?? "#94A3B8"} onStart={commit} onChange={(corTitulo) => patchEstilo(el.id, { corTitulo })} /></Linha>
          <Linha rotulo="Cor do valor"><ColorPicker compact valor={el.estilo.corValor ?? el.estilo.cor} onStart={commit} onChange={(corValor) => patchEstilo(el.id, { corValor })} /></Linha>
          <Linha rotulo="Cor da barra"><ColorPicker compact valor={el.estilo.corIcone ?? "#06B6D4"} onStart={commit} onChange={(corIcone) => patchEstilo(el.id, { corIcone })} /></Linha>
          <p className="text-[11px] text-muted">A barra usa o Atingimento % (0–100). O valor e a meta são as medidas acima.</p>
        </Secao>
      )}

      {ehChip && (
        <Secao titulo="Chip">
          <IconePicker valorAtual={el.iconeNome} cor="#0E7490" stroke={2} onPick={(nome, inner) => { commit(); patchElemento(el.id, { iconeNome: nome, iconeNomePaths: inner }); }} />
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Rótulo</span>
            <input value={el.titulo ?? ""} onFocus={commit} onChange={(ev) => patchElemento(el.id, { titulo: ev.target.value })} placeholder="ex.: vendas" className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm focus:border-viz focus:outline-none" />
          </label>
          <Linha rotulo="Cor do ícone"><ColorPicker compact valor={el.estilo.corIcone ?? "#06B6D4"} onStart={commit} onChange={(corIcone) => patchEstilo(el.id, { corIcone })} /></Linha>
          <Linha rotulo="Cor do rótulo"><ColorPicker compact valor={el.estilo.corTitulo ?? "#94A3B8"} onStart={commit} onChange={(corTitulo) => patchEstilo(el.id, { corTitulo })} /></Linha>
          <p className="text-[11px] text-muted">O valor fica em <b>Conteúdo</b> e o fundo da pílula em <b>Cores</b>.</p>
        </Secao>
      )}

      {ehFiltros && (
        <Secao titulo="Filtros">
          <MedidasEditor el={el} bloqueado={false} rotuloEditavel addLabel="Adicionar filtro" />
          <Linha rotulo="Cor do rótulo"><ColorPicker compact valor={el.estilo.corTitulo ?? "#94A3B8"} onStart={commit} onChange={(corTitulo) => patchEstilo(el.id, { corTitulo })} /></Linha>
          <p className="text-[11px] text-muted">Cada filtro vira uma pílula "Rótulo: valor". Ligue cada um à medida do slicer (ex.: <b>SELECTEDVALUE</b>). Cor do valor e da pílula ficam em <b>Cores</b>.</p>
        </Secao>
      )}

      {ehFunil && (
        <Secao titulo="Etapas do funil">
          {(el.etapas ?? []).map((et, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input value={et.rotulo} onFocus={commit} onChange={(ev) => { const es = [...(el.etapas ?? [])]; es[i] = { ...es[i], rotulo: ev.target.value }; patchElemento(el.id, { etapas: es }); }} placeholder="Etapa" className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1 text-xs focus:border-viz focus:outline-none" />
              <input type="number" value={et.valor} onFocus={commit} onChange={(ev) => { const es = [...(el.etapas ?? [])]; es[i] = { ...es[i], valor: Number(ev.target.value) || 0 }; patchElemento(el.id, { etapas: es }); }} className="w-16 rounded-md border border-border bg-surface px-1.5 py-1 font-mono text-xs focus:border-viz focus:outline-none" />
              <button disabled={(el.etapas ?? []).length <= 1} onClick={() => { commit(); patchElemento(el.id, { etapas: (el.etapas ?? []).filter((_, j) => j !== i) }); }} title="Remover etapa" className="shrink-0 text-muted hover:text-red-600 disabled:opacity-30">×</button>
            </div>
          ))}
          <button onClick={() => { commit(); patchElemento(el.id, { etapas: [...(el.etapas ?? []), { rotulo: "Nova etapa", valor: 100 }] }); }} className="rounded-md border border-border py-1.5 text-xs font-medium text-muted hover:text-foreground">+ Etapa</button>
          <Linha rotulo="Mostrar conversão"><input type="checkbox" checked={!!el.mostrarConversao} onChange={(ev) => { commit(); patchElemento(el.id, { mostrarConversao: ev.target.checked }); }} className="h-4 w-4 accent-viz" /></Linha>
          <p className="text-[11px] text-muted">A largura da barra é proporcional ao valor. "Conversão" mostra a % em relação à etapa anterior.</p>
        </Secao>
      )}

      {ehTimeline && (
        <Secao titulo="Passos">
          <div className="flex gap-0.5 rounded-md bg-background p-0.5">
            {(["h", "v"] as const).map((o) => (
              <button key={o} onClick={() => { commit(); patchElemento(el.id, { orientacao: o }); }} className={`flex-1 rounded px-2 py-1 text-xs font-medium ${(el.orientacao ?? "h") === o ? "bg-surface shadow-sm" : "text-muted"}`}>{o === "h" ? "Horizontal" : "Vertical"}</button>
            ))}
          </div>
          {(el.itens ?? []).map((t, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="w-4 shrink-0 text-center text-[11px] text-muted">{i + 1}</span>
              <input value={t} onFocus={commit} onChange={(ev) => { const it = [...(el.itens ?? [])]; it[i] = ev.target.value; patchElemento(el.id, { itens: it }); }} className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1 text-xs focus:border-viz focus:outline-none" />
              <button disabled={(el.itens ?? []).length <= 1} onClick={() => { commit(); patchElemento(el.id, { itens: (el.itens ?? []).filter((_, j) => j !== i) }); }} title="Remover passo" className="shrink-0 text-muted hover:text-red-600 disabled:opacity-30">×</button>
            </div>
          ))}
          <button onClick={() => { commit(); patchElemento(el.id, { itens: [...(el.itens ?? []), "Novo passo"] }); }} className="rounded-md border border-border py-1.5 text-xs font-medium text-muted hover:text-foreground">+ Passo</button>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted">Bolinha: {el.iconeNome ? "ícone" : "número"}</span>
            {el.iconeNome && <button onClick={() => { commit(); patchElemento(el.id, { iconeNome: undefined, iconeNomePaths: undefined }); }} className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted hover:text-foreground">Voltar p/ números</button>}
          </div>
          <IconePicker valorAtual={el.iconeNome} cor="#0E7490" stroke={2} onPick={(nome, inner) => { commit(); patchElemento(el.id, { iconeNome: nome, iconeNomePaths: inner }); }} />
        </Secao>
      )}

      {ehKpiCompleto && (
        <Secao titulo="KPI completo">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Título</span>
            <input value={el.titulo ?? ""} onFocus={commit} onChange={(ev) => patchElemento(el.id, { titulo: ev.target.value })} className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm focus:border-viz focus:outline-none" />
          </label>
          <Campo rotulo="Variação (seta)">
            <div className="flex gap-1">
              {([["up", ArrowUp, "Melhor"], ["down", ArrowDown, "Pior"], ["neutral", Minus, "Neutro"]] as const).map(([d, Ic, lbl]) => (
                <button key={d} onClick={() => { commit(); patchElemento(el.id, { direcao: d }); }} className={`flex flex-1 items-center justify-center gap-1 rounded-md border py-1.5 text-xs ${(el.direcao ?? "up") === d ? "border-viz bg-viz/10 text-viz-dark" : "border-border text-muted"}`}><Ic className="h-3.5 w-3.5" /> {lbl}</button>
              ))}
            </div>
          </Campo>
          <MedidasEditor el={el} bloqueado />
          <Campo rotulo="Mini-barras (valores)">
            <input value={(el.barras ?? []).join(", ")} onFocus={commit} onChange={(ev) => patchElemento(el.id, { barras: ev.target.value.split(",").map((n) => Number(n.trim()) || 0).filter((_, i) => i < 16) })} placeholder="40, 60, 45, 70" className="rounded-md border border-border bg-surface px-2 py-1.5 font-mono text-xs focus:border-viz focus:outline-none" />
          </Campo>
          <p className="text-[11px] text-muted">Valor em <b>Conteúdo</b>; cores em <b>Cores</b> (as barras usam a cor principal).</p>
        </Secao>
      )}

      {ehAreaMini && (
        <Secao titulo="Mini linha">
          <Campo rotulo="Valores (separados por vírgula)">
            <input value={(el.barras ?? []).join(", ")} onFocus={commit} onChange={(ev) => patchElemento(el.id, { barras: ev.target.value.split(",").map((n) => Number(n.trim()) || 0).filter((_, i) => i < 32) })} placeholder="30, 50, 40, 65, 55" className="rounded-md border border-border bg-surface px-2 py-1.5 font-mono text-xs focus:border-viz focus:outline-none" />
          </Campo>
          <p className="text-[11px] text-muted">Gráfico decorativo (não vem de medida). A cor da linha/área está em <b>Cores</b>.</p>
        </Secao>
      )}

      {ehWaffle && (
        <Secao titulo="Waffle">
          <Campo rotulo="Formato das células">
            <div className="flex gap-0.5 rounded-md bg-background p-0.5">
              {([["Quadrado", 3], ["Redondo", 999]] as const).map(([lbl, r]) => (
                <button key={lbl} onClick={() => cEstilo({ borderRadius: r })} className={`flex-1 rounded px-2 py-1 text-xs font-medium ${el.estilo.borderRadius === r ? "bg-surface shadow-sm" : "text-muted"}`}>{lbl}</button>
              ))}
            </div>
          </Campo>
          <p className="text-[11px] text-muted">Preenche de baixo pra cima pela % (em <b>Conteúdo</b>). Cores em <b>Cores</b>.</p>
        </Secao>
      )}

      {ehAnelKpi && (
        <Secao titulo="Anel">
          <Campo rotulo="Formato">
            <div className="flex gap-0.5 rounded-md bg-background p-0.5">
              {([["anel", "Anel"], ["semi", "Semicírculo"]] as const).map(([f, lbl]) => (
                <button key={f} onClick={() => { commit(); patchElemento(el.id, { formato: f }); }} className={`flex-1 rounded px-2 py-1 text-xs font-medium ${(el.formato ?? "anel") === f ? "bg-surface shadow-sm" : "text-muted"}`}>{lbl}</button>
              ))}
            </div>
          </Campo>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Rótulo (abaixo do número)</span>
            <input value={el.titulo ?? ""} onFocus={commit} onChange={(ev) => patchElemento(el.id, { titulo: ev.target.value })} placeholder="ex.: Meta" className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm focus:border-viz focus:outline-none" />
          </label>
          <Linha rotulo="Espessura"><Num valor={el.estilo.espessura ?? 4} onStart={commit} onChange={(espessura) => patchEstilo(el.id, { espessura })} min={1} max={12} step={0.5} /></Linha>
          <p className="text-[11px] text-muted">Valor (%) em <b>Conteúdo</b>; cor do anel em <b>Cores</b>.</p>
        </Secao>
      )}

      {ehComparaAB && (
        <Secao titulo="Comparativo A/B">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Rótulo do lado A</span>
            <input value={el.titulo ?? ""} onFocus={commit} onChange={(ev) => patchElemento(el.id, { titulo: ev.target.value })} placeholder="ex.: Atual" className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm focus:border-viz focus:outline-none" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Rótulo do lado B</span>
            <input value={(el.medidas ?? []).find((m) => m.chave === "b")?.rotulo ?? ""} onFocus={commit} onChange={(ev) => patchElemento(el.id, { medidas: (el.medidas ?? []).map((m) => (m.chave === "b" ? { ...m, rotulo: ev.target.value } : m)) })} placeholder="ex.: Anterior" className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm focus:border-viz focus:outline-none" />
          </label>
          <p className="text-[11px] text-muted">Lado A = <b>Conteúdo</b>. Medida do lado B abaixo:</p>
          <MedidasEditor el={el} bloqueado />
        </Secao>
      )}

      {ehDonut && (
        <Secao titulo="Formato">
          <div className="flex gap-0.5 rounded-md bg-background p-0.5">
            {([["anel", "Anel"], ["semi", "Semicírculo"]] as const).map(([f, lbl]) => (
              <button key={f} onClick={() => { commit(); patchElemento(el.id, { formato: f }); }} className={`flex-1 rounded px-2 py-1 text-xs font-medium ${(el.formato ?? "anel") === f ? "bg-surface shadow-sm" : "text-muted"}`}>{lbl}</button>
            ))}
          </div>
        </Secao>
      )}

      {ehMedidorFamilia && <PropsMedidor el={el} />}

      {ehAnimavelEntrada && (
        <Secao titulo="Animação">
          <Linha rotulo="Animar entrada"><input type="checkbox" checked={!!el.estilo.animarFill} onChange={(e) => cEstilo({ animarFill: e.target.checked })} className="h-4 w-4 accent-viz" /></Linha>
          <p className="text-[11px] text-muted">Enche/cresce/desenha quando o visual aparece (vale no Power BI).</p>
        </Secao>
      )}

      {!ehMedidorFamilia && (
      <Secao titulo="Cores">
        {temCor && <Linha rotulo={ehIcone ? "Ícone" : ehRating ? "Estrelas" : ehSparkline ? "Barras" : ehWaffle ? "Preenchido" : ehFunil ? "Barras" : ehTimeline ? "Bolinhas" : "Texto"}><ColorPicker compact valor={el.estilo.cor} onStart={commit} onChange={(cor) => patchEstilo(el.id, { cor })} /></Linha>}
        {!ehImagem && <Linha rotulo={ehMedidor ? "Trilho" : ehWaffle ? "Vazio" : ehTimeline ? "Linha" : "Fundo"}><ColorPicker compact valor={el.estilo.fundo} onStart={commit} onChange={(fundo) => patchEstilo(el.id, { fundo })} /></Linha>}
        {!ehImagem && !ehMedidor && (
          <>
            <button onClick={() => setGradAberto((v) => !v)} className="flex w-full items-center justify-between rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted hover:text-foreground">
              Fundo em gradiente
              <ChevronDown className={`h-3 w-3 transition-transform ${gradAberto ? "" : "-rotate-90"}`} />
            </button>
            {gradAberto && (
              <div className="rounded-md border border-border p-2">
                <div className="flex items-center justify-between gap-2">
                  <ColorPicker compact valor={gA} onChange={setGA} />
                  <ColorPicker compact valor={gB} onChange={setGB} />
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted">Ângulo</span>
                  <Num valor={gAng} onChange={setGAng} min={0} max={360} suf="°" />
                </div>
                <button onClick={() => { commit(); patchEstilo(el.id, { fundo: `linear-gradient(${gAng}deg,${gA},${gB})` }); }} className="mt-1.5 w-full rounded-md border border-viz bg-viz/10 py-1 text-[11px] font-medium text-viz-dark hover:bg-viz/20">Aplicar gradiente</button>
              </div>
            )}
          </>
        )}
        <Linha rotulo="Opacidade"><Num valor={el.estilo.opacidade} onStart={commit} onChange={(opacidade) => patchEstilo(el.id, { opacidade })} min={0} max={1} step={0.05} /></Linha>
      </Secao>
      )}

      {!ehForma && (
        <Secao titulo="Cor condicional" inicial={false}>
          <Linha rotulo="Mudar cor pelo valor">
            <input
              type="checkbox"
              checked={!!el.corCond?.ativo}
              onChange={(ev) => { commit(); const cc = el.corCond ?? { ativo: false, ref: "", regras: SEMAFORO_PADRAO() }; patchElemento(el.id, { corCond: { ...cc, ativo: ev.target.checked } }); }}
              className="h-4 w-4 accent-viz"
            />
          </Linha>
          {el.corCond?.ativo && (() => {
            const cc = el.corCond!;
            const setRegras = (regras: typeof cc.regras) => patchElemento(el.id, { corCond: { ...cc, regras } });
            return (
              <>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted">Cor baseada na medida</span>
                  <input value={cc.ref} onFocus={commit} onChange={(ev) => patchElemento(el.id, { corCond: { ...cc, ref: ev.target.value } })} placeholder={el.binding.ref || "[Valor]"} className="rounded-md border border-border bg-surface px-2 py-1.5 font-mono text-xs focus:border-viz focus:outline-none" />
                  <span className="text-[10px] text-muted">Deixe vazio para usar a medida do próprio elemento. Ex.: <b>[Atingimento %]</b>.</span>
                </label>

                <div className="flex flex-wrap gap-1">
                  <span className="w-full text-[11px] text-muted">Presets (escala 0–100):</span>
                  {PRESETS_COR.map((p) => (
                    <button key={p.nome} onClick={() => { commit(); setRegras(p.regras()); }} className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted hover:border-viz hover:text-viz-dark">{p.nome}</button>
                  ))}
                </div>

                {(cc.regras ?? []).map((r, i, arr) => {
                  const ultimo = i === arr.length - 1;
                  const patchR = (patch: Partial<typeof r>) => { const rs = [...arr]; rs[i] = { ...rs[i], ...patch }; setRegras(rs); };
                  return (
                    <div key={i} className="flex flex-col gap-1.5 rounded-md border border-border/70 bg-background/40 p-1.5">
                      <div className="flex items-center gap-1.5">
                        {ultimo ? (
                          <span className="flex-1 text-[11px] font-medium text-muted">senão (demais casos)</span>
                        ) : (
                          <>
                            <span className="shrink-0 text-[11px] text-muted">se</span>
                            <select value={r.op ?? "<="} onChange={(ev) => { commit(); patchR({ op: ev.target.value as OperadorCor }); }} className="shrink-0 rounded-md border border-border bg-surface px-1 py-1 text-xs focus:border-viz focus:outline-none">
                              {OPS_COR.map((o) => (<option key={o.v} value={o.v}>{o.l}</option>))}
                            </select>
                            <input type="number" value={r.ate} onFocus={commit} onChange={(ev) => patchR({ ate: Number(ev.target.value) || 0 })} className="w-0 min-w-0 flex-1 rounded-md border border-border bg-surface px-1.5 py-1 font-mono text-xs focus:border-viz focus:outline-none" />
                            {(r.op ?? "<=") === "entre" && (
                              <>
                                <span className="shrink-0 text-[11px] text-muted">e</span>
                                <input type="number" value={r.ate2 ?? r.ate} onFocus={commit} onChange={(ev) => patchR({ ate2: Number(ev.target.value) || 0 })} className="w-0 min-w-0 flex-1 rounded-md border border-border bg-surface px-1.5 py-1 font-mono text-xs focus:border-viz focus:outline-none" />
                              </>
                            )}
                          </>
                        )}
                        <button disabled={arr.length <= 1} onClick={() => { commit(); setRegras(arr.filter((_, j) => j !== i)); }} title="Remover regra" className="shrink-0 px-1 text-muted hover:text-red-600 disabled:opacity-30">×</button>
                      </div>
                      <ColorPicker compact valor={r.cor} onStart={commit} onChange={(cor) => patchR({ cor })} />
                    </div>
                  );
                })}
                <button onClick={() => { commit(); const rs = [...(cc.regras ?? [])]; rs.splice(Math.max(0, rs.length - 1), 0, { op: ">=", ate: 50, cor: "#F59E0B" }); setRegras(rs); }} className="rounded-md border border-border py-1.5 text-xs font-medium text-muted hover:text-foreground">+ Regra</button>
                <p className="text-[11px] text-muted">As regras são checadas de cima para baixo (a primeira que bate vence). Vira um SWITCH na DAX.</p>
              </>
            );
          })()}
        </Secao>
      )}

      <Secao titulo="Borda e sombra" inicial={false}>
        <Linha rotulo="Cantos"><Num valor={el.estilo.borderRadius} onStart={commit} onChange={(borderRadius) => patchEstilo(el.id, { borderRadius })} min={0} max={999} suf="px" /></Linha>
        <Linha rotulo="Borda"><Num valor={el.estilo.borderWidth} onStart={commit} onChange={(borderWidth) => patchEstilo(el.id, { borderWidth })} min={0} max={12} suf="px" /></Linha>
        {el.estilo.borderWidth > 0 && (
          <>
            <Linha rotulo="Estilo">
              <div className="flex gap-0.5 rounded-md bg-background p-0.5">
                {(["solid", "dashed", "dotted"] as const).map((b) => (<button key={b} onClick={() => cEstilo({ borderStyle: b })} className={`rounded px-2 py-1 text-xs ${(el.estilo.borderStyle || "solid") === b ? "bg-surface shadow-sm" : "text-muted"}`}>{b === "solid" ? "──" : b === "dashed" ? "- -" : "···"}</button>))}
              </div>
            </Linha>
            <Linha rotulo="Cor da borda"><ColorPicker compact valor={el.estilo.borderColor} onStart={commit} onChange={(borderColor) => patchEstilo(el.id, { borderColor })} /></Linha>
          </>
        )}
        <Linha rotulo="Sombra"><Num valor={el.estilo.sombra} onStart={commit} onChange={(sombra) => patchEstilo(el.id, { sombra })} min={0} max={48} suf="px" /></Linha>
        {el.estilo.sombra > 0 && <Linha rotulo="Cor da sombra"><ColorPicker compact valor={el.estilo.sombraColor ?? "#000000"} onStart={commit} onChange={(sombraColor) => patchEstilo(el.id, { sombraColor })} /></Linha>}
        <Linha rotulo="Espaçamento"><Num valor={el.estilo.padding ?? 0} onStart={commit} onChange={(padding) => patchEstilo(el.id, { padding })} min={0} max={40} suf="px" /></Linha>
      </Secao>

      {temTexto && (
        <Secao titulo="Tipografia">
          <Linha rotulo="Fonte">
            <select value={el.estilo.fontFamily} onChange={(e) => cEstilo({ fontFamily: e.target.value })} className="rounded-md border border-border bg-surface px-2 py-1 text-xs focus:border-viz focus:outline-none">
              {FONTES.map((f) => (<option key={f.label} value={f.v} style={{ fontFamily: f.v || "inherit" }}>{f.label}</option>))}
            </select>
          </Linha>
          <Linha rotulo="Tamanho"><Num valor={el.estilo.fontSize} onStart={commit} onChange={(fontSize) => patchEstilo(el.id, { fontSize })} min={8} max={120} suf="px" /></Linha>
          <Linha rotulo="Peso"><Num valor={el.estilo.fontWeight} onStart={commit} onChange={(fontWeight) => patchEstilo(el.id, { fontWeight })} min={300} max={800} step={100} /></Linha>
          <Linha rotulo="Espaçamento"><Num valor={el.estilo.letterSpacing} onStart={commit} onChange={(letterSpacing) => patchEstilo(el.id, { letterSpacing })} min={-2} max={12} step={0.5} suf="px" /></Linha>
          <Linha rotulo="Entrelinha"><Num valor={el.estilo.lineHeight ?? 1.15} onStart={commit} onChange={(lineHeight) => patchEstilo(el.id, { lineHeight })} min={0.8} max={2.5} step={0.05} /></Linha>
          <Linha rotulo="Brilho (glow)"><Num valor={el.estilo.glow} onStart={commit} onChange={(glow) => patchEstilo(el.id, { glow })} min={0} max={30} suf="px" /></Linha>
          <Linha rotulo="Maiúsculas"><input type="checkbox" checked={el.estilo.uppercase} onChange={(e) => cEstilo({ uppercase: e.target.checked })} className="h-4 w-4 accent-viz" /></Linha>
          <Linha rotulo="Horizontal">
            <div className="flex gap-0.5 rounded-md bg-background p-0.5">
              {([["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight]] as const).map(([a, Ic]) => (<button key={a} onClick={() => cEstilo({ align: a })} className={`rounded px-2 py-1 ${el.estilo.align === a ? "bg-surface text-foreground shadow-sm" : "text-muted"}`}><Ic className="h-3.5 w-3.5" /></button>))}
            </div>
          </Linha>
          <Linha rotulo="Vertical">
            <div className="flex gap-0.5 rounded-md bg-background p-0.5">
              {([["start", AlignVerticalJustifyStart], ["center", AlignVerticalJustifyCenter], ["end", AlignVerticalJustifyEnd]] as const).map(([a, Ic]) => (<button key={a} onClick={() => cEstilo({ alignV: a })} className={`rounded px-2 py-1 ${(el.estilo.alignV ?? "center") === a ? "bg-surface text-foreground shadow-sm" : "text-muted"}`}><Ic className="h-3.5 w-3.5" /></button>))}
            </div>
          </Linha>
        </Secao>
      )}

      <Secao titulo="Animação" inicial={false}>
        <div className="grid grid-cols-2 gap-1.5">
          {ANIMS.map((a) => (<button key={a.v} onClick={() => patchAnimacao(el.id, { tipo: a.v })} className={`rounded-md border px-2 py-1.5 text-xs ${el.animacao.tipo === a.v ? "border-viz bg-viz/10 text-viz-dark" : "border-border text-muted hover:border-viz/50"}`}>{a.r}</button>))}
        </div>
        {el.animacao.tipo !== "none" && (
          <>
            <Linha rotulo="Duração"><Num valor={el.animacao.duracao} onStart={commit} onChange={(duracao) => patchAnimacao(el.id, { duracao })} min={0.1} max={4} step={0.1} suf="s" /></Linha>
            <Linha rotulo="Atraso"><Num valor={el.animacao.delay} onStart={commit} onChange={(delay) => patchAnimacao(el.id, { delay })} min={0} max={3} step={0.1} suf="s" /></Linha>
          </>
        )}
      </Secao>

      <div className="px-4 py-3">
        <button onClick={remover} className="w-full rounded-md border border-red-200 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">Excluir elemento</button>
      </div>
    </>
  );
}

function PropsMulti({ count }: { count: number }) {
  const alinharSelecao = useEditor((s) => s.alinharSelecao);
  const distribuir = useEditor((s) => s.distribuir);
  const agrupar = useEditor((s) => s.agrupar);
  const desagrupar = useEditor((s) => s.desagrupar);
  const remover = useEditor((s) => s.removerSelecionados);
  return (
    <>
      <Secao titulo={`${count} elementos selecionados`}>
        <p className="text-[11px] text-muted">Alinhar todos ao card:</p>
        <div className="flex justify-between gap-0.5 rounded-md bg-background p-0.5">
          {([["esq", AlignLeft], ["centroH", AlignCenter], ["dir", AlignRight], ["topo", AlignStartHorizontal], ["centroV", AlignCenterHorizontal], ["base", AlignEndHorizontal]] as const).map(([m, Ic]) => (
            <button key={m} onClick={() => alinharSelecao(m)} className="flex-1 rounded p-1 text-muted hover:bg-surface hover:text-foreground"><Ic className="mx-auto h-3.5 w-3.5" /></button>
          ))}
        </div>
        {count >= 3 && (
          <>
            <p className="text-[11px] text-muted">Distribuir espaçamento:</p>
            <div className="flex gap-2">
              <button onClick={() => distribuir("h")} className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border py-1.5 text-xs font-medium text-muted hover:text-foreground"><AlignHorizontalDistributeCenter className="h-3.5 w-3.5" /> Horizontal</button>
              <button onClick={() => distribuir("v")} className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border py-1.5 text-xs font-medium text-muted hover:text-foreground"><AlignVerticalDistributeCenter className="h-3.5 w-3.5" /> Vertical</button>
            </div>
          </>
        )}
        <div className="flex gap-2">
          <button onClick={agrupar} className="flex-1 rounded-md border border-border py-1.5 text-xs font-medium hover:bg-background">Agrupar (Ctrl+G)</button>
          <button onClick={desagrupar} className="flex-1 rounded-md border border-border py-1.5 text-xs font-medium hover:bg-background">Desagrupar</button>
        </div>
        <button onClick={remover} className="rounded-md border border-red-200 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">Excluir selecionados</button>
        <p className="text-[11px] text-muted">Shift + clique adiciona/remove da seleção.</p>
      </Secao>
    </>
  );
}

// Seletor de formatação numérica de uma medida dinâmica (gera FORMAT na DAX).
function FormatoSel({ binding, onChange, commit }: { binding: Binding; onChange: (p: Partial<Binding>) => void; commit: () => void }) {
  const f = binding.formato ?? "auto";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[11px] text-muted">Formato</span>
        <select value={f} onChange={(e) => { commit(); onChange({ formato: e.target.value as FormatoNum }); }} className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1 text-xs focus:border-viz focus:outline-none">
          {FORMATOS.map((o) => <option key={o.id} value={o.id}>{o.rotulo}</option>)}
        </select>
      </div>
      {f === "custom" && (
        <input value={binding.mascara ?? ""} onFocus={commit} onChange={(e) => onChange({ mascara: e.target.value })} placeholder="#.##0,00" className="rounded-md border border-border bg-surface px-2 py-1.5 font-mono text-xs focus:border-viz focus:outline-none" />
      )}
      {f === "percent" && <p className="text-[10px] text-muted">Para medidas em fração: 0,85 vira 85%.</p>}
      {f === "percentPronto" && <p className="text-[10px] text-muted">Para medidas já em escala: 85 vira 85%.</p>}
      {f === "custom" && <p className="text-[10px] text-muted">Máscara do Power BI, ex.: <span className="font-mono">#.##0,00</span> ou <span className="font-mono">0%</span>.</p>}
    </div>
  );
}

// Editor das medidas extras (Texto narrativo / Card comparativo / Filtros).
// bloqueado = chaves fixas (comparativo) sem add/remover.
// rotuloEditavel = mostra o rótulo editável (filtros) em vez do token {chave}.
function MedidasEditor({ el, bloqueado, rotuloEditavel = false, addLabel = "Adicionar medida", comCor = false }: { el: SceneElement; bloqueado: boolean; rotuloEditavel?: boolean; addLabel?: string; comCor?: boolean }) {
  const patchElemento = useEditor((s) => s.patchElemento);
  const commit = useEditor((s) => s.commit);
  const medidas = el.medidas ?? [];
  const set = (ms: NonNullable<SceneElement["medidas"]>) => patchElemento(el.id, { medidas: ms });
  const patchM = (i: number, patch: Partial<{ rotulo: string; chave: string; cor: string; binding: Binding }>) => set(medidas.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const patchBind = (i: number, b: Partial<Binding>) => patchM(i, { binding: { ...medidas[i].binding, ...b } });
  const addMedida = () => {
    commit();
    const existentes = new Set(medidas.map((m) => m.chave));
    const pref = rotuloEditavel ? "f" : "m";
    let n = medidas.length + 1;
    while (existentes.has(`${pref}${n}`)) n++;
    set([...medidas, { chave: `${pref}${n}`, rotulo: rotuloEditavel ? `Filtro ${n}` : `Medida ${n}`, binding: { dinamico: true, valor: "", ref: rotuloEditavel ? "[Valor selecionado]" : "[Medida]" } }]);
  };
  return (
    <>
      {medidas.map((m, i) => (
        <div key={i} className="flex flex-col gap-1.5 rounded-md border border-border p-2">
          <div className="flex items-center gap-2">
            {bloqueado ? (
              <span className="text-xs font-medium">{m.rotulo || m.chave}</span>
            ) : rotuloEditavel ? (
              <input value={m.rotulo ?? ""} onFocus={commit} onChange={(ev) => patchM(i, { rotulo: ev.target.value })} placeholder="Rótulo (ex.: Região)" className="min-w-0 flex-1 rounded border border-border bg-surface px-1.5 py-1 text-xs focus:border-viz focus:outline-none" />
            ) : (
              <span className="flex items-center gap-1 text-xs text-muted">token
                <span className="font-mono text-muted">{"{"}</span>
                <input value={m.chave} onFocus={commit} onChange={(ev) => patchM(i, { chave: ev.target.value.replace(/[^a-zA-Z0-9_]/g, "") })} className="w-16 rounded border border-border bg-surface px-1 py-0.5 font-mono text-xs focus:border-viz focus:outline-none" />
                <span className="font-mono text-muted">{"}"}</span>
              </span>
            )}
            {!bloqueado && (
              <button onClick={() => { commit(); set(medidas.filter((_, j) => j !== i)); }} title="Remover" className="ml-auto shrink-0 text-muted hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
            )}
          </div>
          <div className="flex gap-0.5 rounded-md bg-background p-0.5">
            <button onClick={() => { commit(); patchBind(i, { dinamico: false }); }} className={`flex-1 rounded px-2 py-1 text-xs font-medium ${!m.binding.dinamico ? "bg-surface shadow-sm" : "text-muted"}`}>Fixo</button>
            <button onClick={() => { commit(); patchBind(i, { dinamico: true }); }} className={`flex-1 rounded px-2 py-1 text-xs font-medium ${m.binding.dinamico ? "bg-viz text-white" : "text-muted"}`}>Dinâmico</button>
          </div>
          {m.binding.dinamico ? (
            <input value={m.binding.ref} onFocus={commit} onChange={(ev) => patchBind(i, { ref: ev.target.value })} placeholder="[Minha Medida]" className="rounded-md border border-border bg-surface px-2 py-1.5 font-mono text-xs focus:border-viz focus:outline-none" />
          ) : (
            <input value={m.binding.valor} onFocus={commit} onChange={(ev) => patchBind(i, { valor: ev.target.value })} className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm focus:border-viz focus:outline-none" />
          )}
          {m.binding.dinamico && !bloqueado && (
            <FormatoSel binding={m.binding} commit={commit} onChange={(p) => patchBind(i, p)} />
          )}
          {comCor && (
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-[11px] text-muted">Cor no texto</span>
              <ColorPicker compact valor={m.cor || "#22C55E"} onStart={commit} onChange={(cor) => patchM(i, { cor })} />
            </div>
          )}
        </div>
      ))}
      {!bloqueado && (
        <button onClick={addMedida} className="flex items-center justify-center gap-1 rounded-md border border-border py-1.5 text-xs font-medium text-muted hover:text-foreground"><Plus className="h-3.5 w-3.5" /> {addLabel}</button>
      )}
    </>
  );
}

export default function Properties() {
  const selectedIds = useEditor((s) => s.selectedIds);
  const selectedId = useEditor((s) => s.selectedId);
  const el = useEditor((s) => elementosAtivos(s).find((e) => e.id === s.selectedId));
  const multi = selectedIds.length > 1;
  const temObjeto = !!el || multi;
  const meta = el ? TIPO_META[el.type] : null;
  const HeaderIc = meta?.icon;
  const [aba, setAba] = useState<"objeto" | "fundo">("objeto");
  // ao selecionar um objeto no canvas, vai automaticamente pra aba "Objeto"
  useEffect(() => { if (temObjeto) setAba("objeto"); /* eslint-disable-next-line */ }, [selectedId, multi]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 gap-0.5 border-b border-border p-2">
        {([["objeto", "Objeto"], ["fundo", "Fundo"]] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => setAba(k)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${aba === k ? "bg-viz/10 text-viz-dark" : "text-muted hover:bg-background hover:text-foreground"}`}>
            {k === "objeto" && HeaderIc && <HeaderIc className="h-3.5 w-3.5" />}
            {lbl}
          </button>
        ))}
      </div>

      {aba === "objeto" && temObjeto && (
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          {HeaderIc && <span className="flex h-6 w-6 items-center justify-center rounded-md bg-viz/10 text-viz-dark"><HeaderIc className="h-3.5 w-3.5" /></span>}
          <h2 className="text-sm font-semibold">{multi ? `Seleção (${selectedIds.length})` : meta?.label}</h2>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {aba === "fundo" ? (
          <PropsCard />
        ) : multi ? (
          <PropsMulti count={selectedIds.length} />
        ) : el ? (
          <PropsElemento el={el} />
        ) : (
          <div className="px-4 py-8 text-center text-xs text-muted">
            Selecione um objeto no canvas para editá-lo.
            <br />
            <button onClick={() => setAba("fundo")} className="mt-2 rounded-md border border-border px-3 py-1.5 font-medium text-foreground hover:bg-background">Editar o Fundo</button>
          </div>
        )}
      </div>
    </div>
  );
}
