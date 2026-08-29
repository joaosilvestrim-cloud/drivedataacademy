"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Undo2, Redo2, Magnet, Grid3x3, Minus, Plus, Sun, Moon, Eye, Code2, Share2, Save, Ruler, Blocks, Layers as LayersIcon, LayoutTemplate, Monitor } from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import { generateDax } from "@/lib/editor/generateDax";
import { salvarVisual } from "@/app/actions/visuals";
import type { VisualDocument } from "@/lib/editor/types";
import Canvas from "./Canvas";
import PageTabs from "./PageTabs";
import Toolbox from "./Toolbox";
import Layers from "./Layers";
import Properties from "./Properties";
import CodeModal from "./CodeModal";
import VisualizerModal from "./VisualizerModal";
import PublishModal from "./PublishModal";
import TemplateModal from "./TemplateModal";
import StartModal from "./StartModal";

interface Props {
  inicial?: { doc: VisualDocument; savedId?: string | null; templateId?: string | null } | null;
  auth: { logado: boolean; premium: boolean; admin?: boolean };
}

export default function EditorClient({ inicial, auth }: Props) {
  const router = useRouter();
  const nome = useEditor((s) => s.doc.nome);
  const setNome = useEditor((s) => s.setNome);
  const carregar = useEditor((s) => s.carregar);
  const card = useEditor((s) => s.doc.card);
  const atualizarCard = useEditor((s) => s.atualizarCard);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const podeUndo = useEditor((s) => s.past.length > 0);
  const podeRedo = useEditor((s) => s.future.length > 0);

  const [fundo, setFundo] = useState<"claro" | "escuro">("escuro");
  const [snap, setSnap] = useState(false);
  const [grade, setGrade] = useState(false);
  const [zoom, setZoom] = useState(1);
  const areaRef = useRef<HTMLElement>(null);

  // Zoom com Ctrl/⌘ + scroll (listener nao-passivo p/ poder preventDefault).
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const passo = e.deltaY < 0 ? 0.1 : -0.1;
      setZoom((z) => Math.min(3, Math.max(0.25, +(z + passo).toFixed(2))));
    };
    area.addEventListener("wheel", onWheel, { passive: false });
    return () => area.removeEventListener("wheel", onWheel);
  }, []);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [verCodigo, setVerCodigo] = useState(false);
  const [verPreview, setVerPreview] = useState(false);
  const [verPublicar, setVerPublicar] = useState(false);
  const [verTemplate, setVerTemplate] = useState(false);
  const [verStart, setVerStart] = useState(!inicial);
  const [abaEsq, setAbaEsq] = useState<"componentes" | "camadas">("componentes");
  const [naoSalvo, setNaoSalvo] = useState(false);
  const naoSalvoRef = useRef(false);
  naoSalvoRef.current = naoSalvo;

  // Preferências do editor (fundo/snap/grade/zoom) persistidas em localStorage.
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("dd-editor-prefs") || "{}");
      if (p.fundo === "claro" || p.fundo === "escuro") setFundo(p.fundo);
      if (typeof p.snap === "boolean") setSnap(p.snap);
      if (typeof p.grade === "boolean") setGrade(p.grade);
      if (typeof p.zoom === "number" && p.zoom >= 0.25 && p.zoom <= 3) setZoom(p.zoom);
    } catch { /* ignora */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem("dd-editor-prefs", JSON.stringify({ fundo, snap, grade, zoom })); } catch { /* ignora */ }
  }, [fundo, snap, grade, zoom]);

  useEffect(() => {
    useEditor.getState().carregarLocais(); // favoritos + recentes (localStorage)
    if (inicial?.doc) {
      carregar(inicial.doc, { savedId: inicial.savedId ?? null, templateId: inicial.templateId ?? null });
    }
    // marca "não salvo" a cada mudança do doc (após a carga inicial acima)
    let atual = useEditor.getState().doc;
    const unsub = useEditor.subscribe((s) => {
      if (s.doc !== atual) { atual = s.doc; setNaoSalvo(true); }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // avisa antes de fechar/recarregar a aba com trabalho não salvo
  useEffect(() => {
    const aoSair = (e: BeforeUnloadEvent) => {
      if (!naoSalvoRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", aoSair);
    return () => window.removeEventListener("beforeunload", aoSair);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ctrl/⌘+S salva de qualquer lugar (inclusive com foco num input)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        salvar();
        return;
      }
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || t?.isContentEditable) return;
      const st = useEditor.getState();

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        return e.shiftKey ? st.redo() : st.undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        return st.redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (st.selectedId) { e.preventDefault(); st.copiarElemento(st.selectedId); }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        e.preventDefault();
        return st.colarElemento();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g") {
        e.preventDefault();
        return e.shiftKey ? st.desagrupar() : st.agrupar();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        return st.selecionarTodos();
      }
      const id = st.selectedId;
      if (e.key === "Escape") return st.selecionar(null);
      if (!id) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        st.removerSelecionados();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        st.duplicarSelecionado();
      } else if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const passo = e.shiftKey ? 10 : 1;
        let dx = 0, dy = 0;
        if (e.key === "ArrowLeft") dx = -passo;
        if (e.key === "ArrowRight") dx = passo;
        if (e.key === "ArrowUp") dy = -passo;
        if (e.key === "ArrowDown") dy = passo;
        st.moverDelta(st.selectedIds.length ? st.selectedIds : [id], dx, dy);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function salvar() {
    if (!auth.logado) return router.push("/login");
    setSalvando(true);
    setMsg(null);
    const st = useEditor.getState();
    const res = await salvarVisual({ savedId: st.savedId, templateId: st.templateId, nome: st.doc.nome, doc: st.doc, dax: generateDax(st.doc) });
    setSalvando(false);
    if (!res.ok) return setMsg(res.error);
    useEditor.setState({ savedId: res.id });
    setNaoSalvo(false);
    setMsg("Salvo!");
    setTimeout(() => setMsg(null), 2000);
  }

  const ico = "h-4 w-4";
  const tbtn = "flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-background hover:text-foreground";

  return (
    <div className="flex h-[calc(100vh-3.25rem)] flex-col overflow-hidden">
      {/* Aviso: editor é melhor no desktop */}
      <div className="flex items-center gap-2 border-b border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-900 lg:hidden">
        <Monitor className="h-4 w-4 shrink-0 text-amber-600" />
        <span>O editor funciona melhor no computador — no celular o canvas fica limitado.</span>
      </div>
      {/* Barra de controles */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface px-4 py-2">
        <div className="flex items-center gap-2">
          <input value={nome} onChange={(e) => setNome(e.target.value)} aria-label="Nome do visual" className="w-40 rounded-md border border-border bg-surface px-2.5 py-1.5 font-mono text-xs focus:border-viz focus:outline-none" />
          <div className="flex gap-0.5">
            <button onClick={undo} disabled={!podeUndo} title="Desfazer (Ctrl+Z)" aria-label="Desfazer" className={`rounded-md border border-border p-1.5 ${podeUndo ? "text-muted hover:text-foreground" : "text-border"}`}><Undo2 className={ico} /></button>
            <button onClick={redo} disabled={!podeRedo} title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer" className={`rounded-md border border-border p-1.5 ${podeRedo ? "text-muted hover:text-foreground" : "text-border"}`}><Redo2 className={ico} /></button>
          </div>
          <button onClick={() => setSnap((v) => !v)} title="Alinhar à grade" aria-label="Alinhar à grade" aria-pressed={snap} className={`rounded-md border p-1.5 ${snap ? "border-viz bg-viz/10 text-viz-dark" : "border-border text-muted hover:text-foreground"}`}><Magnet className={ico} /></button>
          <button onClick={() => setGrade((v) => !v)} title="Mostrar grade" aria-label="Mostrar grade" aria-pressed={grade} className={`rounded-md border p-1.5 ${grade ? "border-viz bg-viz/10 text-viz-dark" : "border-border text-muted hover:text-foreground"}`}><Grid3x3 className={ico} /></button>
          <div className="flex items-center gap-0.5 rounded-md bg-background p-0.5">
            <button onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)))} aria-label="Diminuir zoom" className="p-1 text-muted hover:text-foreground"><Minus className={ico} /></button>
            <button onClick={() => setZoom(1)} title="Restaurar zoom (100%)" aria-label="Restaurar zoom para 100%" className="w-9 text-center font-mono text-xs text-muted hover:text-foreground">{Math.round(zoom * 100)}%</button>
            <button onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} aria-label="Aumentar zoom" className="p-1 text-muted hover:text-foreground"><Plus className={ico} /></button>
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border px-1.5 py-1">
            <input type="number" value={card.w} onChange={(e) => atualizarCard({ w: Math.max(120, Number(e.target.value) || 0) })} title="Largura do canvas" className="w-12 bg-transparent text-center font-mono text-xs focus:outline-none" />
            <span className="text-[10px] text-muted">×</span>
            <input type="number" value={card.h} onChange={(e) => atualizarCard({ h: Math.max(80, Number(e.target.value) || 0) })} title="Altura do canvas" className="w-12 bg-transparent text-center font-mono text-xs focus:outline-none" />
          </div>
          <button onClick={() => setVerStart(true)} className={tbtn} title="Presets e calculadora"><Ruler className={ico} /></button>
        </div>

        <div className="flex items-center gap-2">
          {msg ? (
            <span className={msg === "Salvo!" ? "text-sm text-viz-dark" : "text-sm text-red-600"}>{msg}</span>
          ) : naoSalvo && auth.logado ? (
            <span className="flex items-center gap-1.5 text-xs text-amber-600" title="Há alterações não salvas">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Não salvo
            </span>
          ) : null}
          <button onClick={() => setFundo((f) => (f === "escuro" ? "claro" : "escuro"))} title="Fundo do canvas" aria-label={`Fundo do canvas (${fundo})`} className="rounded-md border border-border p-1.5 text-muted hover:text-foreground">
            {fundo === "escuro" ? <Moon className={ico} /> : <Sun className={ico} />}
          </button>
          <button onClick={() => setVerPreview(true)} className={tbtn}><Eye className={ico} /> Visualizar</button>
          <button onClick={() => setVerCodigo(true)} className={tbtn}><Code2 className={ico} /> Código</button>
          {auth.premium && (
            <button onClick={() => setVerPublicar(true)} className="flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100">
              <Share2 className={ico} /> Publicar
            </button>
          )}
          {auth.admin && (
            <button onClick={() => setVerTemplate(true)} title="Salvar o visual atual como template (admin)" className="flex items-center gap-1.5 rounded-md border border-viz/40 bg-viz/10 px-2.5 py-1.5 text-xs font-medium text-viz-dark hover:bg-viz/20">
              <LayoutTemplate className={ico} /> Template
            </button>
          )}
          <button onClick={salvar} disabled={salvando} className={`relative flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-60 ${naoSalvo && auth.logado ? "bg-amber-500 hover:bg-amber-600" : "bg-viz hover:bg-viz-dark"}`}>
            <Save className={ico} /> {salvando ? "..." : "Salvar"}
          </button>
        </div>
      </div>

      {/* Corpo: 3 colunas com rolagem interna */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[248px_1fr_324px]">
        <aside className="flex min-h-0 flex-col border-b border-border bg-surface lg:border-b-0 lg:border-r">
          <div className="flex shrink-0 gap-0.5 border-b border-border p-2">
            {([["componentes", Blocks, "Componentes"], ["camadas", LayersIcon, "Camadas"]] as const).map(([k, Ic, lbl]) => (
              <button key={k} onClick={() => setAbaEsq(k)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${abaEsq === k ? "bg-viz/10 text-viz-dark" : "text-muted hover:bg-background hover:text-foreground"}`}>
                <Ic className="h-3.5 w-3.5" /> {lbl}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {abaEsq === "componentes" ? <Toolbox /> : <Layers />}
          </div>
        </aside>

        <section ref={areaRef} className="flex min-h-0 min-w-0 flex-col p-5">
          <Canvas stageBg={fundo} zoom={zoom} snap={snap} grid={grade} />
          <PageTabs />
        </section>

        <aside className="min-h-0 overflow-y-auto border-t border-border bg-surface lg:border-l lg:border-t-0">
          <Properties />
        </aside>
      </div>

      <StartModal open={verStart} onClose={() => setVerStart(false)} />
      <CodeModal open={verCodigo} onClose={() => setVerCodigo(false)} />
      <VisualizerModal open={verPreview} onClose={() => setVerPreview(false)} />
      <PublishModal open={verPublicar} onClose={() => setVerPublicar(false)} />
      <TemplateModal open={verTemplate} onClose={() => setVerTemplate(false)} />
    </div>
  );
}
