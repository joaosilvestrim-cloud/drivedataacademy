import type {
  CardFrame,
  ElementType,
  Estilo,
  Pagina,
  SceneElement,
  TemaDoc,
  Transicao,
  VisualDocument,
} from "./types";
import { PALETA_PADRAO } from "./paletas";

export const TEMA_PADRAO: TemaDoc = {
  fonte: "",
  tamTitulo: 26,
  tamSubtitulo: 16,
  tamCorpo: 14,
  corTexto: "#F8FAFC",
  corTextoFraco: "#94A3B8",
};

const BRAND = "#06B6D4";

function estiloBase(over: Partial<Estilo> = {}): Estilo {
  return {
    cor: "#ffffff",
    fundo: "transparent",
    borderColor: "#ffffff",
    borderWidth: 0,
    borderRadius: 0,
    sombra: 0,
    opacidade: 1,
    fontSize: 16,
    fontWeight: 600,
    fontFamily: "",
    uppercase: false,
    letterSpacing: 0,
    glow: 0,
    rotation: 0,
    borderStyle: "solid",
    animarFill: true,
    lineHeight: 1.15,
    padding: 0,
    sombraColor: "rgba(0,0,0,.35)",
    align: "left",
    alignV: "center",
    ...over,
  };
}

interface DefaultsPorTipo {
  nome: string;
  w: number;
  h: number;
  valor: string;
  ref: string;
  dinamico: boolean;
  estilo: Partial<Estilo>;
}

export const DEFAULTS: Record<ElementType, DefaultsPorTipo> = {
  texto: {
    nome: "Titulo",
    w: 200,
    h: 28,
    valor: "FATURAMENTO",
    ref: "[Titulo]",
    dinamico: false,
    estilo: { fontSize: 13, fontWeight: 600, cor: "rgba(255,255,255,.8)" },
  },
  kpi: {
    nome: "Valor",
    w: 220,
    h: 44,
    valor: "R$ 1.245.890",
    ref: "[Faturamento]",
    dinamico: true,
    estilo: { fontSize: 34, fontWeight: 800, cor: "#ffffff" },
  },
  forma: {
    nome: "Forma",
    w: 280,
    h: 140,
    valor: "",
    ref: "",
    dinamico: false,
    estilo: {
      fundo: "rgba(255,255,255,.06)",
      borderColor: BRAND,
      borderWidth: 1,
      borderRadius: 18,
    },
  },
  icone: {
    nome: "Icone",
    w: 44,
    h: 44,
    valor: "dollar",
    ref: "",
    dinamico: false,
    estilo: {
      cor: "#06B6D4",
      fontSize: 22,
      fundo: "rgba(6,182,212,.16)",
      borderRadius: 12,
      align: "center",
    },
  },
  linha: {
    nome: "Linha",
    w: 240,
    h: 2,
    valor: "",
    ref: "",
    dinamico: false,
    estilo: { fundo: "rgba(255,255,255,.25)", borderRadius: 2 },
  },
  progresso: {
    nome: "Progresso",
    w: 240,
    h: 12,
    valor: "72",
    ref: "[Atingimento %]",
    dinamico: false,
    estilo: {
      cor: "#06B6D4", // preenchimento
      fundo: "rgba(255,255,255,.12)", // trilho
      borderRadius: 8,
    },
  },
  imagem: {
    nome: "Imagem",
    w: 160,
    h: 60,
    valor: "/logo.png",
    ref: "[URL_Imagem]",
    dinamico: false,
    estilo: { borderRadius: 8 },
  },
  gauge: {
    nome: "Gauge",
    w: 132,
    h: 84,
    valor: "72",
    ref: "[Atingimento %]",
    dinamico: false,
    estilo: { cor: "#06B6D4", fundo: "rgba(255,255,255,.14)", fontSize: 20, fontWeight: 800, align: "center" },
  },
  tendencia: {
    nome: "Tendencia",
    w: 110,
    h: 28,
    valor: "15,4%",
    ref: "[Variação %]",
    dinamico: true,
    estilo: { cor: "#22C55E", fontSize: 16, fontWeight: 700, align: "left" },
  },
  badge: {
    nome: "Badge",
    w: 96,
    h: 26,
    valor: "ATIVO",
    ref: "[Status]",
    dinamico: false,
    estilo: {
      cor: "#0f172a",
      fundo: "rgba(6,182,212,.18)",
      fontSize: 11,
      fontWeight: 700,
      borderRadius: 999,
      align: "center",
      uppercase: true,
    },
  },
  botao: {
    nome: "Botao",
    w: 150,
    h: 40,
    valor: "Abrir relatório",
    ref: "[Texto]",
    dinamico: false,
    estilo: { cor: "#ffffff", fundo: "#0891B2", fontSize: 14, fontWeight: 600, borderRadius: 10, align: "center" },
  },
  pictograma: {
    nome: "Pictograma",
    w: 200,
    h: 30,
    valor: "70",
    ref: "[Atingimento %]",
    dinamico: false,
    estilo: { cor: "#06B6D4", fundo: "transparent", align: "left" },
  },
  tabela: {
    nome: "Tabela",
    w: 320,
    h: 160,
    valor: "",
    ref: "",
    dinamico: false,
    estilo: { cor: "#e2e8f0", fundo: "rgba(255,255,255,.04)", fontSize: 12, borderRadius: 10 },
  },
  rating: {
    nome: "Rating",
    w: 140,
    h: 28,
    valor: "4",
    ref: "[Nota]",
    dinamico: false,
    estilo: { cor: "#FBBF24", fundo: "transparent", align: "left" },
  },
  sparkline: {
    nome: "Sparkline",
    w: 160,
    h: 48,
    valor: "",
    ref: "Vendas[Valor]",
    dinamico: false,
    estilo: { cor: "#06B6D4", fundo: "transparent", borderRadius: 2 },
  },
  lista: {
    nome: "Lista",
    w: 240,
    h: 110,
    valor: "",
    ref: "",
    dinamico: false,
    estilo: { cor: "#e2e8f0", fundo: "transparent", fontSize: 14, fontWeight: 500 },
  },
  divisorRotulo: {
    nome: "Divisor",
    w: 260,
    h: 24,
    valor: "RESUMO",
    ref: "",
    dinamico: false,
    estilo: { cor: "#94A3B8", fundo: "transparent", borderColor: "rgba(148,163,184,.4)", fontSize: 11, fontWeight: 700, uppercase: true, letterSpacing: 1, align: "center" },
  },
  velocimetro: {
    nome: "Velocimetro",
    w: 140,
    h: 120,
    valor: "750",
    ref: "[Valor]",
    dinamico: true,
    estilo: { cor: "#F59E0B", fundo: "rgba(148,163,184,.25)", fontSize: 18, fontWeight: 800, align: "center" },
  },
  bullet: {
    nome: "Bullet",
    w: 260,
    h: 26,
    valor: "550",
    ref: "[Valor]",
    dinamico: false,
    estilo: { cor: "#F97316", fundo: "rgba(148,163,184,.2)", borderRadius: 6 },
  },
  termometro: {
    nome: "Termometro",
    w: 40,
    h: 140,
    valor: "76",
    ref: "[Valor]",
    dinamico: false,
    estilo: { cor: "#22C55E", fundo: "rgba(148,163,184,.2)", borderRadius: 10 },
  },
  donut: {
    nome: "Donut",
    w: 96,
    h: 96,
    valor: "72",
    ref: "[Atingimento %]",
    dinamico: false,
    estilo: { cor: "#06B6D4", fundo: "rgba(148,163,184,.2)", fontSize: 20, fontWeight: 800, align: "center" },
  },
  cartao: {
    nome: "Cartao",
    w: 250,
    h: 118,
    valor: "R$ 1.245.890",
    ref: "[Faturamento]",
    dinamico: true,
    estilo: { cor: "#ffffff", fundo: "rgba(255,255,255,.06)", borderColor: "#06B6D4", borderWidth: 1, borderRadius: 16, fontSize: 30, fontWeight: 800, corTitulo: "#94A3B8", corIcone: "#06B6D4" },
  },
  cardGauge: {
    nome: "CardGauge",
    w: 268,
    h: 120,
    valor: "72",
    ref: "[Atingimento %]",
    dinamico: true,
    estilo: { cor: "#ffffff", fundo: "rgba(255,255,255,.06)", borderColor: "#06B6D4", borderWidth: 1, borderRadius: 16, fontSize: 32, fontWeight: 800, corTitulo: "#94A3B8", corIcone: "#06B6D4", espessura: 4 },
  },
  narrativo: {
    nome: "Texto narrativo",
    w: 280,
    h: 96,
    valor: "As vendas somaram {vendas} neste mês, {cresc} acima do período anterior.",
    ref: "",
    dinamico: false,
    estilo: { cor: "rgba(255,255,255,.85)", fontSize: 15, fontWeight: 500, align: "left", lineHeight: 1.5 },
  },
  comparativo: {
    nome: "Comparativo",
    w: 268,
    h: 130,
    valor: "R$ 1.245.890",
    ref: "[Faturamento]",
    dinamico: true,
    estilo: { cor: "#ffffff", fundo: "rgba(255,255,255,.06)", borderColor: "#06B6D4", borderWidth: 1, borderRadius: 16, fontSize: 30, fontWeight: 800, corTitulo: "#94A3B8", corValor: "#ffffff", corIcone: "#06B6D4" },
  },
  chip: {
    nome: "Chip de métrica",
    w: 168,
    h: 44,
    valor: "1.245",
    ref: "[Vendas]",
    dinamico: true,
    estilo: { cor: "#ffffff", fundo: "rgba(6,182,212,.14)", borderRadius: 999, fontSize: 17, fontWeight: 800, align: "left", corTitulo: "#94A3B8", corIcone: "#06B6D4" },
  },
  filtros: {
    nome: "Filtros aplicados",
    w: 300,
    h: 74,
    valor: "",
    ref: "",
    dinamico: false,
    estilo: { cor: "#E2E8F0", fundo: "transparent", borderRadius: 999, fontSize: 12, fontWeight: 600, align: "left", corTitulo: "#94A3B8" },
  },
  funil: {
    nome: "Funil",
    w: 260,
    h: 156,
    valor: "",
    ref: "",
    dinamico: false,
    estilo: { cor: "#06B6D4", fundo: "rgba(148,163,184,.16)", borderRadius: 6, fontSize: 12, fontWeight: 700, align: "center", corValor: "#ffffff" },
  },
  waffle: {
    nome: "Waffle",
    w: 132,
    h: 132,
    valor: "72",
    ref: "[Atingimento %]",
    dinamico: true,
    estilo: { cor: "#06B6D4", fundo: "rgba(148,163,184,.22)", borderRadius: 3, fontSize: 12, fontWeight: 700, align: "center" },
  },
  timeline: {
    nome: "Timeline",
    w: 320,
    h: 92,
    valor: "",
    ref: "",
    dinamico: false,
    estilo: { cor: "#06B6D4", fundo: "rgba(148,163,184,.25)", borderRadius: 999, fontSize: 12, fontWeight: 600, align: "center", corTitulo: "#94A3B8", corValor: "#ffffff" },
  },
  kpiCompleto: {
    nome: "KPI completo",
    w: 232,
    h: 124,
    valor: "R$ 1.245.890",
    ref: "[Faturamento]",
    dinamico: true,
    estilo: { cor: "#06B6D4", fundo: "rgba(255,255,255,.06)", borderColor: "#06B6D4", borderWidth: 1, borderRadius: 16, fontSize: 27, fontWeight: 800, corTitulo: "#94A3B8", corValor: "#ffffff" },
  },
  areaMini: {
    nome: "Mini linha",
    w: 180,
    h: 64,
    valor: "",
    ref: "",
    dinamico: false,
    estilo: { cor: "#06B6D4", fundo: "transparent", borderRadius: 2, fontSize: 12, fontWeight: 600 },
  },
  anelKpi: {
    nome: "Anel KPI",
    w: 120,
    h: 120,
    valor: "72",
    ref: "[Atingimento %]",
    dinamico: true,
    estilo: { cor: "#06B6D4", fundo: "rgba(148,163,184,.2)", borderRadius: 6, fontSize: 26, fontWeight: 800, corValor: "#ffffff", corTitulo: "#94A3B8", espessura: 4 },
  },
  comparaAB: {
    nome: "Comparativo A/B",
    w: 262,
    h: 98,
    valor: "R$ 12k",
    ref: "[Atual]",
    dinamico: true,
    estilo: { cor: "#06B6D4", fundo: "rgba(255,255,255,.06)", borderColor: "#06B6D4", borderWidth: 1, borderRadius: 16, fontSize: 24, fontWeight: 800, corTitulo: "#94A3B8", corValor: "#ffffff" },
  },
};

let seq = 0;
function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  seq += 1;
  return `el-${seq}`;
}

/** Cria um elemento do tipo dado, posicionado em (x,y). */
export function criarElemento(type: ElementType, x = 24, y = 24): SceneElement {
  const d = DEFAULTS[type];
  return {
    id: uid(),
    type,
    nome: d.nome,
    x,
    y,
    w: d.w,
    h: d.h,
    visivel: true,
    direcao: type === "tendencia" || type === "kpiCompleto" ? "up" : undefined,
    contain: type === "imagem" ? true : undefined,
    href: type === "botao" ? "https://academy.drivedata.com.br" : undefined,
    quantidade: type === "pictograma" ? 10 : type === "rating" ? 5 : undefined,
    iconeNome: type === "pictograma" ? "users" : type === "lista" ? "check" : type === "cartao" ? "dollar" : type === "chip" ? "flame" : undefined,
    titulo: type === "cartao" ? "FATURAMENTO" : type === "cardGauge" ? "ATINGIMENTO" : type === "comparativo" ? "FATURAMENTO vs META" : type === "chip" ? "vendas" : type === "kpiCompleto" ? "FATURAMENTO" : type === "anelKpi" ? "Meta" : type === "comparaAB" ? "Atual" : undefined,
    medidas:
      type === "narrativo"
        ? [
            { chave: "vendas", rotulo: "Vendas", binding: { dinamico: true, valor: "R$ 1,2 mi", ref: "[Vendas]" } },
            { chave: "cresc", rotulo: "Crescimento", binding: { dinamico: true, valor: "12%", ref: "[Crescimento %]" } },
          ]
        : type === "comparativo"
          ? [
              { chave: "meta", rotulo: "Meta", binding: { dinamico: true, valor: "R$ 1.500.000", ref: "[Meta Faturamento]" } },
              { chave: "pct", rotulo: "Atingimento %", binding: { dinamico: true, valor: "83", ref: "[Atingimento %]" } },
            ]
          : type === "filtros"
            ? [
                { chave: "f1", rotulo: "Região", binding: { dinamico: true, valor: "Sul", ref: "[Região selecionada]" } },
                { chave: "f2", rotulo: "Ano", binding: { dinamico: true, valor: "2025", ref: "[Ano selecionado]" } },
              ]
            : type === "kpiCompleto"
              ? [{ chave: "var", rotulo: "Variação", binding: { dinamico: true, valor: "+15,4%", ref: "[Variação %]" } }]
              : type === "comparaAB"
                ? [{ chave: "b", rotulo: "Anterior", binding: { dinamico: true, valor: "R$ 10k", ref: "[Anterior]" } }]
                : undefined,
    barras: type === "sparkline" ? [40, 65, 30, 80, 55, 70] : type === "kpiCompleto" ? [40, 60, 45, 70, 55, 80, 65] : type === "areaMini" ? [30, 50, 40, 65, 55, 78, 60, 88] : undefined,
    itens: type === "lista" ? ["Primeiro item", "Segundo item", "Terceiro item"] : type === "timeline" ? ["Início", "Análise", "Execução", "Entrega"] : undefined,
    etapas: type === "funil" ? [{ rotulo: "Visitantes", valor: 1000 }, { rotulo: "Leads", valor: 600 }, { rotulo: "Oportunidades", valor: 300 }, { rotulo: "Clientes", valor: 120 }] : undefined,
    orientacao: type === "timeline" ? "h" : undefined,
    maximo: type === "velocimetro" || type === "bullet" ? 1000 : type === "termometro" ? 100 : undefined,
    faixas:
      type === "velocimetro"
        ? [{ ate: 333, cor: "#22C55E" }, { ate: 666, cor: "#F59E0B" }, { ate: 1000, cor: "#EF4444" }]
        : type === "termometro"
          ? [{ ate: 33, cor: "#EF4444" }, { ate: 66, cor: "#F59E0B" }, { ate: 100, cor: "#22C55E" }]
          : undefined,
    tabela: type === "tabela" || type === "sparkline" ? "Vendas" : undefined,
    colunas:
      type === "tabela"
        ? [
            { coluna: "Vendas[Produto]", rotulo: "Produto" },
            { coluna: "Vendas[Total]", rotulo: "Total" },
          ]
        : undefined,
    binding: { dinamico: d.dinamico, valor: d.valor, ref: d.ref },
    estilo: estiloBase(d.estilo),
    animacao: { tipo: "none", duracao: 0.6, delay: 0 },
  };
}

export function cardPadrao(): CardFrame {
  return {
    w: 320,
    h: 188,
    fundo: "linear-gradient(150deg,#12161D,#080A0E)",
    borderRadius: 20,
    borderColor: "#06B6D4",
    borderWidth: 0,
    sombra: 0,
  };
}

export const TRANSICAO_PADRAO: Transicao = {
  tipo: "none",
  duracao: 0.7,
  intervalo: 4,
  auto: false,
};

let seqPag = 0;
function uidPag(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  seqPag += 1;
  return `pag-${seqPag}`;
}

/** Cria uma página vazia com um nome. */
export function criarPagina(nome: string, elements: SceneElement[] = []): Pagina {
  return { id: uidPag(), nome, elements };
}

/**
 * Normaliza um documento (possivelmente antigo, com `elements` na raiz) para o
 * formato com páginas + transição. Não muta o original.
 */
export function normalizarDoc(doc: VisualDocument): VisualDocument {
  const paginas =
    doc.paginas?.length
      ? doc.paginas.map((p, i) => ({
          id: p.id ?? uidPag(),
          nome: p.nome ?? `Página ${i + 1}`,
          elements: p.elements ?? [],
        }))
      : [criarPagina("Página 1", doc.elements ?? [])];
  return {
    ...doc,
    paleta: doc.paleta?.length ? doc.paleta : [...PALETA_PADRAO],
    tema: { ...TEMA_PADRAO, ...(doc.tema ?? {}) },
    transicao: doc.transicao ?? { ...TRANSICAO_PADRAO },
    paginas,
    elements: undefined,
  };
}

/** Documento inicial: canvas em branco (sem elementos). */
export function documentoInicial(): VisualDocument {
  return {
    nome: "MEU_VISUAL",
    card: cardPadrao(),
    paleta: [...PALETA_PADRAO],
    tema: { ...TEMA_PADRAO },
    transicao: { ...TRANSICAO_PADRAO },
    paginas: [criarPagina("Página 1", [])],
  };
}
