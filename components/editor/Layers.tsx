"use client";

import { useState } from "react";
import {
  Type,
  Hash,
  Square,
  Star,
  Gauge,
  Image as ImageIcon,
  Minus,
  TrendingUp,
  Tag,
  RectangleHorizontal,
  MousePointerClick,
  Users,
  Table,
  BarChart3,
  List,
  SeparatorHorizontal,
  Thermometer,
  PieChart,
  SlidersHorizontal,
  CreditCard,
  GripVertical,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Folder,
  ChevronRight,
  ChevronDown,
  MessageSquareText,
  Target,
  Filter,
  Funnel,
  Grid3x3,
  GitCommitHorizontal,
  SquareActivity,
  ChartArea,
  CircleGauge,
  Columns2,
  type LucideIcon,
} from "lucide-react";
import { useEditor, elementosAtivos } from "@/lib/editor/store";
import type { ElementType, SceneElement } from "@/lib/editor/types";

const ICON: Record<ElementType, LucideIcon> = {
  texto: Type,
  kpi: Hash,
  forma: Square,
  icone: Star,
  progresso: RectangleHorizontal,
  gauge: Gauge,
  imagem: ImageIcon,
  linha: Minus,
  tendencia: TrendingUp,
  badge: Tag,
  botao: MousePointerClick,
  pictograma: Users,
  tabela: Table,
  rating: Star,
  sparkline: BarChart3,
  lista: List,
  divisorRotulo: SeparatorHorizontal,
  velocimetro: Gauge,
  bullet: SlidersHorizontal,
  termometro: Thermometer,
  donut: PieChart,
  cartao: CreditCard,
  cardGauge: Gauge,
  narrativo: MessageSquareText,
  comparativo: Target,
  chip: Tag,
  filtros: Filter,
  funil: Funnel,
  waffle: Grid3x3,
  timeline: GitCommitHorizontal,
  kpiCompleto: SquareActivity,
  areaMini: ChartArea,
  anelKpi: CircleGauge,
  comparaAB: Columns2,
};

export default function Layers() {
  const els = useEditor(elementosAtivos);
  const selectedIds = useEditor((s) => s.selectedIds);
  const selecionar = useEditor((s) => s.selecionar);
  const toggleVisivel = useEditor((s) => s.toggleVisivel);
  const toggleBloqueio = useEditor((s) => s.toggleBloqueio);
  const removerElemento = useEditor((s) => s.removerElemento);
  const setOrdem = useEditor((s) => s.setOrdem);
  const patchElemento = useEditor((s) => s.patchElemento);

  const [arrastando, setArrastando] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [recolhidos, setRecolhidos] = useState<Set<string>>(new Set());
  const camadas = [...els].reverse(); // topo (frente) primeiro

  function soltar(targetId: string) {
    if (!arrastando || arrastando === targetId) return;
    const idsVisuais = camadas.map((e) => e.id).filter((id) => id !== arrastando);
    const at = idsVisuais.indexOf(targetId);
    idsVisuais.splice(at, 0, arrastando);
    setOrdem([...idsVisuais].reverse());
    setArrastando(null);
  }

  function toggleGrupo(g: string) {
    setRecolhidos((prev) => {
      const n = new Set(prev);
      if (n.has(g)) n.delete(g); else n.add(g);
      return n;
    });
  }

  // Monta as linhas: pastas (grupos) na posição do membro mais à frente + itens soltos.
  type Linha = { tipo: "grupo"; grupo: string; membros: SceneElement[] } | { tipo: "item"; el: SceneElement };
  const linhas: Linha[] = [];
  const emitido = new Set<string>();
  for (const el of camadas) {
    if (el.grupo) {
      if (emitido.has(el.grupo)) continue;
      emitido.add(el.grupo);
      linhas.push({ tipo: "grupo", grupo: el.grupo, membros: camadas.filter((e) => e.grupo === el.grupo) });
    } else {
      linhas.push({ tipo: "item", el });
    }
  }

  function Row(el: SceneElement, dentroDeGrupo: boolean) {
    const selected = selectedIds.includes(el.id);
    const Icon = ICON[el.type];
    return (
      <div
        key={el.id}
        draggable
        onDragStart={() => setArrastando(el.id)}
        onDragEnd={() => setArrastando(null)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => soltar(el.id)}
        onClick={(e) => selecionar(el.id, e.shiftKey, !e.shiftKey)}
        className={`group flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1.5 text-sm ${
          dentroDeGrupo ? "ml-3.5 border-l border-border pl-2" : ""
        } ${selected ? "bg-viz/10 text-viz-dark" : "hover:bg-background"} ${arrastando === el.id ? "opacity-40" : ""}`}
      >
        <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-border" />
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={1.8} />
        {editando === el.id ? (
          <input
            autoFocus
            defaultValue={el.nome}
            onClick={(e) => e.stopPropagation()}
            onBlur={(e) => { const v = e.target.value || el.nome; if (v !== el.nome) { useEditor.getState().commit(); patchElemento(el.id, { nome: v }); } setEditando(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            className="flex-1 rounded border border-viz bg-surface px-1 text-[13px] focus:outline-none"
          />
        ) : (
          <span
            onDoubleClick={(e) => { e.stopPropagation(); setEditando(el.id); }}
            className={`flex-1 truncate text-[13px] ${el.visivel ? "" : "text-muted line-through"}`}
          >
            {el.nome}
          </span>
        )}
        <button onClick={(e) => { e.stopPropagation(); toggleBloqueio(el.id); }} title={el.bloqueado ? "Destravar" : "Travar"} className="text-muted hover:text-foreground">
          {el.bloqueado ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100" />}
        </button>
        <button onClick={(e) => { e.stopPropagation(); toggleVisivel(el.id); }} title={el.visivel ? "Ocultar" : "Mostrar"} className="text-muted hover:text-foreground">
          {el.visivel ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        <button onClick={(e) => { e.stopPropagation(); removerElemento(el.id); }} title="Excluir" className="text-muted opacity-0 hover:text-red-600 group-hover:opacity-100">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Camadas</h2>
      <p className="mb-2 text-[11px] text-muted">Arraste para reordenar. Grupos viram pastas.</p>
      <div className="flex flex-col gap-0.5">
        {linhas.map((ln) => {
          if (ln.tipo === "item") return Row(ln.el, false);
          const aberto = !recolhidos.has(ln.grupo);
          const membrosSel = ln.membros.every((m) => selectedIds.includes(m.id)) && selectedIds.length === ln.membros.length;
          const todosVisiveis = ln.membros.every((m) => m.visivel);
          return (
            <div key={ln.grupo} className="flex flex-col gap-0.5">
              <div
                onClick={() => selecionar(ln.membros[0].id)}
                className={`group flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1.5 text-sm ${membrosSel ? "bg-viz/10 text-viz-dark" : "hover:bg-background"}`}
              >
                <button onClick={(e) => { e.stopPropagation(); toggleGrupo(ln.grupo); }} className="shrink-0 text-muted hover:text-foreground">
                  {aberto ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
                <Folder className="h-3.5 w-3.5 shrink-0 text-viz" strokeWidth={1.8} />
                <span className="flex-1 truncate text-[13px] font-medium">Grupo · {ln.membros.length}</span>
                <button onClick={(e) => { e.stopPropagation(); useEditor.getState().commit(); ln.membros.forEach((m) => { if (m.visivel === todosVisiveis) toggleVisivel(m.id); }); }} title={todosVisiveis ? "Ocultar grupo" : "Mostrar grupo"} className="text-muted hover:text-foreground">
                  {todosVisiveis ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>
              </div>
              {aberto && ln.membros.map((m) => Row(m, true))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
