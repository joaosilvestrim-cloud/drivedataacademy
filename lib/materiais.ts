/* Materiais prontos: constantes e formatação usadas no admin e na área do aluno.
   Sem "server-only" porque o componente de envio, que roda no navegador, também
   usa o tamanho legível e o nome do bucket. */

export const BUCKET_MATERIAIS = "materiais-prontos";

export const CATEGORIAS: { key: string; label: string; icon: string }[] = [
  { key: "powerbi", label: "Power BI", icon: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
  { key: "template", label: "Templates", icon: "M4 4h16v16H4zM4 9h16M9 9v11" },
  { key: "planilha", label: "Planilhas e bases", icon: "M3 5h18v14H3zM3 10h18M3 15h18M9 5v14" },
  { key: "outro", label: "Outros", icon: "M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" },
];

export function categoria(key: string | null | undefined) {
  return CATEGORIAS.find((c) => c.key === key) ?? CATEGORIAS[CATEGORIAS.length - 1];
}

export function tamanhoLegivel(bytes: number | null | undefined): string {
  const b = Number(bytes || 0);
  if (b <= 0) return "";
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} KB`;
  const mb = b / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1).replace(".", ",") : Math.round(mb)} MB`;
}

export function extensao(nome: string | null | undefined): string {
  const m = String(nome || "").match(/\.([a-z0-9]{1,6})$/i);
  return m ? m[1].toUpperCase() : "";
}
