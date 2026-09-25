export const MASCOT_POLL_SLUG = "nome-do-mascote";

export const MASCOT_NAMES = [
  { label: "Dattinho", description: "Dados no nome, carisma no jeito." },
  { label: "Byte", description: "Pequeno no nome. Gigante nas ideias." },
  { label: "Nexo", description: "Conecta você ao conhecimento." },
  { label: "Bitto", description: "Um bit de inteligência e muita personalidade." },
  { label: "Datix", description: "Seu parceiro tech na Academy." },
];

export type MascotPoll = {
  id: string;
  title: string;
  closed: boolean;
  myVote: string | null;
  total: number | null;
  options: { id: string; label: string; description: string | null; votes: number | null; percent: number | null }[];
};
