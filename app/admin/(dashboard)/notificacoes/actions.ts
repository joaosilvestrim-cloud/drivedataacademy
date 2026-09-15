"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { salvarConfigAvisos, TIPOS_AVISO, type TipoAviso } from "@/lib/notificacoes";

export async function salvarNotificacoes(formData: FormData) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  const brutos = String(formData.get("destinatarios") || "").split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);
  const invalidos = brutos.filter((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  if (invalidos.length) redirect(`/admin/notificacoes?error=${encodeURIComponent(`E-mail inválido: ${invalidos.join(", ")}`)}`);

  const ativos = Object.fromEntries((Object.keys(TIPOS_AVISO) as TipoAviso[]).map((k) => [k, formData.get(`ativo_${k}`) === "on"])) as Record<TipoAviso, boolean>;
  const { error } = await salvarConfigAvisos(createAdminClient(), { destinatarios: brutos, ativos });
  if (error) redirect(`/admin/notificacoes?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin/notificacoes");
  const ligados = Object.values(ativos).filter(Boolean).length;
  redirect(`/admin/notificacoes?ok=${encodeURIComponent(ligados ? `Salvo. ${ligados} aviso${ligados === 1 ? "" : "s"} ligado${ligados === 1 ? "" : "s"}.` : "Salvo. Todos os avisos estão desligados.")}`);
}
