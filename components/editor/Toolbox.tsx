"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  Type, Heading1, Heading2, Text, Hash, Sigma, Tag, Quote,
  TrendingUp, RectangleHorizontal, Gauge, Users, Table, ListOrdered,
  MousePointerClick, Star, Image as ImageIcon, CircleUser,
  Square, Frame, Minus, SquareDashed,
  LayoutGrid, Heading, UserSquare, Boxes, Columns2, Target,
  ChevronDown, Search, Zap, X, type LucideIcon,
  Megaphone, Activity, ListChecks, Award, PanelBottom, Link as LinkIcon, Sparkles,
  BarChart3, List, SeparatorHorizontal, Thermometer, PieChart, SlidersHorizontal, Filter, CreditCard,
  MessageSquareText, Funnel, Grid3x3, GitCommitHorizontal,
  SquareActivity, ChartArea, CircleGauge,
} from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import { BLOCOS, GRUPOS_BLOCO } from "@/lib/editor/blocos";
import { criarElemento, TEMA_PADRAO, TRANSICAO_PADRAO } from "@/lib/editor/defaults";
import { PALETA_PADRAO } from "@/lib/editor/paletas";
import { buildPreview } from "@/lib/editor/buildPreview";
import type { ElementType, VisualDocument } from "@/lib/editor/types";
import type { PresetOverride } from "@/lib/editor/store";

const BLOCO_ICON: Record<string, LucideIcon> = {
  LayoutGrid, Square, Heading, Gauge, RectangleHorizontal, UserSquare, Columns2, Table, Target,
  Megaphone, Activity, ListChecks, Award, PanelBottom, SlidersHorizontal, Filter, PieChart,
};

type Papel = "titulo" | "subtitulo" | "corpo" | "legenda";

interface Item {
  base: ElementType;
  icon: LucideIcon;
  rotulo: string;
  preset?: PresetOverride;
  papel?: Papel; // texto que usa os tamanhos/fonte do tema
  tags?: string; // sinônimos p/ busca (ex.: "rosca anel" acha Donut)
}

const BRAND = "#06B6D4";

const ITENS: Item[] = [
  { base: "texto", icon: Type, rotulo: "Texto", papel: "corpo" },
  { base: "texto", icon: Heading1, rotulo: "Título", papel: "titulo" },
  { base: "texto", icon: Heading2, rotulo: "Subtítulo", papel: "subtitulo" },
  { base: "texto", icon: Text, rotulo: "Legenda", papel: "legenda" },
  { base: "texto", icon: Quote, rotulo: "Citação", preset: { w: 260, h: 64, binding: { valor: "“Frase de destaque”" }, estilo: { fontSize: 18, fontWeight: 600, lineHeight: 1.4 } } },
  { base: "badge", icon: Tag, rotulo: "Badge" },
  { base: "kpi", icon: Hash, rotulo: "KPI" },
  { base: "cartao", icon: CreditCard, rotulo: "Cartão KPI" },
  { base: "kpiCompleto", icon: SquareActivity, rotulo: "KPI completo" },
  { base: "cardGauge", icon: Gauge, rotulo: "Card + Gauge" },
  { base: "anelKpi", icon: CircleGauge, rotulo: "Anel KPI" },
  { base: "comparaAB", icon: Columns2, rotulo: "Comparativo A/B" },
  { base: "areaMini", icon: ChartArea, rotulo: "Mini linha" },
  { base: "comparativo", icon: Target, rotulo: "Card comparativo" },
  { base: "narrativo", icon: MessageSquareText, rotulo: "Texto narrativo" },
  { base: "chip", icon: Tag, rotulo: "Chip de métrica" },
  { base: "filtros", icon: Filter, rotulo: "Filtros aplicados" },
  { base: "funil", icon: Funnel, rotulo: "Funil" },
  { base: "waffle", icon: Grid3x3, rotulo: "Waffle" },
  { base: "timeline", icon: GitCommitHorizontal, rotulo: "Timeline" },
  { base: "kpi", icon: Sigma, rotulo: "KPI grande", preset: { w: 280, h: 56, estilo: { fontSize: 46, fontWeight: 800 } } },
  { base: "tabela", icon: Table, rotulo: "Tabela" },
  { base: "tabela", icon: ListOrdered, rotulo: "Ranking", preset: { w: 280, h: 170, tabela: "Ranking", colunas: [{ coluna: "Ranking[#]", rotulo: "#" }, { coluna: "Ranking[Nome]", rotulo: "Nome" }, { coluna: "Ranking[Valor]", rotulo: "Valor" }] } },
  { base: "tendencia", icon: TrendingUp, rotulo: "Tendência" },
  { base: "progresso", icon: RectangleHorizontal, rotulo: "Progresso" },
  { base: "pictograma", icon: Users, rotulo: "Pictograma" },
  { base: "rating", icon: Star, rotulo: "Rating" },
  { base: "velocimetro", icon: Gauge, rotulo: "Velocímetro" },
  { base: "donut", icon: PieChart, rotulo: "Donut" },
  { base: "termometro", icon: Thermometer, rotulo: "Termômetro" },
  { base: "bullet", icon: SlidersHorizontal, rotulo: "Bullet" },
  { base: "sparkline", icon: BarChart3, rotulo: "Mini-barras" },
  { base: "lista", icon: List, rotulo: "Lista" },
  { base: "divisorRotulo", icon: SeparatorHorizontal, rotulo: "Divisor c/ texto" },
  { base: "forma", icon: Frame, rotulo: "Painel", preset: { w: 280, h: 150, estilo: { fundo: "rgba(255,255,255,.06)", borderWidth: 1, borderColor: BRAND, borderRadius: 18 } } },
  { base: "forma", icon: SquareDashed, rotulo: "Moldura", preset: { w: 200, h: 120, estilo: { fundo: "transparent", borderWidth: 2, borderColor: BRAND, borderStyle: "dashed", borderRadius: 12 } } },
  { base: "forma", icon: Square, rotulo: "Forma" },
  { base: "linha", icon: Minus, rotulo: "Linha" },
  { base: "botao", icon: MousePointerClick, rotulo: "Botão" },
  { base: "icone", icon: Star, rotulo: "Ícone" },
  { base: "icone", icon: Sparkles, rotulo: "Estrela", preset: { w: 40, h: 40, binding: { valor: "star" }, estilo: { cor: "#FBBF24", fundo: "transparent", align: "center" } } },
  { base: "imagem", icon: ImageIcon, rotulo: "Imagem" },
  { base: "imagem", icon: CircleUser, rotulo: "Avatar", preset: { w: 64, h: 64, contain: false, estilo: { borderRadius: 999, borderWidth: 2, borderColor: BRAND } } },
  { base: "botao", icon: LinkIcon, rotulo: "Link", preset: { w: 130, h: 32, binding: { valor: "Saiba mais" }, estilo: { fundo: "transparent", cor: BRAND, fontSize: 13, fontWeight: 700, align: "center" } } },
];

const POR_ROTULO: Record<string, Item> = Object.fromEntries(ITENS.map((i) => [i.rotulo, i]));

const GRUPOS: { titulo: string; rotulos: string[] }[] = [
  { titulo: "Texto", rotulos: ["Texto", "Título", "Subtítulo", "Legenda", "Citação", "Texto narrativo", "Badge", "Lista"] },
  { titulo: "Cards & KPIs", rotulos: ["KPI", "KPI grande", "Cartão KPI", "KPI completo", "Card + Gauge", "Card comparativo", "Comparativo A/B", "Chip de métrica"] },
  { titulo: "Medidores", rotulos: ["Velocímetro", "Donut", "Anel KPI", "Termômetro", "Bullet", "Progresso", "Waffle"] },
  { titulo: "Gráficos", rotulos: ["Mini linha", "Mini-barras", "Funil", "Timeline", "Pictograma", "Rating", "Tendência"] },
  { titulo: "Tabelas & filtros", rotulos: ["Tabela", "Ranking", "Filtros aplicados"] },
  { titulo: "Containers", rotulos: ["Painel", "Moldura", "Forma", "Divisor c/ texto", "Linha"] },
  { titulo: "Ação", rotulos: ["Botão", "Link"] },
  { titulo: "Mídia", rotulos: ["Ícone", "Estrela", "Imagem", "Avatar"] },
];

// Sinônimos p/ busca (sem acento). Ex.: buscar "rosca" acha Donut.
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const TAGS: Record<string, string> = {
  "Donut": "rosca anel circular progresso", "Anel KPI": "meta gauge medidor rosca circular porcentagem donut",
  "Velocímetro": "velocidade ponteiro medidor gauge rpm", "Termômetro": "temperatura vertical medidor",
  "Bullet": "meta alvo barra", "Progresso": "barra percentual atingimento", "Waffle": "grade quadrados porcentagem cem",
  "Funil": "conversao etapas funnel", "Timeline": "linha do tempo passos etapas jornada",
  "Mini linha": "grafico linha area tendencia sparkline", "Mini-barras": "sparkline grafico barras tendencia",
  "Pictograma": "icones repetidos preenchimento pessoas", "Rating": "estrelas nota avaliacao",
  "Tendência": "seta variacao delta subiu desceu", "KPI": "numero valor indicador metrica",
  "KPI grande": "numero grande destaque", "Cartão KPI": "card cartao icone valor",
  "KPI completo": "card completo valor variacao sparkline", "Card + Gauge": "card medidor rosca atingimento",
  "Card comparativo": "meta atingimento barra", "Comparativo A/B": "antes depois atual anterior lado a lado versus",
  "Chip de métrica": "pilula tag etiqueta metrica", "Filtros aplicados": "slicer segmentacao selecionado filtro",
  "Tabela": "grade linhas colunas matriz", "Ranking": "top classificacao posicao",
  "Texto narrativo": "storytelling frase medidas narrativa dinamico", "Badge": "selo etiqueta status pilula",
  "Painel": "container fundo caixa card", "Moldura": "borda contorno frame", "Forma": "retangulo quadrado circulo shape",
  "Botão": "acao link cta clicar", "Ícone": "simbolo pictograma svg", "Avatar": "foto perfil circular pessoa",
  "Imagem": "foto logo picture", "Lista": "itens topicos bullets checklist",
};

const RAPIDOS = ["Texto", "KPI", "Progresso", "Painel", "Ícone"];

// ───────── Preview ao passar o mouse ─────────
const PREV_W = 248, PREV_H = 150, PREV_PAD = 16;

/** Monta um documento mínimo com só o componente do item, centrado e escalado. */
function docPreview(it: Item): VisualDocument {
  const el = criarElemento(it.base, 0, 0);
  if (it.preset) {
    const { estilo: pe, binding: pb, ...rest } = it.preset;
    Object.assign(el, rest);
    if (pe) el.estilo = { ...el.estilo, ...pe };
    if (pb) el.binding = { ...el.binding, ...pb };
  }
  if (it.papel) {
    const fs = it.papel === "titulo" ? 26 : it.papel === "subtitulo" ? 18 : it.papel === "legenda" ? 12 : 15;
    el.estilo = { ...el.estilo, fontSize: fs, fontWeight: it.papel === "titulo" ? 800 : el.estilo.fontWeight };
    el.binding = { ...el.binding, valor: it.papel === "titulo" ? "Título" : it.papel === "subtitulo" ? "Subtítulo" : it.papel === "legenda" ? "Legenda" : "Texto de exemplo" };
  }
  const s = Math.min(1, (PREV_W - 2 * PREV_PAD) / el.w, (PREV_H - 2 * PREV_PAD) / el.h);
  if (s < 1) {
    el.w = Math.round(el.w * s);
    el.h = Math.round(el.h * s);
    if (el.estilo.fontSize) el.estilo = { ...el.estilo, fontSize: Math.max(6, Math.round(el.estilo.fontSize * s)) };
  }
  el.x = Math.round((PREV_W - el.w) / 2);
  el.y = Math.round((PREV_H - el.h) / 2);
  return {
    nome: "prev",
    card: { w: PREV_W, h: PREV_H, fundo: "linear-gradient(150deg,#12161D,#080A0E)", borderRadius: 14, borderColor: "#06B6D4", borderWidth: 0, sombra: 0 },
    paleta: [...PALETA_PADRAO],
    tema: { ...TEMA_PADRAO },
    transicao: { ...TRANSICAO_PADRAO },
    paginas: [{ id: "pg", nome: "p", elements: [el] }],
  };
}

type MostrarPreview = (it: Item | null, rect?: DOMRect | null) => void;
const PreviewCtx = createContext<MostrarPreview>(() => {});

function HoverPreview({ it, rect }: { it: Item; rect: DOMRect }) {
  const srcDoc = useMemo(() => buildPreview(docPreview(it)), [it]);
  let left = rect.right + 10;
  if (left + PREV_W > window.innerWidth - 8) left = Math.max(8, rect.left - PREV_W - 10);
  const top = Math.max(60, Math.min(rect.top + rect.height / 2 - PREV_H / 2, window.innerHeight - PREV_H - 40));
  return (
    <div style={{ position: "fixed", left, top, width: PREV_W, zIndex: 60 }} className="pointer-events-none overflow-hidden rounded-xl border border-viz/40 bg-[#0b1220] shadow-2xl">
      <iframe title={`Prévia de ${it.rotulo}`} sandbox="" srcDoc={srcDoc} style={{ width: PREV_W, height: PREV_H, background: "transparent", border: 0 }} />
      <div className="border-t border-white/10 px-2 py-1 text-center text-[10px] font-medium text-slate-300">{it.rotulo}</div>
    </div>
  );
}

function Botao({ it }: { it: Item }) {
  const adicionar = useEditor((s) => s.adicionar);
  const adicionarPreset = useEditor((s) => s.adicionarPreset);
  const adicionarTexto = useEditor((s) => s.adicionarTexto);
  const registrarRecente = useEditor((s) => s.registrarRecente);
  const mostrarPreview = useContext(PreviewCtx);
  const Icon = it.icon;
  return (
    <button
      onClick={() => {
        if (it.papel) adicionarTexto(it.papel);
        else if (it.preset) adicionarPreset(it.base, it.preset);
        else adicionar(it.base);
        registrarRecente(it.rotulo);
        mostrarPreview(null);
      }}
      onMouseEnter={(e) => mostrarPreview(it, e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => mostrarPreview(null)}
      title={it.rotulo}
      className="flex flex-col items-center justify-center gap-1 rounded-lg border border-border bg-background py-2.5 transition-colors hover:border-viz hover:bg-viz/5"
    >
      <Icon className="h-4 w-4 text-viz-dark" strokeWidth={1.8} />
      <span className="text-[10px] leading-tight text-muted">{it.rotulo}</span>
    </button>
  );
}

function Grupo({ titulo, rotulos, defaultOpen = true }: { titulo: string; rotulos: string[]; defaultOpen?: boolean }) {
  const [aberto, setAberto] = useState(defaultOpen);
  return (
    <div className="border-b border-border pb-3">
      <button onClick={() => setAberto((v) => !v)} className="mb-1.5 flex w-full items-center justify-between text-[11px] font-bold uppercase tracking-wider text-foreground hover:text-viz-dark">
        {titulo}
        <ChevronDown className={`h-3 w-3 text-muted transition-transform ${aberto ? "" : "-rotate-90"}`} />
      </button>
      {aberto && (
        <div className="grid grid-cols-3 gap-1.5">
          {rotulos.map((r) => POR_ROTULO[r] && <Botao key={r} it={POR_ROTULO[r]} />)}
        </div>
      )}
    </div>
  );
}

const BLOCO_POR_NOME: Record<string, (typeof BLOCOS)[number]> = Object.fromEntries(BLOCOS.map((b) => [b.nome, b]));

function BlocosSec() {
  const [aberto, setAberto] = useState(true);
  const adicionarBloco = useEditor((s) => s.adicionarBloco);
  return (
    <div className="rounded-lg border border-viz/30 bg-viz/5 p-2">
      <button onClick={() => setAberto((v) => !v)} className="flex w-full items-center justify-between text-[11px] font-bold uppercase tracking-wider text-viz-dark">
        <span className="flex items-center gap-1"><Boxes className="h-3 w-3" /> Blocos prontos</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${aberto ? "" : "-rotate-90"}`} />
      </button>
      {aberto && (
        <div className="mt-2 flex flex-col gap-2.5">
          {GRUPOS_BLOCO.map((g) => (
            <div key={g.titulo}>
              <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">{g.titulo}</h4>
              <div className="grid grid-cols-2 gap-1.5">
                {g.nomes.map((nome) => {
                  const b = BLOCO_POR_NOME[nome];
                  if (!b) return null;
                  const Ic = BLOCO_ICON[b.icone] ?? LayoutGrid;
                  return (
                    <button key={nome} onClick={() => adicionarBloco(b.elementos)} title={nome} className="flex flex-col items-center gap-1 rounded-lg border border-border bg-surface py-2.5 transition-colors hover:border-viz hover:bg-viz/10">
                      <Ic className="h-4 w-4 text-viz-dark" strokeWidth={1.8} />
                      <span className="text-center text-[10px] leading-tight text-muted">{nome}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Toolbox() {
  const [busca, setBusca] = useState("");
  const [preview, setPreview] = useState<{ it: Item; rect: DOMRect } | null>(null);
  const favoritos = useEditor((s) => s.favoritos);
  const recentes = useEditor((s) => s.recentes);
  const adicionarFavorito = useEditor((s) => s.adicionarFavorito);
  const removerFavorito = useEditor((s) => s.removerFavorito);

  const mostrarPreview = useCallback<MostrarPreview>((it, rect) => setPreview(it && rect ? { it, rect } : null), []);

  const resultados = useMemo(() => {
    const q = norm(busca.trim());
    if (!q) return null;
    return ITENS.filter((i) => norm(i.rotulo).includes(q) || norm(TAGS[i.rotulo] ?? "").includes(q) || norm(i.tags ?? "").includes(q));
  }, [busca]);

  return (
    <PreviewCtx.Provider value={mostrarPreview}>
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar componente" className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-2 text-xs focus:border-viz focus:outline-none" />
      </div>

      {resultados ? (
        <div className="grid grid-cols-3 gap-1.5">
          {resultados.length ? resultados.map((it) => <Botao key={it.rotulo} it={it} />) : <p className="col-span-3 py-4 text-center text-xs text-muted">Nada encontrado.</p>}
        </div>
      ) : (
        <>
          {recentes.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">Recentes</h3>
              <div className="grid grid-cols-3 gap-1.5">
                {recentes.map((r) => POR_ROTULO[r] && <Botao key={r} it={POR_ROTULO[r]} />)}
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-viz-dark">
              <Zap className="h-3 w-3" /> Rápidos
            </h3>
            <div className="grid grid-cols-3 gap-1.5">
              {RAPIDOS.map((r) => POR_ROTULO[r] && <Botao key={r} it={POR_ROTULO[r]} />)}
            </div>
          </div>

          <BlocosSec />

          {favoritos.length > 0 && (
            <div className="border-t border-border pt-3">
              <h3 className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-foreground">
                <Star className="h-3 w-3" /> Favoritos
              </h3>
              <div className="flex flex-col gap-1">
                {favoritos.map((f) => (
                  <div key={f.id} className="group flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5">
                    <button onClick={() => adicionarFavorito(f)} className="flex-1 truncate text-left text-xs text-foreground hover:text-viz-dark">{f.nome}</button>
                    <button onClick={() => removerFavorito(f.id)} title="Remover" className="text-muted opacity-0 hover:text-red-600 group-hover:opacity-100"><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}


          {GRUPOS.map((g) => (<Grupo key={g.titulo} {...g} />))}
        </>
      )}
    </div>
    {preview && <HoverPreview it={preview.it} rect={preview.rect} />}
    </PreviewCtx.Provider>
  );
}
