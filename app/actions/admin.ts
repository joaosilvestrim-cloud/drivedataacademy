"use server";

import type { VisualDocument } from "@/lib/editor/types";

// Criação de templates pelo admin chega numa próxima fase.
// Mantém a assinatura que o TemplateModal espera.
export async function criarTemplate(_input: { nome: string; descricao: string; premium: boolean; formato: string; definicao: VisualDocument }) {
  return { ok: false as const, error: "Salvar como template chega em breve." };
}
