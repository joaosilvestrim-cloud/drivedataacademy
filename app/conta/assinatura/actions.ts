"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { avisarTime } from "@/lib/notificacoes";
import { sendHtmlEmail } from "@/lib/email";
import { assinaturaDoAluno, cancelarNoAsaas } from "@/lib/assinatura";
import { MOTIVOS, MOTIVOS_VALIDOS } from "@/lib/assinatura-motivos";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");

/* Cancelamento pelo próprio aluno.

   A ordem aqui importa e é de propósito:

   1. cancela a recorrência no Asaas;
   2. grava o pedido, com o resultado da chamada;
   3. marca o membership como cancelado.

   O Asaas vem primeiro porque é o único passo que tira dinheiro do cartão de
   alguém. Se ele falhar, o registro entra com asaas_ok = false e aparece no
   painel do time, que cancela na mão. O contrário, gravar antes e falhar o
   DELETE, deixaria o aluno achando que cancelou enquanto a fatura chega.

   O acesso não cai na hora. O mês já foi pago, então vale até o fim dele. */

export async function cancelarAssinatura(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const motivo = ((formData.get("motivo") as string) || "").trim();
  const detalhe = ((formData.get("detalhe") as string) || "").trim().slice(0, 2000);
  const confirma = (formData.get("confirma") as string) === "sim";

  const volta = (erro: string) => redirect("/conta/assinatura?erro=" + encodeURIComponent(erro));

  if (!MOTIVOS_VALIDOS.has(motivo as any)) volta("Escolha o motivo do cancelamento.");
  if (motivo === "outro" && detalhe.length < 5) volta("Conte em uma linha o que aconteceu, para a gente entender.");
  if (!confirma) volta("Marque a confirmação para concluir o cancelamento.");

  const admin = createAdminClient();
  const assinatura = await assinaturaDoAluno(admin, user.id);
  if (!assinatura.ativa) volta("Não encontrei uma assinatura ativa nesta conta.");

  // 1. Asaas
  let asaasOk: boolean | null = null;
  let asaasResposta: string | null = null;
  if (assinatura.recorrente && assinatura.asaasSubscriptionId) {
    const r = await cancelarNoAsaas(assinatura.asaasSubscriptionId);
    asaasOk = r.ok;
    asaasResposta = r.resposta;
  }

  // 2. Registro. Entra mesmo com o Asaas falhando: a intenção do aluno não
  //    pode depender de API de terceiro estar de pé.
  await admin.from("subscription_cancellations").insert({
    user_id: user.id,
    email: user.email,
    order_id: assinatura.orderId,
    asaas_subscription_id: assinatura.asaasSubscriptionId,
    plano: assinatura.plano,
    motivo,
    detalhe: detalhe || null,
    acesso_ate: assinatura.acessoAte,
    asaas_ok: asaasOk,
    asaas_resposta: asaasResposta,
  });

  // 3. Acesso: marca como cancelado mas mantém a data. O gate de acesso olha
  //    status e expires_at, então quem pagou o mês continua entrando até o fim.
  if (assinatura.acessoAte) {
    await admin.from("memberships").update({ status: "canceled" }).eq("user_id", user.id).eq("source", "subscription");
  }

  const rotulo = MOTIVOS.find((m) => m.id === motivo)?.label ?? motivo;
  // O assunto avisa na hora quando o Asaas recusou: nesse caso alguém precisa
  // cancelar na mão, e o e-mail é o único lugar onde isso aparece rápido.
  const alerta = asaasOk === false ? " — O ASAAS RECUSOU, CANCELE NA MÃO" : "";
  const linhas = [
    `Plano: ${assinatura.rotulo}`,
    `Motivo: ${rotulo}`,
    detalhe ? `Detalhe: ${detalhe}` : null,
    assinatura.asaasSubscriptionId ? `Assinatura no Asaas: ${assinatura.asaasSubscriptionId}` : "Plano sem recorrência no Asaas",
    assinatura.acessoAte ? `Acesso até: ${assinatura.acessoAte.slice(0, 10)}` : null,
    asaasResposta ? `Resposta do Asaas: ${asaasResposta}` : null,
  ].filter(Boolean) as string[];
  await avisarTime("cancelamento", (para) =>
    sendHtmlEmail(
      para,
      `Cancelamento de assinatura: ${user.email}${alerta}`,
      `<p style="font-family:Arial">O aluno <b>${user.email}</b> cancelou pela própria tela.</p>` +
        linhas.map((l) => `<p style="font-family:Arial;margin:2px 0;color:#475569">${l.replace(/</g, "&lt;")}</p>`).join("") +
        `<p><a href="${SITE_URL}/admin/cancelamentos">Abrir no painel</a></p>`,
    ),
  );

  revalidatePath("/conta/assinatura");
  redirect("/conta/assinatura?cancelada=1");
}
