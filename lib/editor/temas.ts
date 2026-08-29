/**
 * Temas completos (design system): controlam paleta + fundo do card +
 * cantos/borda/sombra + tipografia (fonte e tamanhos), tudo com um clique.
 */
export interface Tema {
  nome: string;
  paleta: string[];
  cardFundo: string;
  cardRadius: number;
  cardBorda: number;
  cardBordaCor: string;
  cardSombra: number;
  fonte: string; // fontFamily (valor CSS sem aspas)
  tamTitulo: number;
  tamSubtitulo: number;
  tamCorpo: number;
  corTexto: string; // texto principal legível no fundo
  corTextoFraco: string; // texto secundário/legenda
}

export const TEMAS: Tema[] = [
  {
    nome: "Dark Modern",
    paleta: ["#0B1220", "#0E5E6F", "#22C55E", "#2BA8E0", "#67E8F9", "#F8FAFC"],
    cardFundo: "linear-gradient(150deg,#12161D,#080A0E)",
    cardRadius: 20, cardBorda: 0, cardBordaCor: "#1e293b", cardSombra: 0,
    fonte: "", tamTitulo: 26, tamSubtitulo: 16, tamCorpo: 14,
    corTexto: "#F8FAFC", corTextoFraco: "#94A3B8",
  },
  {
    nome: "Corporate Blue",
    paleta: ["#0f172a", "#1E3A8A", "#2563EB", "#0891B2", "#E2E8F0", "#FFFFFF"],
    cardFundo: "linear-gradient(160deg,#0f1f3d,#0a1124)",
    cardRadius: 16, cardBorda: 1, cardBordaCor: "#1e3a8a", cardSombra: 24,
    fonte: "Arial,sans-serif", tamTitulo: 24, tamSubtitulo: 15, tamCorpo: 13,
    corTexto: "#FFFFFF", corTextoFraco: "#93C5FD",
  },
  {
    nome: "Finance",
    paleta: ["#0c1a12", "#14532D", "#22C55E", "#84CC16", "#BBF7D0", "#F0FDF4"],
    cardFundo: "linear-gradient(160deg,#0c1a12,#071009)",
    cardRadius: 14, cardBorda: 1, cardBordaCor: "#14532D", cardSombra: 18,
    fonte: "Georgia,serif", tamTitulo: 28, tamSubtitulo: 16, tamCorpo: 14,
    corTexto: "#F0FDF4", corTextoFraco: "#86EFAC",
  },
  {
    nome: "Neon",
    paleta: ["#0b1220", "#0a0f1a", "#22d3ee", "#a78bfa", "#67e8f9", "#e0f2fe"],
    cardFundo: "linear-gradient(160deg,#0b1220,#0a0f1a)",
    cardRadius: 22, cardBorda: 1, cardBordaCor: "#22d3ee", cardSombra: 30,
    fonte: "Impact,sans-serif", tamTitulo: 30, tamSubtitulo: 16, tamCorpo: 14,
    corTexto: "#E0F2FE", corTextoFraco: "#7DD3FC",
  },
  {
    nome: "Minimal",
    paleta: ["#ffffff", "#f1f5f9", "#0891B2", "#64748b", "#e2e8f0", "#0f172a"],
    cardFundo: "#ffffff",
    cardRadius: 14, cardBorda: 1, cardBordaCor: "#e2e8f0", cardSombra: 14,
    fonte: "", tamTitulo: 24, tamSubtitulo: 14, tamCorpo: 13,
    corTexto: "#0F172A", corTextoFraco: "#64748B",
  },
  {
    nome: "Power BI",
    paleta: ["#f3f2f1", "#ffffff", "#118DFF", "#12239E", "#E6E6E6", "#252423"],
    cardFundo: "#ffffff",
    cardRadius: 4, cardBorda: 1, cardBordaCor: "#e1dfdd", cardSombra: 6,
    fonte: "Arial,sans-serif", tamTitulo: 22, tamSubtitulo: 14, tamCorpo: 12,
    corTexto: "#252423", corTextoFraco: "#605E5C",
  },
  {
    nome: "Clean Light",
    paleta: ["#ffffff", "#f8fafc", "#0891B2", "#0E7490", "#cbd5e1", "#0f172a"],
    cardFundo: "linear-gradient(160deg,#ffffff,#eef2f7)",
    cardRadius: 16, cardBorda: 1, cardBordaCor: "#e2e8f0", cardSombra: 16,
    fonte: "", tamTitulo: 26, tamSubtitulo: 15, tamCorpo: 13,
    corTexto: "#0F172A", corTextoFraco: "#64748B",
  },
];
