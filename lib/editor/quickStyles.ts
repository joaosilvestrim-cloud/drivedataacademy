import type { Estilo } from "./types";

/**
 * Quick Styles: pacotes de estilo aplicados ao elemento selecionado com 1 clique.
 * Cada um define um conjunto coerente de propriedades visuais.
 */
export interface QuickStyle {
  nome: string;
  amostra: string; // cor/gradiente para o botão de prévia
  estilo: Partial<Estilo>;
}

export const QUICK_STYLES: QuickStyle[] = [
  {
    nome: "Glass",
    amostra: "linear-gradient(135deg,rgba(255,255,255,.25),rgba(255,255,255,.05))",
    estilo: { fundo: "rgba(255,255,255,.08)", borderColor: "rgba(255,255,255,.22)", borderWidth: 1, borderStyle: "solid", borderRadius: 16, sombra: 24, glow: 0 },
  },
  {
    nome: "Minimalista",
    amostra: "#f8fafc",
    estilo: { fundo: "transparent", borderWidth: 0, sombra: 0, glow: 0, borderRadius: 8 },
  },
  {
    nome: "Executivo",
    amostra: "linear-gradient(135deg,#1e293b,#0f172a)",
    estilo: { fundo: "#0f172a", cor: "#ffffff", borderColor: "#1e293b", borderWidth: 1, borderRadius: 8, sombra: 18, glow: 0 },
  },
  {
    nome: "Microsoft",
    amostra: "#ffffff",
    estilo: { fundo: "#ffffff", cor: "#201F1E", borderColor: "#e1dfdd", borderWidth: 1, borderRadius: 4, sombra: 6, glow: 0 },
  },
  {
    nome: "Neon",
    amostra: "linear-gradient(135deg,#22d3ee,#a78bfa)",
    estilo: { fundo: "rgba(6,182,212,.08)", borderColor: "#22d3ee", borderWidth: 1, borderRadius: 14, sombra: 20, glow: 10 },
  },
  {
    nome: "Material",
    amostra: "linear-gradient(135deg,#ffffff,#eef2f7)",
    estilo: { fundo: "#ffffff", cor: "#0f172a", borderWidth: 0, borderRadius: 12, sombra: 16, glow: 0 },
  },
  {
    nome: "Gold",
    amostra: "linear-gradient(135deg,#fde68a,#b45309)",
    estilo: { fundo: "linear-gradient(135deg,#3a2d0b,#1a1407)", cor: "#fcd34d", borderColor: "#b45309", borderWidth: 1, borderRadius: 14, sombra: 18, glow: 4 },
  },
  {
    nome: "Contorno",
    amostra: "linear-gradient(135deg,#0891B2,transparent)",
    estilo: { fundo: "transparent", borderColor: "#06B6D4", borderWidth: 2, borderStyle: "solid", borderRadius: 12, sombra: 0, glow: 0 },
  },
  {
    nome: "Suave",
    amostra: "linear-gradient(135deg,#e0f2fe,#f0f9ff)",
    estilo: { fundo: "rgba(6,182,212,.10)", cor: "#0e7490", borderWidth: 0, borderRadius: 18, sombra: 8, glow: 0 },
  },
  {
    nome: "Dark Glass",
    amostra: "linear-gradient(135deg,rgba(15,23,42,.9),rgba(2,6,23,.7))",
    estilo: { fundo: "rgba(2,6,23,.55)", cor: "#e2e8f0", borderColor: "rgba(148,163,184,.25)", borderWidth: 1, borderRadius: 16, sombra: 26, glow: 0 },
  },
  {
    nome: "Perigo",
    amostra: "linear-gradient(135deg,#fecaca,#ef4444)",
    estilo: { fundo: "rgba(239,68,68,.12)", cor: "#ef4444", borderColor: "#ef4444", borderWidth: 1, borderRadius: 12, sombra: 10, glow: 0 },
  },
];
