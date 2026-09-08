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
