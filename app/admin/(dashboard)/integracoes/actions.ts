"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { desconectar } from "@/lib/conta-azul";

const CHAVES = ["ca_categoria_id", "ca_centro_custo_id", "ca_servico_id"] as const;

export async function salvarConfigCA(formData: FormData) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  const admin = createAdminClient();
  const linhas = CHAVES.map((chave) => ({
    chave,
    valor: ((formData.get(chave) as string) || "").trim(),
    atualizado: new Date().toISOString(),
  }));

  /* O interruptor só liga com o essencial preenchido.

     Sem categoria e sem serviço a venda é recusada pela Conta Azul, e o erro
     apareceria lá na frente, no meio de um pagamento de aluno, em vez de
     aqui, onde a pessoa está justamente configurando. */
  const querLigar = formData.get("ca_ativo") === "on";
  const temEssencial = linhas.find((l) => l.chave === "ca_categoria_id")?.valor && linhas.find((l) => l.chave === "ca_servico_id")?.valor;
  if (querLigar && !temEssencial) {
    await admin.from("integracao_config").upsert(linhas, { onConflict: "chave" });
    redirect("/admin/integracoes?erro=" + encodeURIComponent("Escolha a categoria e o serviço antes de ligar o envio."));
  }

  linhas.push({ chave: "ca_ativo" as any, valor: querLigar ? "true" : "false", atualizado: new Date().toISOString() });
  const { error } = await admin.from("integracao_config").upsert(linhas, { onConflict: "chave" });
  if (error) redirect("/admin/integracoes?erro=" + encodeURIComponent(error.message));

  revalidatePath("/admin/integracoes");
  redirect("/admin/integracoes?ok=" + encodeURIComponent(querLigar ? "Salvo. Novos pagamentos viram venda no Conta Azul." : "Salvo. O envio está desligado."));
}

export async function desconectarContaAzul() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  await desconectar();
  /* Desconectar não desliga o envio sozinho seria uma armadilha: os próximos
     pagamentos tentariam criar venda sem token e cairiam em erro silencioso. */
  await createAdminClient().from("integracao_config").upsert(
    { chave: "ca_ativo", valor: "false", atualizado: new Date().toISOString() },
    { onConflict: "chave" },
  );
  revalidatePath("/admin/integracoes");
  redirect("/admin/integracoes?ok=" + encodeURIComponent("Conta Azul desconectado e envio desligado."));
}
