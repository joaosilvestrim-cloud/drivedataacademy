// O que a assinatura pode incluir. Usado no admin (seleção), na página de matrícula
// (bullets) e no controle de acesso da ferramenta.
export const SUB_INCLUDES: { key: string; label: string }[] = [
  { key: "cursos", label: "Todos os cursos e trilhas" },
  { key: "ferramenta", label: "Ferramenta de Visuais (Power BI)" },
  { key: "comunidade", label: "Comunidade e networking" },
  { key: "lives", label: "Lives e mentorias ao vivo" },
  { key: "certificados", label: "Certificados de conclusão" },
];

export const DEFAULT_INCLUDES = SUB_INCLUDES.map((i) => i.key).join(",");

export function parseIncludes(csv?: string | null): string[] {
  const raw = (csv ?? "").trim();
  if (!raw) return SUB_INCLUDES.map((i) => i.key); // padrão: inclui tudo
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/* Desconto do plano anual à vista sobre doze mensalidades, em pontos
   percentuais. Arredonda para baixo: a página nunca promete mais desconto do
   que o preço entrega. Zero quando falta um dos preços ou não há desconto. */
export function descontoAnual(mensal: number, anual: number): number {
  if (!(mensal > 0) || !(anual > 0)) return 0;
  const cheio = mensal * 12;
  if (anual >= cheio) return 0;
  return Math.floor((1 - anual / cheio) * 100);
}
