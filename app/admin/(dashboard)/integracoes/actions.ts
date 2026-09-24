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

/* Manda para o Conta Azul o que já foi pago e ainda não virou venda.

   Em lote pequeno de propósito. A API tem limite de vazão, e a pessoa está
   olhando uma tela: é melhor voltar rápido com um número e deixar clicar de
   novo do que segurar a requisição até o servidor cortar. Repetir continua de
   onde parou, porque a idempotência é por cobrança do Asaas. */
export async function enviarPendentesCA() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  const { enviarPendentes } = await import("@/lib/conta-azul-venda");
  let r;
  try {
    r = await enviarPendentes(25);
  } catch (e) {
    redirect("/admin/integracoes?erro=" + encodeURIComponent((e as Error).message.slice(0, 200)));
  }

  revalidatePath("/admin/integracoes");
  const partes = [`${r.enviadas} enviada(s)`];
  if (r.falhas) partes.push(`${r.falhas} com erro`);
  if (r.puladas) partes.push(`${r.puladas} sem dado para enviar`);
  redirect("/admin/integracoes?ok=" + encodeURIComponent(partes.join(", ") + "."));
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
