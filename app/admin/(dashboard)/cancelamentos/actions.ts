"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { assinaturasAtivasNoAsaas } from "@/lib/assinatura";

/* Cancelamento que não saiu no Asaas e foi resolvido à mão no painel de lá.

   O alerta não sai só porque alguém clicou: o botão pergunta ao Asaas, e só
   marca como resolvido se não houver mais nenhuma assinatura ativa para o
   e-mail. Assim a fila nunca esconde uma cobrança que continua de pé. */
export async function conferirNoAsaas(formData: FormData) {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");
  const id = (formData.get("id") as string) || "";
  const db = createAdminClient();

  const { data: c } = await db.from("subscription_cancellations").select("id, email, asaas_resposta").eq("id", id).maybeSingle();
  if (!c?.email) redirect("/admin/cancelamentos?erro=" + encodeURIComponent("Registro não encontrado."));

  const r = await assinaturasAtivasNoAsaas(c!.email);
  if (!r.ok) redirect("/admin/cancelamentos?erro=" + encodeURIComponent(`${c!.email}: ${r.erro}`));
  if (r.ok && r.ativas.length) {
    redirect("/admin/cancelamentos?erro=" + encodeURIComponent(`${c!.email} ainda tem assinatura ativa no Asaas: ${r.ativas.join(", ")}. Cancele lá e confira de novo.`));
  }

  const quando = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date());
  const vistas = r.ok ? r.vistas.join("; ") : "";
  await db
    .from("subscription_cancellations")
    .update({
      asaas_ok: true,
      asaas_resposta: `Resolvido à mão e conferido no Asaas em ${quando} por ${admin!.email}: nenhuma assinatura ativa (${vistas || "nenhuma assinatura"}). Erro original: ${c!.asaas_resposta || "—"}`.slice(0, 1000),
    })
    .eq("id", id);

  revalidatePath("/admin/cancelamentos");
  redirect("/admin/cancelamentos?ok=" + encodeURIComponent(`Conferido: ${c!.email} não tem mais cobrança recorrente no Asaas.`));
}
