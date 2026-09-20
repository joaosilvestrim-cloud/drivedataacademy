/* Vitrine de portfólio: regras que valem no aluno, no admin e na página pública.

   O projeto do aluno é peça de marketing da Academy e currículo dele ao mesmo
   tempo. Por isso passa por revisão: o que aparece na vitrine pública leva o
   nome da casa junto. */

export type Status = "rascunho" | "revisao" | "aprovado" | "recusado";

export const STATUS: Record<Status, { rotulo: string; cor: string; explica: string }> = {
  rascunho: { rotulo: "Rascunho", cor: "text-slate-400", explica: "Só você vê. Envie para revisão quando estiver pronto." },
  revisao: { rotulo: "Em revisão", cor: "text-amber-300", explica: "O time está olhando. Costuma sair em até dois dias úteis." },
  aprovado: { rotulo: "Publicado", cor: "text-brand-green", explica: "Está na vitrine para a turma e, se você deixou público, para quem visita o site." },
  recusado: { rotulo: "Precisa de ajuste", cor: "text-red-300", explica: "O time pediu uma correção. Ajuste e envie de novo." },
};

export type Projeto = {
  id: string;
  user_id: string;
  titulo: string;
  resumo: string;
  descricao: string | null;
  problema: string | null;
  resultado: string | null;
  ferramentas: string[];
  cover_url: string | null;
  link_url: string | null;
  repo_url: string | null;
  course_id: string | null;
  status: Status;
  motivo: string | null;
  destaque: boolean;
  publico: boolean;
  curtidas: number;
  visitas: number;
  created_at: string;
  updated_at: string;
  aprovado_em: string | null;
};

export const LIMITES = { titulo: 70, resumo: 160, descricao: 2000, ferramentas: 8 };

/* Ferramentas sugeridas: a lista fechada mantém o filtro da vitrine limpo, e o
   aluno ainda pode escrever a dele. */
export const FERRAMENTAS_SUGERIDAS = [
  "Power BI", "Excel", "SQL", "DAX", "Power Query", "Python", "Fabric", "Databricks",
  "Snowflake", "Protheus", "Oracle", "SQL Server", "Figma", "IA", "Power Automate", "Sheets",
];

export function limpar(texto: string | null | undefined, max: number): string {
  return (texto || "").replace(/\s+/g, " ").trim().slice(0, max);
}

/** Aceita só endereço http(s) de verdade; o resto vira vazio em vez de link quebrado. */
export function linkValido(bruto: string | null | undefined): string | null {
  const v = (bruto || "").trim();
  if (!v) return null;
  const comEsquema = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(comEsquema);
    return u.hostname.includes(".") ? u.toString() : null;
  } catch {
    return null;
  }
}

export function ferramentasValidas(bruto: unknown): string[] {
  const lista = Array.isArray(bruto) ? bruto : String(bruto || "").split(",");
  const limpas = lista.map((f) => limpar(String(f), 24)).filter(Boolean);
  return [...new Set(limpas)].slice(0, LIMITES.ferramentas);
}

/** O que falta para o projeto poder ir para revisão. Lista vazia significa pronto. */
export function pendenciasDoProjeto(p: Partial<Projeto>): string[] {
  const faltas: string[] = [];
  if (limpar(p.titulo, LIMITES.titulo).length < 5) faltas.push("um título com pelo menos 5 letras");
  if (limpar(p.resumo, LIMITES.resumo).length < 20) faltas.push("um resumo de uma frase (mínimo 20 letras)");
  if (!p.cover_url) faltas.push("uma imagem do projeto");
  if (!(p.ferramentas ?? []).length) faltas.push("pelo menos uma ferramenta usada");
  if (!limpar(p.problema, 500) && !limpar(p.descricao, 500)) faltas.push("o problema que o projeto resolve");
  return faltas;
}
