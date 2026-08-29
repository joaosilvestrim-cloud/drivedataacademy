/**
 * Paletas de cores prontas. Cada paleta é um array de swatches; por convenção,
 * cores[0] e cores[1] formam o gradiente de fundo do card ao "Aplicar paleta".
 */
export interface Paleta {
  nome: string;
  cores: string[];
}

export const PALETAS: Paleta[] = [
  { nome: "DriveData", cores: ["#0B1220", "#0E5E6F", "#22C55E", "#2BA8E0", "#67E8F9", "#F8FAFC"] },
  { nome: "Oceano", cores: ["#0a1a2f", "#0E7490", "#06B6D4", "#38BDF8", "#A5F3FC", "#F0F9FF"] },
  { nome: "Sunset", cores: ["#1a0f1f", "#7c2d4d", "#F95587", "#FB923C", "#FDE68A", "#FFF7ED"] },
  { nome: "Floresta", cores: ["#0c1a12", "#14532D", "#22C55E", "#84CC16", "#BBF7D0", "#F0FDF4"] },
  { nome: "Roxo", cores: ["#160f24", "#5B21B6", "#8B5CF6", "#C084FC", "#E9D5FF", "#FAF5FF"] },
  { nome: "Pastel", cores: ["#1e293b", "#475569", "#7DD3FC", "#FCA5A5", "#FDE68A", "#F8FAFC"] },
  { nome: "Mono", cores: ["#0a0a0a", "#262626", "#737373", "#A3A3A3", "#D4D4D4", "#FAFAFA"] },
  { nome: "Corporativo", cores: ["#0f172a", "#1E3A8A", "#2563EB", "#0891B2", "#E2E8F0", "#FFFFFF"] },
];

export const PALETA_PADRAO = PALETAS[0].cores;
