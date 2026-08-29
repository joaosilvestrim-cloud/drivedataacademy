"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { VisualDocument } from "@/lib/editor/types";

interface SalvarInput {
  savedId: string | null;
  templateId: string | null;
  nome: string;
  doc: VisualDocument;
  dax: string;
}

export async function salvarVisual(input: SalvarInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Faça login para salvar." };

  const nome = input.nome.trim() || "Sem nome";

  if (input.savedId) {
    const { error } = await supabase
      .from("saved_visuals")
      .update({ nome, config: input.doc, dax_gerado: input.dax })
      .eq("id", input.savedId)
      .eq("user_id", user.id);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/conta/ferramenta");
    return { ok: true as const, id: input.savedId };
  }

  const { data, error } = await supabase
    .from("saved_visuals")
    .insert({ user_id: user.id, template_id: input.templateId, nome, config: input.doc, dax_gerado: input.dax })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/conta/ferramenta");
  return { ok: true as const, id: data.id as string };
}

export async function excluirVisual(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Não autenticado." };
  const { error } = await supabase.from("saved_visuals").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/conta/ferramenta");
  return { ok: true as const };
}
