"use server";

import type { VisualDocument } from "@/lib/editor/types";

// Publicação na galeria da comunidade chega numa próxima fase.
// Mantém a assinatura que o PublishModal espera.
export async function publicarVisual(_input: { nome: string; descricao: string; doc: VisualDocument; tags: string[] }) {
  return { ok: false as const, error: "A publicação na galeria chega em breve." };
}
