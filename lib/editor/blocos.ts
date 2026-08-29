import type { Binding, Direcao, ElementType, Estilo } from "./types";

/** Spec de um elemento dentro de um bloco (posição relativa ao bloco). */
export interface BlocoEl {
  type: ElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  estilo?: Partial<Estilo>;
  binding?: Partial<Binding>;
  direcao?: Direcao;
  iconeNome?: string;
  titulo?: string;
  formato?: "anel" | "semi";
  medidas?: { chave: string; rotulo?: string; cor?: string; binding: Binding }[];
}

export interface Bloco {
  nome: string;
  icone: string; // nome do ícone lucide (resolvido na toolbox)
  elementos: BlocoEl[];
}

const BRAND = "#06B6D4";
const PANEL = { fundo: "rgba(255,255,255,.06)", borderColor: BRAND, borderWidth: 1, borderRadius: 18 };

const MUTED = "#94A3B8";
const LINHA = "rgba(148,163,184,.22)";

export const BLOCOS: Bloco[] = [
  {
    nome: "Meta (storytelling)",
    icone: "Gauge",
    elementos: [
      { type: "forma", x: 0, y: 0, w: 360, h: 366, estilo: { fundo: "rgba(255,255,255,.05)", borderColor: BRAND, borderWidth: 1, borderRadius: 20 } },
      { type: "texto", x: 24, y: 22, w: 312, h: 26, binding: { valor: "Título do indicador" }, estilo: { fontSize: 19, fontWeight: 800, cor: "#F8FAFC" } },
      { type: "texto", x: 24, y: 50, w: 312, h: 18, binding: { valor: "Subtítulo curto de contexto" }, estilo: { fontSize: 13, fontWeight: 500, cor: MUTED } },
      { type: "linha", x: 24, y: 78, w: 312, h: 1, estilo: { fundo: LINHA } },
      { type: "anelKpi", x: 90, y: 92, w: 180, h: 116, formato: "semi", titulo: "", binding: { dinamico: true, valor: "72", ref: "[Atingimento %]" }, estilo: { cor: BRAND, fundo: "rgba(148,163,184,.2)", corValor: "#F8FAFC", corTitulo: MUTED, fontSize: 34, fontWeight: 800, espessura: 4.5 } },
      {
        type: "narrativo", x: 24, y: 214, w: 312, h: 54,
        binding: { valor: "A meta atual representa um aumento de {aumento} em relação ao ano anterior (2025: {ano})." },
        medidas: [
          { chave: "aumento", rotulo: "Aumento", cor: "#22C55E", binding: { dinamico: true, valor: "12,4%", ref: "[Crescimento vs Ano Anterior]" } },
          { chave: "ano", rotulo: "Ano anterior", cor: "#EF4444", binding: { dinamico: true, valor: "R$ 1,10 mi", ref: "[Meta Ano Anterior]" } },
        ],
        estilo: { fontSize: 13, fontWeight: 500, cor: MUTED, corValor: "#22C55E", align: "center", lineHeight: 1.5 },
      },
      { type: "linha", x: 24, y: 288, w: 312, h: 1, estilo: { fundo: LINHA } },
      { type: "texto", x: 16, y: 304, w: 104, h: 16, binding: { valor: "Meta" }, estilo: { fontSize: 12, fontWeight: 700, cor: MUTED, align: "center" } },
      { type: "kpi", x: 16, y: 324, w: 104, h: 24, binding: { dinamico: true, valor: "R$ 850 Mil", ref: "[Meta]" }, estilo: { fontSize: 16, fontWeight: 800, cor: "#F8FAFC", align: "center" } },
      { type: "forma", x: 122, y: 302, w: 1, h: 52, estilo: { fundo: LINHA } },
      { type: "texto", x: 128, y: 304, w: 104, h: 16, binding: { valor: "Realizado" }, estilo: { fontSize: 12, fontWeight: 700, cor: MUTED, align: "center" } },
      { type: "kpi", x: 128, y: 324, w: 104, h: 24, binding: { dinamico: true, valor: "R$ 620 Mil", ref: "[Realizado]" }, estilo: { fontSize: 16, fontWeight: 800, cor: "#F8FAFC", align: "center" } },
      { type: "forma", x: 238, y: 302, w: 1, h: 52, estilo: { fundo: LINHA } },
      { type: "texto", x: 244, y: 304, w: 104, h: 16, binding: { valor: "Desvio" }, estilo: { fontSize: 12, fontWeight: 700, cor: MUTED, align: "center" } },
      { type: "kpi", x: 244, y: 324, w: 104, h: 24, binding: { dinamico: true, valor: "R$ 230 Mil", ref: "[Desvio]" }, estilo: { fontSize: 16, fontWeight: 800, cor: "#22C55E", align: "center" } },
    ],
  },
  // ── Peças (quebra-cabeça): blocos simples que se encaixam ──
  {
    nome: "Título + divisor",
    icone: "Heading",
    elementos: [
      { type: "texto", x: 0, y: 0, w: 300, h: 26, binding: { valor: "Título do indicador" }, estilo: { fontSize: 19, fontWeight: 800, cor: "#F8FAFC" } },
      { type: "texto", x: 0, y: 28, w: 300, h: 18, binding: { valor: "Subtítulo curto de contexto" }, estilo: { fontSize: 13, fontWeight: 500, cor: MUTED } },
      { type: "linha", x: 0, y: 54, w: 300, h: 1, estilo: { fundo: LINHA } },
    ],
  },
  {
    nome: "Rodapé 3 valores",
    icone: "Columns2",
    elementos: [
      { type: "linha", x: 0, y: 0, w: 336, h: 1, estilo: { fundo: LINHA } },
      { type: "texto", x: 0, y: 14, w: 104, h: 16, binding: { valor: "Meta" }, estilo: { fontSize: 12, fontWeight: 700, cor: MUTED, align: "center" } },
      { type: "kpi", x: 0, y: 34, w: 104, h: 24, binding: { dinamico: true, valor: "R$ 850 Mil", ref: "[Meta]" }, estilo: { fontSize: 16, fontWeight: 800, cor: "#F8FAFC", align: "center" } },
      { type: "forma", x: 116, y: 12, w: 1, h: 52, estilo: { fundo: LINHA } },
      { type: "texto", x: 116, y: 14, w: 104, h: 16, binding: { valor: "Realizado" }, estilo: { fontSize: 12, fontWeight: 700, cor: MUTED, align: "center" } },
      { type: "kpi", x: 116, y: 34, w: 104, h: 24, binding: { dinamico: true, valor: "R$ 620 Mil", ref: "[Realizado]" }, estilo: { fontSize: 16, fontWeight: 800, cor: "#F8FAFC", align: "center" } },
      { type: "forma", x: 232, y: 12, w: 1, h: 52, estilo: { fundo: LINHA } },
      { type: "texto", x: 232, y: 14, w: 104, h: 16, binding: { valor: "Desvio" }, estilo: { fontSize: 12, fontWeight: 700, cor: MUTED, align: "center" } },
      { type: "kpi", x: 232, y: 34, w: 104, h: 24, binding: { dinamico: true, valor: "R$ 230 Mil", ref: "[Desvio]" }, estilo: { fontSize: 16, fontWeight: 800, cor: "#22C55E", align: "center" } },
    ],
  },
  {
    nome: "Linha KPI",
    icone: "Hash",
    elementos: [
      { type: "texto", x: 0, y: 0, w: 170, h: 14, binding: { valor: "Rótulo" }, estilo: { fontSize: 12, fontWeight: 600, cor: MUTED } },
      { type: "kpi", x: 0, y: 18, w: 170, h: 30, binding: { dinamico: true, valor: "1.234", ref: "[Medida]" }, estilo: { fontSize: 26, fontWeight: 800, cor: "#F8FAFC" } },
    ],
  },
  {
    nome: "Par de valores",
    icone: "Columns2",
    elementos: [
      { type: "texto", x: 0, y: 0, w: 120, h: 14, binding: { valor: "Atual" }, estilo: { fontSize: 12, fontWeight: 600, cor: MUTED } },
      { type: "kpi", x: 0, y: 18, w: 120, h: 30, binding: { dinamico: true, valor: "R$ 12k", ref: "[Atual]" }, estilo: { fontSize: 24, fontWeight: 800, cor: "#F8FAFC" } },
      { type: "forma", x: 132, y: 4, w: 1, h: 44, estilo: { fundo: LINHA } },
      { type: "texto", x: 144, y: 0, w: 120, h: 14, binding: { valor: "Anterior" }, estilo: { fontSize: 12, fontWeight: 600, cor: MUTED } },
      { type: "kpi", x: 144, y: 18, w: 120, h: 30, binding: { dinamico: true, valor: "R$ 10k", ref: "[Anterior]" }, estilo: { fontSize: 24, fontWeight: 800, cor: MUTED } },
    ],
  },
  {
    nome: "KPI completo",
    icone: "LayoutGrid",
    elementos: [
      { type: "forma", x: 0, y: 0, w: 280, h: 140, estilo: PANEL },
      { type: "icone", x: 18, y: 18, w: 40, h: 40, binding: { valor: "dollar" }, estilo: { cor: BRAND, fundo: "rgba(6,182,212,.16)", borderRadius: 12 } },
      { type: "texto", x: 70, y: 24, w: 190, h: 20, binding: { valor: "FATURAMENTO" }, estilo: { fontSize: 13, fontWeight: 600, cor: "rgba(255,255,255,.8)" } },
      { type: "kpi", x: 18, y: 66, w: 250, h: 40, binding: { dinamico: true, valor: "R$ 1.245.890", ref: "[Faturamento]" }, estilo: { fontSize: 32, fontWeight: 800, cor: "#fff" } },
      { type: "tendencia", x: 18, y: 108, w: 150, h: 22, binding: { dinamico: true, valor: "15,4%", ref: "[Variação %]" }, direcao: "up", estilo: { cor: "#22C55E", fontSize: 14, fontWeight: 700 } },
    ],
  },
  {
    nome: "Mini card",
    icone: "Square",
    elementos: [
      { type: "forma", x: 0, y: 0, w: 200, h: 92, estilo: { fundo: "rgba(255,255,255,.06)", borderRadius: 14 } },
      { type: "texto", x: 14, y: 12, w: 172, h: 16, binding: { valor: "Título" }, estilo: { fontSize: 12, fontWeight: 600, cor: "#94A3B8" } },
      { type: "kpi", x: 14, y: 34, w: 172, h: 32, binding: { dinamico: true, valor: "1.234", ref: "[Medida]" }, estilo: { fontSize: 26, fontWeight: 800, cor: "#fff" } },
    ],
  },
  {
    nome: "Cabeçalho",
    icone: "Heading",
    elementos: [
      { type: "forma", x: 0, y: 2, w: 5, h: 34, estilo: { fundo: BRAND, borderRadius: 3 } },
      { type: "texto", x: 14, y: 0, w: 240, h: 24, binding: { valor: "Título da seção" }, estilo: { fontSize: 20, fontWeight: 800 } },
      { type: "texto", x: 14, y: 26, w: 240, h: 16, binding: { valor: "subtítulo / descrição" }, estilo: { fontSize: 13, cor: "#94A3B8" } },
    ],
  },
  {
    nome: "Meta (gauge)",
    icone: "Gauge",
    elementos: [
      { type: "forma", x: 0, y: 0, w: 170, h: 160, estilo: { fundo: "rgba(255,255,255,.06)", borderRadius: 16 } },
      { type: "gauge", x: 35, y: 18, w: 100, h: 100, binding: { dinamico: true, valor: "72", ref: "[Atingimento %]" }, estilo: { cor: BRAND, fundo: "rgba(255,255,255,.14)", fontSize: 18, fontWeight: 800, align: "center" } },
      { type: "texto", x: 0, y: 124, w: 170, h: 20, binding: { valor: "META" }, estilo: { fontSize: 12, fontWeight: 600, cor: "#94A3B8", align: "center" } },
    ],
  },
  {
    nome: "Barra c/ rótulo",
    icone: "RectangleHorizontal",
    elementos: [
      { type: "texto", x: 0, y: 0, w: 190, h: 16, binding: { valor: "Atingimento" }, estilo: { fontSize: 12, fontWeight: 600, cor: "#94A3B8" } },
      { type: "kpi", x: 200, y: 0, w: 80, h: 18, binding: { dinamico: true, valor: "72%", ref: "[Atingimento %]" }, estilo: { fontSize: 14, fontWeight: 800, align: "right", cor: "#fff" } },
      { type: "progresso", x: 0, y: 24, w: 280, h: 10, binding: { dinamico: true, valor: "72", ref: "[Atingimento %]" }, estilo: { cor: BRAND, fundo: "rgba(255,255,255,.12)", borderRadius: 6 } },
    ],
  },
  {
    nome: "Card pessoa",
    icone: "UserSquare",
    elementos: [
      { type: "forma", x: 0, y: 0, w: 180, h: 150, estilo: { fundo: "rgba(255,255,255,.06)", borderRadius: 16 } },
      { type: "imagem", x: 64, y: 16, w: 52, h: 52, estilo: { borderRadius: 999, borderWidth: 2, borderColor: BRAND } },
      { type: "texto", x: 0, y: 78, w: 180, h: 20, binding: { valor: "Nome" }, estilo: { fontSize: 15, fontWeight: 700, align: "center" } },
      { type: "badge", x: 55, y: 104, w: 70, h: 22, binding: { valor: "ATIVO" }, estilo: { fundo: "rgba(34,197,94,.18)", cor: "#22C55E", fontSize: 11, fontWeight: 700, borderRadius: 999, align: "center", uppercase: true } },
    ],
  },
  {
    nome: "Comparativo",
    icone: "Columns2",
    elementos: [
      { type: "forma", x: 0, y: 0, w: 300, h: 96, estilo: PANEL },
      { type: "texto", x: 18, y: 14, w: 120, h: 14, binding: { valor: "Este mês" }, estilo: { fontSize: 12, fontWeight: 600, cor: "#94A3B8" } },
      { type: "kpi", x: 18, y: 34, w: 120, h: 32, binding: { dinamico: true, valor: "R$ 12k", ref: "[Atual]" }, estilo: { fontSize: 24, fontWeight: 800, cor: "#fff" } },
      { type: "forma", x: 150, y: 16, w: 1, h: 64, estilo: { fundo: "rgba(255,255,255,.18)" } },
      { type: "texto", x: 168, y: 14, w: 120, h: 14, binding: { valor: "Mês passado" }, estilo: { fontSize: 12, fontWeight: 600, cor: "#94A3B8" } },
      { type: "kpi", x: 168, y: 34, w: 120, h: 32, binding: { dinamico: true, valor: "R$ 10k", ref: "[Anterior]" }, estilo: { fontSize: 24, fontWeight: 800, cor: "#94A3B8" } },
    ],
  },
  {
    nome: "3 KPIs",
    icone: "LayoutGrid",
    elementos: [
      { type: "forma", x: 0, y: 0, w: 360, h: 88, estilo: PANEL },
      { type: "texto", x: 16, y: 16, w: 100, h: 14, binding: { valor: "Vendas" }, estilo: { fontSize: 12, fontWeight: 600, cor: "#94A3B8" } },
      { type: "kpi", x: 16, y: 34, w: 100, h: 28, binding: { dinamico: true, valor: "120", ref: "[Vendas]" }, estilo: { fontSize: 24, fontWeight: 800, cor: "#fff" } },
      { type: "texto", x: 132, y: 16, w: 100, h: 14, binding: { valor: "Leads" }, estilo: { fontSize: 12, fontWeight: 600, cor: "#94A3B8" } },
      { type: "kpi", x: 132, y: 34, w: 100, h: 28, binding: { dinamico: true, valor: "340", ref: "[Leads]" }, estilo: { fontSize: 24, fontWeight: 800, cor: "#fff" } },
      { type: "texto", x: 248, y: 16, w: 100, h: 14, binding: { valor: "Conversão" }, estilo: { fontSize: 12, fontWeight: 600, cor: "#94A3B8" } },
      { type: "kpi", x: 248, y: 34, w: 100, h: 28, binding: { dinamico: true, valor: "12%", ref: "[Conversao]" }, estilo: { fontSize: 24, fontWeight: 800, cor: BRAND } },
    ],
  },
  {
    nome: "Card tabela",
    icone: "Table",
    elementos: [
      { type: "forma", x: 0, y: 0, w: 320, h: 180, estilo: PANEL },
      { type: "forma", x: 16, y: 16, w: 4, h: 18, estilo: { fundo: BRAND, borderRadius: 2 } },
      { type: "texto", x: 28, y: 15, w: 220, h: 18, binding: { valor: "Top produtos" }, estilo: { fontSize: 15, fontWeight: 700 } },
      { type: "tabela", x: 14, y: 44, w: 292, h: 122, estilo: { cor: "#e2e8f0", fontSize: 12 } },
    ],
  },
  {
    nome: "Destaque",
    icone: "Target",
    elementos: [
      { type: "forma", x: 0, y: 0, w: 280, h: 150, estilo: PANEL },
      { type: "texto", x: 18, y: 16, w: 240, h: 16, binding: { valor: "ATINGIMENTO" }, estilo: { fontSize: 12, fontWeight: 600, cor: "#94A3B8" } },
      { type: "kpi", x: 18, y: 34, w: 240, h: 48, binding: { dinamico: true, valor: "72%", ref: "[Atingimento %]" }, estilo: { fontSize: 40, fontWeight: 800, cor: "#fff" } },
      { type: "progresso", x: 18, y: 98, w: 244, h: 12, binding: { dinamico: true, valor: "72", ref: "[Atingimento %]" }, estilo: { cor: BRAND, fundo: "rgba(255,255,255,.12)", borderRadius: 6 } },
      { type: "texto", x: 18, y: 118, w: 200, h: 16, binding: { valor: "Meta: 100%" }, estilo: { fontSize: 12, cor: "#94A3B8" } },
    ],
  },
  {
    nome: "Banner CTA",
    icone: "Megaphone",
    elementos: [
      { type: "forma", x: 0, y: 0, w: 360, h: 112, estilo: { fundo: "linear-gradient(135deg,#0E7490,#06B6D4)", borderRadius: 18 } },
      { type: "texto", x: 22, y: 22, w: 240, h: 24, binding: { valor: "Pronto para começar?" }, estilo: { fontSize: 18, fontWeight: 800, cor: "#fff" } },
      { type: "texto", x: 22, y: 50, w: 240, h: 16, binding: { valor: "Crie seu visual agora" }, estilo: { fontSize: 13, cor: "rgba(255,255,255,.85)" } },
      { type: "botao", x: 232, y: 38, w: 110, h: 38, binding: { valor: "Abrir" }, estilo: { fundo: "#fff", cor: "#0E7490", fontSize: 14, fontWeight: 700, borderRadius: 10, align: "center" } },
    ],
  },
  {
    nome: "Semáforo",
    icone: "Activity",
    elementos: [
      { type: "forma", x: 0, y: 0, w: 210, h: 124, estilo: PANEL },
      { type: "forma", x: 18, y: 24, w: 14, h: 14, estilo: { fundo: "#22C55E", borderRadius: 999 } },
      { type: "texto", x: 42, y: 22, w: 150, h: 16, binding: { valor: "Operacional" }, estilo: { fontSize: 13, fontWeight: 600, cor: "#e2e8f0" } },
      { type: "forma", x: 18, y: 54, w: 14, h: 14, estilo: { fundo: "#F59E0B", borderRadius: 999 } },
      { type: "texto", x: 42, y: 52, w: 150, h: 16, binding: { valor: "Atenção" }, estilo: { fontSize: 13, fontWeight: 600, cor: "#e2e8f0" } },
      { type: "forma", x: 18, y: 84, w: 14, h: 14, estilo: { fundo: "#EF4444", borderRadius: 999 } },
      { type: "texto", x: 42, y: 82, w: 150, h: 16, binding: { valor: "Crítico" }, estilo: { fontSize: 13, fontWeight: 600, cor: "#e2e8f0" } },
    ],
  },
  {
    nome: "KPI + Gauge",
    icone: "Gauge",
    elementos: [
      { type: "forma", x: 0, y: 0, w: 284, h: 122, estilo: PANEL },
      { type: "gauge", x: 16, y: 17, w: 88, h: 88, binding: { dinamico: true, valor: "72", ref: "[Atingimento %]" }, estilo: { cor: BRAND, fundo: "rgba(255,255,255,.14)", fontSize: 16, fontWeight: 800, align: "center" } },
      { type: "texto", x: 116, y: 30, w: 150, h: 16, binding: { valor: "Atingimento" }, estilo: { fontSize: 13, fontWeight: 600, cor: "#94A3B8" } },
      { type: "kpi", x: 116, y: 48, w: 150, h: 34, binding: { dinamico: true, valor: "72%", ref: "[Atingimento %]" }, estilo: { fontSize: 28, fontWeight: 800, cor: "#fff" } },
    ],
  },
  {
    nome: "Lista de metas",
    icone: "ListChecks",
    elementos: [
      { type: "forma", x: 0, y: 0, w: 300, h: 152, estilo: PANEL },
      { type: "texto", x: 16, y: 16, w: 130, h: 14, binding: { valor: "Meta A" }, estilo: { fontSize: 12, fontWeight: 600, cor: "#cbd5e1" } },
      { type: "progresso", x: 16, y: 34, w: 268, h: 8, binding: { dinamico: true, valor: "70", ref: "[Meta A %]" }, estilo: { cor: BRAND, fundo: "rgba(255,255,255,.12)", borderRadius: 6 } },
      { type: "texto", x: 16, y: 56, w: 130, h: 14, binding: { valor: "Meta B" }, estilo: { fontSize: 12, fontWeight: 600, cor: "#cbd5e1" } },
      { type: "progresso", x: 16, y: 74, w: 268, h: 8, binding: { dinamico: true, valor: "45", ref: "[Meta B %]" }, estilo: { cor: "#22C55E", fundo: "rgba(255,255,255,.12)", borderRadius: 6 } },
      { type: "texto", x: 16, y: 96, w: 130, h: 14, binding: { valor: "Meta C" }, estilo: { fontSize: 12, fontWeight: 600, cor: "#cbd5e1" } },
      { type: "progresso", x: 16, y: 114, w: 268, h: 8, binding: { dinamico: true, valor: "88", ref: "[Meta C %]" }, estilo: { cor: "#A78BFA", fundo: "rgba(255,255,255,.12)", borderRadius: 6 } },
    ],
  },
  {
    nome: "Selo premium",
    icone: "Award",
    elementos: [
      { type: "forma", x: 0, y: 0, w: 200, h: 124, estilo: { fundo: "linear-gradient(135deg,#3a2d0b,#1a1407)", borderColor: "#b45309", borderWidth: 1, borderRadius: 16 } },
      { type: "icone", x: 84, y: 16, w: 34, h: 34, binding: { valor: "award" }, estilo: { cor: "#fcd34d", fundo: "transparent", align: "center" } },
      { type: "texto", x: 0, y: 58, w: 200, h: 18, binding: { valor: "PREMIUM" }, estilo: { fontSize: 15, fontWeight: 800, cor: "#fcd34d", align: "center", uppercase: true, letterSpacing: 2 } },
      { type: "texto", x: 0, y: 80, w: 200, h: 14, binding: { valor: "assinante ativo" }, estilo: { fontSize: 11, cor: "#cbd5e1", align: "center" } },
    ],
  },
  {
    nome: "Rodapé logo",
    icone: "PanelBottom",
    elementos: [
      { type: "linha", x: 0, y: 0, w: 320, h: 1, estilo: { fundo: "rgba(255,255,255,.18)" } },
      { type: "imagem", x: 8, y: 16, w: 96, h: 28 },
      { type: "texto", x: 150, y: 20, w: 162, h: 16, binding: { valor: "Atualizado hoje" }, estilo: { fontSize: 11, cor: "#94A3B8", align: "right" } },
    ],
  },
  {
    nome: "3 Velocímetros",
    icone: "Gauge",
    elementos: [
      { type: "forma", x: 0, y: 0, w: 378, h: 164, estilo: PANEL },
      { type: "texto", x: 8, y: 12, w: 118, h: 14, binding: { valor: "Revenue/Sale" }, estilo: { fontSize: 12, fontWeight: 700, cor: "#e2e8f0", align: "center" } },
      { type: "velocimetro", x: 6, y: 30, w: 118, h: 126, binding: { dinamico: true, valor: "750", ref: "[Revenue per Sale]" }, estilo: { cor: "#F59E0B", fundo: "rgba(148,163,184,.25)", fontSize: 16, fontWeight: 800, align: "center" } },
      { type: "texto", x: 132, y: 12, w: 118, h: 14, binding: { valor: "Cost/Sale" }, estilo: { fontSize: 12, fontWeight: 700, cor: "#e2e8f0", align: "center" } },
      { type: "velocimetro", x: 130, y: 30, w: 118, h: 126, binding: { dinamico: true, valor: "450", ref: "[Cost per Sale]" }, estilo: { cor: "#F59E0B", fundo: "rgba(148,163,184,.25)", fontSize: 16, fontWeight: 800, align: "center" } },
      { type: "texto", x: 256, y: 12, w: 118, h: 14, binding: { valor: "Profit/Sale" }, estilo: { fontSize: 12, fontWeight: 700, cor: "#e2e8f0", align: "center" } },
      { type: "velocimetro", x: 254, y: 30, w: 118, h: 126, binding: { dinamico: true, valor: "300", ref: "[Profit per Sale]" }, estilo: { cor: "#F59E0B", fundo: "rgba(148,163,184,.25)", fontSize: 16, fontWeight: 800, align: "center" } },
    ],
  },
  {
    nome: "Bullets",
    icone: "SlidersHorizontal",
    elementos: [
      { type: "forma", x: 0, y: 0, w: 320, h: 158, estilo: PANEL },
      { type: "texto", x: 16, y: 14, w: 200, h: 14, binding: { valor: "Cost per Lead" }, estilo: { fontSize: 12, fontWeight: 600, cor: "#cbd5e1" } },
      { type: "bullet", x: 16, y: 32, w: 288, h: 16, binding: { valor: "200", ref: "[Cost per Lead]" }, estilo: { cor: "#F97316", fundo: "rgba(148,163,184,.2)", borderRadius: 6 } },
      { type: "texto", x: 16, y: 58, w: 200, h: 14, binding: { valor: "Revenue per Lead" }, estilo: { fontSize: 12, fontWeight: 600, cor: "#cbd5e1" } },
      { type: "bullet", x: 16, y: 76, w: 288, h: 16, binding: { valor: "550", ref: "[Revenue per Lead]" }, estilo: { cor: "#F59E0B", fundo: "rgba(148,163,184,.2)", borderRadius: 6 } },
      { type: "texto", x: 16, y: 102, w: 200, h: 14, binding: { valor: "New Customers" }, estilo: { fontSize: 12, fontWeight: 600, cor: "#cbd5e1" } },
      { type: "bullet", x: 16, y: 120, w: 288, h: 16, binding: { valor: "176", ref: "[New Customers]" }, estilo: { cor: "#EA580C", fundo: "rgba(148,163,184,.2)", borderRadius: 6 } },
    ],
  },
  {
    nome: "Funil",
    icone: "Filter",
    elementos: [
      { type: "forma", x: 0, y: 0, w: 240, h: 38, estilo: { fundo: "#84CC16", borderRadius: 8 } },
      { type: "texto", x: 0, y: 11, w: 240, h: 16, binding: { valor: "Leads · 126" }, estilo: { fontSize: 13, fontWeight: 700, cor: "#ffffff", align: "center" } },
      { type: "forma", x: 25, y: 44, w: 190, h: 38, estilo: { fundo: "#F59E0B", borderRadius: 8 } },
      { type: "texto", x: 25, y: 55, w: 190, h: 16, binding: { valor: "Prospects · 53" }, estilo: { fontSize: 13, fontWeight: 700, cor: "#ffffff", align: "center" } },
      { type: "forma", x: 50, y: 88, w: 140, h: 38, estilo: { fundo: "#F97316", borderRadius: 8 } },
      { type: "texto", x: 50, y: 99, w: 140, h: 16, binding: { valor: "Oportunidades · 21" }, estilo: { fontSize: 12, fontWeight: 700, cor: "#ffffff", align: "center" } },
      { type: "forma", x: 75, y: 132, w: 90, h: 38, estilo: { fundo: "#22C55E", borderRadius: 8 } },
      { type: "texto", x: 75, y: 143, w: 90, h: 16, binding: { valor: "Vendas · 4" }, estilo: { fontSize: 12, fontWeight: 700, cor: "#ffffff", align: "center" } },
    ],
  },
  {
    nome: "Anéis",
    icone: "PieChart",
    elementos: [
      { type: "forma", x: 0, y: 0, w: 360, h: 112, estilo: PANEL },
      { type: "donut", x: 10, y: 12, w: 76, h: 76, binding: { valor: "25", ref: "[Meta A %]" }, estilo: { cor: "#22C55E", fundo: "rgba(148,163,184,.2)", fontSize: 18, fontWeight: 800, align: "center" } },
      { type: "texto", x: 8, y: 92, w: 80, h: 14, binding: { valor: "Meta A" }, estilo: { fontSize: 11, cor: "#94A3B8", align: "center" } },
      { type: "donut", x: 98, y: 12, w: 76, h: 76, binding: { valor: "50", ref: "[Meta B %]" }, estilo: { cor: "#06B6D4", fundo: "rgba(148,163,184,.2)", fontSize: 18, fontWeight: 800, align: "center" } },
      { type: "texto", x: 96, y: 92, w: 80, h: 14, binding: { valor: "Meta B" }, estilo: { fontSize: 11, cor: "#94A3B8", align: "center" } },
      { type: "donut", x: 186, y: 12, w: 76, h: 76, binding: { valor: "75", ref: "[Meta C %]" }, estilo: { cor: "#F59E0B", fundo: "rgba(148,163,184,.2)", fontSize: 18, fontWeight: 800, align: "center" } },
      { type: "texto", x: 184, y: 92, w: 80, h: 14, binding: { valor: "Meta C" }, estilo: { fontSize: 11, cor: "#94A3B8", align: "center" } },
      { type: "donut", x: 274, y: 12, w: 76, h: 76, binding: { valor: "100", ref: "[Meta D %]" }, estilo: { cor: "#A78BFA", fundo: "rgba(148,163,184,.2)", fontSize: 18, fontWeight: 800, align: "center" } },
      { type: "texto", x: 272, y: 92, w: 80, h: 14, binding: { valor: "Meta D" }, estilo: { fontSize: 11, cor: "#94A3B8", align: "center" } },
    ],
  },
];

/** Classificação dos blocos por categoria (para agrupar na barra lateral). */
export const GRUPOS_BLOCO: { titulo: string; nomes: string[] }[] = [
  { titulo: "Storytelling", nomes: ["Meta (storytelling)"] },
  { titulo: "Peças", nomes: ["Título + divisor", "Rodapé 3 valores", "Linha KPI", "Par de valores", "Cabeçalho", "Rodapé logo"] },
  { titulo: "Cards", nomes: ["KPI completo", "Destaque", "Mini card", "Card pessoa", "Card tabela", "Selo premium"] },
  { titulo: "Indicadores", nomes: ["Meta (gauge)", "KPI + Gauge", "Anéis", "3 Velocímetros", "Bullets", "Funil", "Lista de metas", "Barra c/ rótulo", "Semáforo"] },
  { titulo: "Comparação", nomes: ["Comparativo", "3 KPIs"] },
  { titulo: "Extras", nomes: ["Banner CTA"] },
];
