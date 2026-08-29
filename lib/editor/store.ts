import { create } from "zustand";
import type {
  Animacao,
  Binding,
  CardFrame,
  ElementType,
  Estilo,
  Pagina,
  SceneElement,
  Transicao,
  VisualDocument,
} from "./types";
import { criarElemento, criarPagina, documentoInicial, normalizarDoc, TEMA_PADRAO } from "./defaults";
import { PALETA_PADRAO } from "./paletas";
import type { Tema } from "./temas";
import type { BlocoEl } from "./blocos";

const TIPOS_TEXTO = new Set(["texto", "kpi", "badge", "tendencia", "botao"]);
const TEXTO_NU = new Set(["texto", "kpi"]); // texto "nu" sobre o card (recolore p/ contraste)
const novoId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `g-${Date.now()}-${Math.random()}`);

/** Analisa uma cor sólida (#hex / rgb / rgba): luminância 0..1 e se é "neutra" (baixa saturação). */
function analisarCor(cor: string): { lum: number; neutra: boolean } | null {
  if (!cor) return null;
  const c = cor.trim().toLowerCase();
  if (c === "transparent" || c.includes("gradient")) return null;
  let r: number, g: number, b: number;
  const hex = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((x) => x + x).join("");
    r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16);
  } else {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(",").map((x) => parseFloat(x));
    [r, g, b] = p;
    if ([r, g, b].some((v) => v == null || Number.isNaN(v))) return null;
  }
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return { lum, neutra: sat < 0.28 };
}

/** Recolore um texto neutro (branco/preto/cinza) p/ a cor legível do tema; mantém cores de destaque. */
function recolorirTexto(cor: string, t: { corTexto: string; corTextoFraco: string }): string {
  const a = analisarCor(cor);
  if (!a || !a.neutra) return cor;
  if (a.lum >= 0.35 && a.lum <= 0.72) return t.corTextoFraco;
  return t.corTexto;
}

// Componentes cujo ACENTO segue o tema. ACENTO_COR: o acento é o estilo.cor.
// ACENTO_ICONE: o acento é a cor do ícone/medidor (corIcone). Faixas de cor e
// cor condicional (semânticas) NÃO são tocadas.
const ACENTO_COR = new Set(["gauge", "donut", "velocimetro", "progresso", "bullet", "termometro", "waffle", "funil", "timeline", "sparkline", "rating", "pictograma", "icone", "anelKpi", "areaMini", "kpiCompleto"]);
const ACENTO_ICONE = new Set(["cartao", "cardGauge", "comparativo", "chip"]);

/** Cores de acento do tema, a partir da paleta (acento1 = paleta[2], acento2 = paleta[3]). */
function acentosDe(paleta: string[] | undefined): { a1: string; a2: string } {
  const a1 = paleta?.[2] || paleta?.[1] || "#0891B2";
  const a2 = paleta?.[3] || a1;
  return { a1, a2 };
}

/** Recolore o acento de um componente p/ combinar com o tema (alterna acento1/acento2 por índice). */
function recolorirComponente(el: SceneElement, a1: string, a2: string, idx: number): SceneElement {
  const acc = idx % 2 === 0 ? a1 : a2;
  if (ACENTO_COR.has(el.type)) return { ...el, estilo: { ...el.estilo, cor: acc } };
  if (ACENTO_ICONE.has(el.type)) return { ...el, estilo: { ...el.estilo, corIcone: acc } };
  return el;
}
import {
  type Favorito,
  listarFavoritos,
  persistirFavoritos,
  listarRecentes,
  persistirRecentes,
} from "./favoritos";

export type PresetOverride = Partial<
  Omit<SceneElement, "estilo" | "binding">
> & { estilo?: Partial<Estilo>; binding?: Partial<Binding> };

interface EditorState {
  doc: VisualDocument;
  paginaAtiva: number; // índice da página em edição
  selectedId: string | null; // elemento primário (edição single)
  selectedIds: string[]; // seleção múltipla
  savedId: string | null;
  templateId: string | null;
  past: VisualDocument[];
  future: VisualDocument[];

  carregar: (
    doc: VisualDocument,
    ctx?: { savedId?: string | null; templateId?: string | null },
  ) => void;
  commit: () => void;
  undo: () => void;
  redo: () => void;

  // páginas
  setPaginaAtiva: (i: number) => void;
  adicionarPagina: () => void;
  duplicarPagina: () => void;
  removerPagina: (i: number) => void;
  renomearPagina: (i: number, nome: string) => void;
  setTransicao: (patch: Partial<Transicao>) => void;

  parteSel: string; // parte do componente em edição (arco/valor/trilho/faixas/marcador/barra)
  setParte: (p: string) => void;
  selecionar: (id: string | null, add?: boolean, solo?: boolean) => void;
  selecionarTodos: () => void;
  esvaziarPagina: () => void;
  moverDelta: (ids: string[], dx: number, dy: number) => void;
  removerSelecionados: () => void;
  agrupar: () => void;
  desagrupar: () => void;
  alinharSelecao: (modo: "esq" | "centroH" | "dir" | "topo" | "centroV" | "base") => void;
  distribuir: (eixo: "h" | "v") => void;
  setNome: (nome: string) => void;
  atualizarCard: (patch: Partial<CardFrame>) => void;

  adicionar: (type: ElementType) => void;
  adicionarPreset: (base: ElementType, override: PresetOverride) => void;
  adicionarBloco: (elementos: BlocoEl[]) => void;
  removerSelecionado: () => void;
  duplicarSelecionado: () => void;
  duplicarEl: (id: string) => void; // duplica na mesma posição e seleciona a cópia (Alt+arrastar)
  removerElemento: (id: string) => void;

  mover: (id: string, x: number, y: number) => void;
  redimensionar: (id: string, box: { x: number; y: number; w: number; h: number }) => void;

  patchElemento: (id: string, patch: Partial<SceneElement>) => void;
  patchEstilo: (id: string, patch: Partial<Estilo>) => void;
  patchBinding: (id: string, patch: Partial<Binding>) => void;
  patchAnimacao: (id: string, patch: Partial<Animacao>) => void;
  toggleVisivel: (id: string) => void;
  toggleBloqueio: (id: string) => void;
  reordenar: (id: string, direcao: "subir" | "descer") => void;
  moverCamada: (id: string, paraIndex: number) => void;
  setOrdem: (ids: string[]) => void;

  setPaleta: (cores: string[]) => void;
  aplicarPaletaCard: () => void;
  alinhar: (id: string, modo: "esq" | "centroH" | "dir" | "topo" | "centroV" | "base") => void;
  zOrder: (id: string, modo: "frente" | "tras") => void;

  coresRecentes: string[];
  addCorRecente: (c: string) => void;
  estiloCopiado: Estilo | null;
  copiarEstilo: (id: string) => void;
  colarEstilo: (id: string) => void;

  aplicarTema: (t: Tema) => void;
  setTema: (patch: Partial<VisualDocument["tema"]>) => void;
  aplicarFonteATodos: () => void;
  adicionarTexto: (papel: "titulo" | "subtitulo" | "corpo" | "legenda") => void;

  favoritos: Favorito[];
  carregarLocais: () => void;
  salvarFavorito: (nome: string, el: SceneElement) => void;
  removerFavorito: (favId: string) => void;
  adicionarFavorito: (fav: Favorito) => void;

  recentes: string[];
  registrarRecente: (rotulo: string) => void;

  elementoCopiado: SceneElement | null;
  copiarElemento: (id: string) => void;
  colarElemento: () => void;
}

// índice de página em edição, sempre dentro do intervalo válido
function idxDe(s: EditorState): number {
  return Math.min(Math.max(0, s.paginaAtiva), s.doc.paginas.length - 1);
}

/** Elementos da página ativa (estado seguro para os componentes). */
export function elementosAtivos(s: EditorState): SceneElement[] {
  return s.doc.paginas[idxDe(s)]?.elements ?? [];
}

/** Retorna um novo doc com os elementos da página ativa transformados por fn. */
function comEls(s: EditorState, fn: (els: SceneElement[]) => SceneElement[]): VisualDocument {
  const i = idxDe(s);
  return {
    ...s.doc,
    paginas: s.doc.paginas.map((p, k) => (k === i ? { ...p, elements: fn(p.elements) } : p)),
  };
}

function mapEl(
  els: SceneElement[],
  id: string,
  fn: (el: SceneElement) => SceneElement,
): SceneElement[] {
  return els.map((el) => (el.id === id ? fn(el) : el));
}

/** Clona uma página com novos ids (elementos e grupos remapeados). */
function clonarPagina(p: Pagina, nome: string): Pagina {
  const mapaGrupo = new Map<string, string>();
  const elements = p.elements.map((e) => {
    const base = criarElemento(e.type, e.x, e.y);
    let grupo = e.grupo;
    if (grupo) {
      if (!mapaGrupo.has(grupo)) mapaGrupo.set(grupo, novoId());
      grupo = mapaGrupo.get(grupo);
    }
    return { ...JSON.parse(JSON.stringify(e)), id: base.id, grupo } as SceneElement;
  });
  return criarPagina(nome, elements);
}

const MAX_PAGINAS = 2; // front/verso

export const useEditor = create<EditorState>((set, get) => {
  // marca um ponto de histórico (chamado antes de mutações discretas)
  const snap = () =>
    set((s) => ({ past: [...s.past.slice(-49), s.doc], future: [] }));

  // seleção single (mantém selectedId e selectedIds em sincronia)
  const sel = (id: string | null) => ({ selectedId: id, selectedIds: id ? [id] : [] });

  return {
    doc: documentoInicial(),
    paginaAtiva: 0,
    selectedId: null,
    selectedIds: [],
    savedId: null,
    templateId: null,
    past: [],
    future: [],
    coresRecentes: [],
    estiloCopiado: null,
    favoritos: [],
    recentes: [],
    elementoCopiado: null,

    carregar: (doc, ctx) =>
      set({
        doc: normalizarDoc(doc),
        paginaAtiva: 0,
        selectedId: null,
        selectedIds: [],
        savedId: ctx?.savedId ?? null,
        templateId: ctx?.templateId ?? null,
        past: [],
        future: [],
      }),

    commit: () => snap(),

    undo: () =>
      set((s) => {
        if (!s.past.length) return s;
        const prev = s.past[s.past.length - 1];
        return {
          doc: prev,
          paginaAtiva: Math.min(s.paginaAtiva, prev.paginas.length - 1),
          past: s.past.slice(0, -1),
          future: [s.doc, ...s.future].slice(0, 50),
          selectedId: null,
          selectedIds: [],
        };
      }),

    redo: () =>
      set((s) => {
        if (!s.future.length) return s;
        const next = s.future[0];
        return {
          doc: next,
          paginaAtiva: Math.min(s.paginaAtiva, next.paginas.length - 1),
          future: s.future.slice(1),
          past: [...s.past, s.doc].slice(-50),
          selectedId: null,
          selectedIds: [],
        };
      }),

    // ───────── páginas ─────────
    setPaginaAtiva: (i) =>
      set((s) => ({ paginaAtiva: Math.min(Math.max(0, i), s.doc.paginas.length - 1), selectedId: null, selectedIds: [] })),

    adicionarPagina: () => {
      if (get().doc.paginas.length >= MAX_PAGINAS) return;
      snap();
      set((s) => {
        const nova = criarPagina(`Página ${s.doc.paginas.length + 1}`);
        return { doc: { ...s.doc, paginas: [...s.doc.paginas, nova] }, paginaAtiva: s.doc.paginas.length, selectedId: null, selectedIds: [] };
      });
    },

    duplicarPagina: () => {
      if (get().doc.paginas.length >= MAX_PAGINAS) return;
      snap();
      set((s) => {
        const i = idxDe(s);
        const copia = clonarPagina(s.doc.paginas[i], `${s.doc.paginas[i].nome} (cópia)`);
        const paginas = [...s.doc.paginas];
        paginas.splice(i + 1, 0, copia);
        return { doc: { ...s.doc, paginas }, paginaAtiva: i + 1, selectedId: null, selectedIds: [] };
      });
    },

    removerPagina: (i) => {
      snap();
      set((s) => {
        if (s.doc.paginas.length <= 1) return s;
        const paginas = s.doc.paginas.filter((_, k) => k !== i);
        return { doc: { ...s.doc, paginas }, paginaAtiva: Math.min(s.paginaAtiva, paginas.length - 1), selectedId: null, selectedIds: [] };
      });
    },

    renomearPagina: (i, nome) => {
      snap();
      set((s) => ({ doc: { ...s.doc, paginas: s.doc.paginas.map((p, k) => (k === i ? { ...p, nome } : p)) } }));
    },

    setTransicao: (patch) => {
      snap();
      set((s) => ({ doc: { ...s.doc, transicao: { ...s.doc.transicao, ...patch } } }));
    },

    selecionar: (id, add = false, solo = false) =>
      set((s) => {
        if (!id) return { selectedId: null, selectedIds: [] };
        const els = elementosAtivos(s);
        if (add) {
          const ja = s.selectedIds.includes(id);
          const ids = ja ? s.selectedIds.filter((x) => x !== id) : [...s.selectedIds, id];
          return { selectedIds: ids, selectedId: ids[ids.length - 1] ?? null };
        }
        // seleção de grupo: clicar num elemento agrupado seleciona o grupo todo
        // (a menos que solo=true — usado pelas Camadas p/ editar 1 item do grupo)
        const el = els.find((e) => e.id === id);
        if (el?.grupo && !solo) {
          const ids = els.filter((e) => e.grupo === el.grupo).map((e) => e.id);
          return { selectedIds: ids, selectedId: id };
        }
        return { selectedId: id, selectedIds: [id] };
      }),

    parteSel: "",
    setParte: (p) => set({ parteSel: p }),

    selecionarTodos: () =>
      set((s) => {
        const ids = elementosAtivos(s).filter((e) => e.visivel).map((e) => e.id);
        return { selectedIds: ids, selectedId: ids[ids.length - 1] ?? null };
      }),

    esvaziarPagina: () => {
      snap();
      set((s) => ({ doc: comEls(s, () => []), selectedId: null, selectedIds: [] }));
    },

    moverDelta: (ids, dx, dy) =>
      set((s) => {
        const card = s.doc.card;
        const set2 = new Set(ids);
        return {
          doc: comEls(s, (els) =>
            els.map((e) =>
              set2.has(e.id)
                ? {
                    ...e,
                    x: Math.max(0, Math.min(card.w - e.w, e.x + dx)),
                    y: Math.max(0, Math.min(card.h - e.h, e.y + dy)),
                  }
                : e,
            ),
          ),
        };
      }),

    removerSelecionados: () => {
      snap();
      set((s) => {
        const ids = new Set(s.selectedIds.length ? s.selectedIds : s.selectedId ? [s.selectedId] : []);
        if (!ids.size) return s;
        return { doc: comEls(s, (els) => els.filter((e) => !ids.has(e.id))), selectedId: null, selectedIds: [] };
      });
    },

    agrupar: () => {
      snap();
      set((s) => {
        if (s.selectedIds.length < 2) return s;
        const g = novoId();
        const set2 = new Set(s.selectedIds);
        return { doc: comEls(s, (els) => els.map((e) => (set2.has(e.id) ? { ...e, grupo: g } : e))) };
      });
    },

    desagrupar: () => {
      snap();
      set((s) => {
        const set2 = new Set(s.selectedIds.length ? s.selectedIds : s.selectedId ? [s.selectedId] : []);
        return { doc: comEls(s, (els) => els.map((e) => (set2.has(e.id) ? { ...e, grupo: undefined } : e))) };
      });
    },

    alinharSelecao: (modo) => {
      snap();
      set((s) => {
        const set2 = new Set(s.selectedIds.length ? s.selectedIds : s.selectedId ? [s.selectedId] : []);
        const card = s.doc.card;
        return {
          doc: comEls(s, (els) =>
            els.map((e) => {
              if (!set2.has(e.id)) return e;
              if (modo === "esq") return { ...e, x: 0 };
              if (modo === "centroH") return { ...e, x: Math.round((card.w - e.w) / 2) };
              if (modo === "dir") return { ...e, x: card.w - e.w };
              if (modo === "topo") return { ...e, y: 0 };
              if (modo === "centroV") return { ...e, y: Math.round((card.h - e.h) / 2) };
              return { ...e, y: card.h - e.h };
            }),
          ),
        };
      });
    },

    // distribui o espaço entre os selecionados igualmente (>= 3)
    distribuir: (eixo) => {
      snap();
      set((s) => {
        const ids = s.selectedIds;
        if (ids.length < 3) return s;
        const set2 = new Set(ids);
        const sel = elementosAtivos(s).filter((e) => set2.has(e.id));
        const k: "x" | "y" = eixo === "h" ? "x" : "y";
        const tam: "w" | "h" = eixo === "h" ? "w" : "h";
        const ordenados = [...sel].sort((a, b) => a[k] - b[k]);
        const ini = ordenados[0][k];
        const fim = ordenados[ordenados.length - 1][k] + ordenados[ordenados.length - 1][tam];
        const somaTam = ordenados.reduce((acc, e) => acc + e[tam], 0);
        const vao = (fim - ini - somaTam) / (ordenados.length - 1);
        const pos = new Map<string, number>();
        let cursor = ini;
        ordenados.forEach((e) => { pos.set(e.id, Math.round(cursor)); cursor += e[tam] + vao; });
        return { doc: comEls(s, (els) => els.map((e) => (pos.has(e.id) ? { ...e, [k]: pos.get(e.id)! } : e))) };
      });
    },

    setNome: (nome) => set((s) => ({ doc: { ...s.doc, nome } })),

    atualizarCard: (patch) => {
      snap();
      set((s) => ({ doc: { ...s.doc, card: { ...s.doc.card, ...patch } } }));
    },

    adicionar: (type) => {
      snap();
      set((s) => {
        const el = criarElemento(type, 28, 28);
        if (TIPOS_TEXTO.has(type) && s.doc.tema.fonte) el.estilo.fontFamily = s.doc.tema.fonte;
        if (TEXTO_NU.has(type)) el.estilo.cor = recolorirTexto(el.estilo.cor, s.doc.tema);
        const { a1 } = acentosDe(s.doc.paleta);
        if (ACENTO_COR.has(type)) el.estilo.cor = a1;
        if (ACENTO_ICONE.has(type)) el.estilo.corIcone = a1;
        return { doc: comEls(s, (els) => [...els, el]), ...sel(el.id) };
      });
    },

    adicionarPreset: (base, override) => {
      snap();
      set((s) => {
        const el = criarElemento(base, 28, 28);
        const merged: SceneElement = {
          ...el,
          ...override,
          estilo: { ...el.estilo, ...(override.estilo ?? {}) },
          binding: { ...el.binding, ...(override.binding ?? {}) },
        };
        if (TIPOS_TEXTO.has(base) && s.doc.tema.fonte && !override.estilo?.fontFamily) {
          merged.estilo.fontFamily = s.doc.tema.fonte;
        }
        if (TEXTO_NU.has(base) && !override.estilo?.cor) {
          merged.estilo.cor = recolorirTexto(merged.estilo.cor, s.doc.tema);
        }
        const { a1 } = acentosDe(s.doc.paleta);
        if (ACENTO_COR.has(base) && !override.estilo?.cor) merged.estilo.cor = a1;
        if (ACENTO_ICONE.has(base) && !override.estilo?.corIcone) merged.estilo.corIcone = a1;
        return { doc: comEls(s, (els) => [...els, merged]), ...sel(merged.id) };
      });
    },

    adicionarBloco: (elementos) => {
      snap();
      set((s) => {
        const g = novoId();
        const { a1, a2 } = acentosDe(s.doc.paleta);
        let acc = 0;
        const novos: SceneElement[] = elementos.map((spec) => {
          const el = criarElemento(spec.type, 28 + spec.x, 28 + spec.y);
          el.w = spec.w;
          el.h = spec.h;
          el.grupo = g;
          if (spec.estilo) el.estilo = { ...el.estilo, ...spec.estilo };
          if (spec.binding) el.binding = { ...el.binding, ...spec.binding };
          if (spec.direcao) el.direcao = spec.direcao;
          if (spec.iconeNome) el.iconeNome = spec.iconeNome;
          if (spec.titulo !== undefined) el.titulo = spec.titulo;
          if (spec.formato) el.formato = spec.formato;
          if (spec.medidas) el.medidas = spec.medidas.map((m) => ({ ...m, binding: { ...m.binding } }));
          if (TIPOS_TEXTO.has(spec.type) && s.doc.tema.fonte && !spec.estilo?.fontFamily) {
            el.estilo.fontFamily = s.doc.tema.fonte;
          }
          // combina com o tema: recolore texto neutro e acento dos componentes
          if (TIPOS_TEXTO.has(spec.type)) el.estilo.cor = recolorirTexto(el.estilo.cor, s.doc.tema);
          if (ACENTO_COR.has(spec.type)) el.estilo.cor = acc++ % 2 === 0 ? a1 : a2;
          else if (ACENTO_ICONE.has(spec.type)) el.estilo.corIcone = a1;
          return el;
        });
        const ids = novos.map((e) => e.id);
        return { doc: comEls(s, (els) => [...els, ...novos]), selectedIds: ids, selectedId: ids[ids.length - 1] ?? null };
      });
    },

    removerSelecionado: () => {
      snap();
      set((s) => {
        if (!s.selectedId) return s;
        const alvo = s.selectedId;
        return { doc: comEls(s, (els) => els.filter((e) => e.id !== alvo)), selectedId: null, selectedIds: [] };
      });
    },

    duplicarSelecionado: () => {
      snap();
      set((s) => {
        const orig = elementosAtivos(s).find((e) => e.id === s.selectedId);
        if (!orig) return s;
        const copia = criarElemento(orig.type, orig.x + 16, orig.y + 16);
        // cópia de elemento único sai do grupo do original (evita seleção confusa)
        const novo: SceneElement = { ...orig, id: copia.id, x: copia.x, y: copia.y, nome: orig.nome + "Copia", grupo: undefined };
        return { doc: comEls(s, (els) => [...els, novo]), ...sel(novo.id) };
      });
    },

    duplicarEl: (id) => {
      snap();
      set((s) => {
        const orig = elementosAtivos(s).find((e) => e.id === id);
        if (!orig) return s;
        const copia = criarElemento(orig.type, orig.x, orig.y);
        // clone profundo na MESMA posição; sai do grupo do original
        const novo: SceneElement = { ...JSON.parse(JSON.stringify(orig)), id: copia.id, nome: orig.nome + " cópia", grupo: undefined };
        return { doc: comEls(s, (els) => [...els, novo]), ...sel(novo.id) };
      });
    },

    removerElemento: (id) => {
      snap();
      set((s) => ({
        doc: comEls(s, (els) => els.filter((e) => e.id !== id)),
        selectedId: s.selectedId === id ? null : s.selectedId,
        selectedIds: s.selectedIds.filter((x) => x !== id),
      }));
    },

    mover: (id, x, y) =>
      set((s) => ({ doc: comEls(s, (els) => mapEl(els, id, (e) => ({ ...e, x, y }))) })),

    redimensionar: (id, box) =>
      set((s) => ({ doc: comEls(s, (els) => mapEl(els, id, (e) => ({ ...e, ...box }))) })),

    patchElemento: (id, patch) =>
      set((s) => ({ doc: comEls(s, (els) => mapEl(els, id, (e) => ({ ...e, ...patch }))) })),

    patchEstilo: (id, patch) =>
      set((s) => ({ doc: comEls(s, (els) => mapEl(els, id, (e) => ({ ...e, estilo: { ...e.estilo, ...patch } }))) })),

    patchBinding: (id, patch) => {
      snap();
      set((s) => ({ doc: comEls(s, (els) => mapEl(els, id, (e) => ({ ...e, binding: { ...e.binding, ...patch } }))) }));
    },

    patchAnimacao: (id, patch) => {
      snap();
      set((s) => ({ doc: comEls(s, (els) => mapEl(els, id, (e) => ({ ...e, animacao: { ...e.animacao, ...patch } }))) }));
    },

    toggleVisivel: (id) => {
      snap();
      set((s) => ({ doc: comEls(s, (els) => mapEl(els, id, (e) => ({ ...e, visivel: !e.visivel }))) }));
    },

    toggleBloqueio: (id) => {
      snap();
      set((s) => ({ doc: comEls(s, (els) => mapEl(els, id, (e) => ({ ...e, bloqueado: !e.bloqueado }))) }));
    },

    moverCamada: (id, paraIndex) => {
      snap();
      set((s) => ({
        doc: comEls(s, (els0) => {
          const els = [...els0];
          const de = els.findIndex((e) => e.id === id);
          if (de < 0) return els0;
          const [item] = els.splice(de, 1);
          const idx = Math.max(0, Math.min(els.length, paraIndex));
          els.splice(idx, 0, item);
          return els;
        }),
      }));
    },

    setOrdem: (ids) => {
      snap();
      set((s) => ({
        doc: comEls(s, (els) => {
          const porId = new Map(els.map((e) => [e.id, e]));
          const novos = ids.map((id) => porId.get(id)).filter(Boolean) as SceneElement[];
          const faltando = els.filter((e) => !ids.includes(e.id));
          return [...novos, ...faltando];
        }),
      }));
    },

    reordenar: (id, direcao) => {
      snap();
      set((s) => ({
        doc: comEls(s, (els0) => {
          const els = [...els0];
          const i = els.findIndex((e) => e.id === id);
          if (i < 0) return els0;
          const j = direcao === "subir" ? i + 1 : i - 1;
          if (j < 0 || j >= els.length) return els0;
          [els[i], els[j]] = [els[j], els[i]];
          return els;
        }),
      }));
    },

    setPaleta: (cores) => {
      snap();
      set((s) => ({ doc: { ...s.doc, paleta: cores } }));
    },

    aplicarPaletaCard: () => {
      snap();
      set((s) => {
        const p = s.doc.paleta?.length ? s.doc.paleta : ["#0B1220", "#0E5E6F"];
        return {
          doc: { ...s.doc, card: { ...s.doc.card, fundo: `linear-gradient(150deg,${p[0]},${p[1]})` } },
        };
      });
    },

    alinhar: (id, modo) => {
      snap();
      set((s) => {
        const card = s.doc.card;
        return {
          doc: comEls(s, (els) =>
            mapEl(els, id, (e) => {
              if (modo === "esq") return { ...e, x: 0 };
              if (modo === "centroH") return { ...e, x: Math.round((card.w - e.w) / 2) };
              if (modo === "dir") return { ...e, x: card.w - e.w };
              if (modo === "topo") return { ...e, y: 0 };
              if (modo === "centroV") return { ...e, y: Math.round((card.h - e.h) / 2) };
              return { ...e, y: card.h - e.h };
            }),
          ),
        };
      });
    },

    zOrder: (id, modo) => {
      snap();
      set((s) => ({
        doc: comEls(s, (els) => {
          const semId = els.filter((e) => e.id !== id);
          const alvo = els.find((e) => e.id === id);
          if (!alvo) return els;
          return modo === "frente" ? [...semId, alvo] : [alvo, ...semId];
        }),
      }));
    },

    addCorRecente: (c) =>
      set((s) => ({ coresRecentes: [c, ...s.coresRecentes.filter((x) => x !== c)].slice(0, 8) })),

    copiarEstilo: (id) =>
      set((s) => {
        const el = elementosAtivos(s).find((e) => e.id === id);
        return el ? { estiloCopiado: { ...el.estilo } } : s;
      }),

    colarEstilo: (id) => {
      snap();
      set((s) => {
        if (!s.estiloCopiado) return s;
        return { doc: comEls(s, (els) => mapEl(els, id, (e) => ({ ...e, estilo: { ...s.estiloCopiado! } }))) };
      });
    },

    aplicarTema: (t) => {
      snap();
      set((s) => {
        const { a1, a2 } = acentosDe(t.paleta);
        let acc = 0; // conta só os componentes de acento (p/ alternar a1/a2)
        return {
          doc: {
            ...s.doc,
            paleta: [...t.paleta],
            tema: { fonte: t.fonte, tamTitulo: t.tamTitulo, tamSubtitulo: t.tamSubtitulo, tamCorpo: t.tamCorpo, corTexto: t.corTexto, corTextoFraco: t.corTextoFraco },
            card: {
              ...s.doc.card,
              fundo: t.cardFundo,
              borderRadius: t.cardRadius,
              borderWidth: t.cardBorda,
              borderColor: t.cardBordaCor,
              sombra: t.cardSombra,
            },
            // fonte + textos neutros recoloridos p/ legibilidade; acentos dos
            // componentes recoloridos p/ combinar (faixas/cor condicional preservadas)
            paginas: s.doc.paginas.map((p) => ({
              ...p,
              elements: p.elements.map((e) => {
                if (TIPOS_TEXTO.has(e.type)) return { ...e, estilo: { ...e.estilo, fontFamily: t.fonte, cor: recolorirTexto(e.estilo.cor, t) } };
                if (ACENTO_COR.has(e.type) || ACENTO_ICONE.has(e.type)) return recolorirComponente(e, a1, a2, acc++);
                return e;
              }),
            })),
          },
        };
      });
    },

    setTema: (patch) => {
      snap();
      set((s) => ({ doc: { ...s.doc, tema: { ...s.doc.tema, ...patch } } }));
    },

    aplicarFonteATodos: () => {
      snap();
      set((s) => ({
        doc: {
          ...s.doc,
          paginas: s.doc.paginas.map((p) => ({
            ...p,
            elements: p.elements.map((e) =>
              TIPOS_TEXTO.has(e.type) ? { ...e, estilo: { ...e.estilo, fontFamily: s.doc.tema.fonte } } : e,
            ),
          })),
        },
      }));
    },

    adicionarTexto: (papel) => {
      snap();
      set((s) => {
        const t = s.doc.tema;
        const cfg = {
          titulo: { valor: "Título", fontSize: t.tamTitulo, fontWeight: 800, h: t.tamTitulo + 14, cor: t.corTexto },
          subtitulo: { valor: "Subtítulo", fontSize: t.tamSubtitulo, fontWeight: 600, h: t.tamSubtitulo + 12, cor: t.corTextoFraco },
          corpo: { valor: "Texto", fontSize: t.tamCorpo, fontWeight: 600, h: t.tamCorpo + 12, cor: t.corTexto },
          legenda: { valor: "legenda", fontSize: 11, fontWeight: 500, h: 18, cor: t.corTextoFraco },
        }[papel];
        const el = criarElemento("texto", 28, 28);
        el.binding.valor = cfg.valor;
        el.w = 240;
        el.h = cfg.h;
        el.estilo.fontSize = cfg.fontSize;
        el.estilo.fontWeight = cfg.fontWeight;
        el.estilo.fontFamily = t.fonte;
        if (cfg.cor) el.estilo.cor = cfg.cor;
        return { doc: comEls(s, (els) => [...els, el]), ...sel(el.id) };
      });
    },

    carregarLocais: () => set({ favoritos: listarFavoritos(), recentes: listarRecentes() }),

    salvarFavorito: (nome, el) =>
      set((s) => {
        const novoEl = JSON.parse(JSON.stringify(el)) as SceneElement;
        const fav: Favorito = {
          id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `fav-${s.favoritos.length}`,
          nome: nome.trim() || "Componente",
          element: { ...novoEl, x: 24, y: 24 },
        };
        const favs = [fav, ...s.favoritos];
        persistirFavoritos(favs);
        return { favoritos: favs };
      }),

    removerFavorito: (favId) =>
      set((s) => {
        const favs = s.favoritos.filter((f) => f.id !== favId);
        persistirFavoritos(favs);
        return { favoritos: favs };
      }),

    adicionarFavorito: (fav) => {
      snap();
      set((s) => {
        const base = criarElemento(fav.element.type, 28, 28);
        const novo: SceneElement = { ...JSON.parse(JSON.stringify(fav.element)), id: base.id, x: 28, y: 28 };
        return { doc: comEls(s, (els) => [...els, novo]), ...sel(novo.id) };
      });
    },

    registrarRecente: (rotulo) =>
      set((s) => {
        const rec = [rotulo, ...s.recentes.filter((r) => r !== rotulo)].slice(0, 6);
        persistirRecentes(rec);
        return { recentes: rec };
      }),

    copiarElemento: (id) =>
      set((s) => {
        const el = elementosAtivos(s).find((e) => e.id === id);
        return el ? { elementoCopiado: JSON.parse(JSON.stringify(el)) } : s;
      }),

    colarElemento: () => {
      snap();
      set((s) => {
        if (!s.elementoCopiado) return s;
        const base = criarElemento(s.elementoCopiado.type, 28, 28);
        const novo: SceneElement = {
          ...JSON.parse(JSON.stringify(s.elementoCopiado)),
          id: base.id,
          x: s.elementoCopiado.x + 16,
          y: s.elementoCopiado.y + 16,
          grupo: undefined,
        };
        return { doc: comEls(s, (els) => [...els, novo]), ...sel(novo.id) };
      });
    },
  };
});
