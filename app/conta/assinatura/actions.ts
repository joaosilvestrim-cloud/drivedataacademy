"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { avisarTime } from "@/lib/notificacoes";
import { sendHtmlEmail } from "@/lib/email";
import { assinaturaDoAluno, cancelarNoAsaas } from "@/lib/assinatura";
import { MOTIVOS, MOTIVOS_VALIDOS } from "@/lib/assinatura-motivos";
import { reembolsarNoAsaas, registrarReembolso } from "@/lib/reembolso";

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
  if (assinatura.cancelamentoPedidoEm) volta("Esta assinatura já está cancelada.");

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

/* Reembolso pelo próprio aluno, dentro de 7 dias úteis da compra.

   Mesma ordem do cancelamento, pelo mesmo motivo: o Asaas primeiro, porque é
   onde o dinheiro está. Com o reembolso aceito lá:

   1. a recorrência é cancelada (se ainda não estava), para não cobrar de novo;
   2. o pedido vira "refunded" e o acesso termina na hora (lib/reembolso.ts);
   3. fica o registro em Cancelamentos e vão os avisos, ao aluno e ao time.

   Se o Asaas recusar, o acesso não é cortado e nada é marcado como devolvido:
   o time recebe o pedido com alerta e faz na mão. O aluno não perde o direito
   por causa de uma API fora do ar. O webhook PAYMENT_REFUNDED confirma depois,
   e é idempotente com o que foi feito aqui. */
export async function pedirReembolso(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const motivo = ((formData.get("motivo") as string) || "").trim();
  const detalhe = ((formData.get("detalhe") as string) || "").trim().slice(0, 2000);
  const confirma = (formData.get("confirma") as string) === "sim";
  const volta = (erro: string) => redirect("/conta/assinatura?erro=" + encodeURIComponent(erro));

  if (!MOTIVOS_VALIDOS.has(motivo as any)) volta("Escolha o motivo do reembolso.");
  if (motivo === "outro" && detalhe.length < 5) volta("Conte em uma linha o que aconteceu, para a gente entender.");
  if (!confirma) volta("Marque a confirmação para pedir o reembolso.");

  const admin = createAdminClient();
  const assinatura = await assinaturaDoAluno(admin, user.id);
  // O prazo é conferido aqui de novo: a tela pode ter ficado aberta desde ontem.
  if (!assinatura.reembolso.pode || !assinatura.reembolso.pagamentoId || !assinatura.orderId) {
    volta("O prazo de reembolso desta compra já passou. Você ainda pode cancelar a renovação.");
  }

  // 1. Recorrência: para de cobrar antes de devolver.
  let cancelamentoOk: boolean | null = null;
  let cancelamentoResposta: string | null = null;
  if (assinatura.recorrente && assinatura.asaasSubscriptionId && !assinatura.cancelamentoPedidoEm) {
    const r = await cancelarNoAsaas(assinatura.asaasSubscriptionId);
    cancelamentoOk = r.ok;
    cancelamentoResposta = r.resposta;
  }

  // 2. Reembolso no Asaas.
  const reembolso = await reembolsarNoAsaas(assinatura.reembolso.pagamentoId!);

  // 3. Aqui: só corta acesso e marca devolvido se o Asaas aceitou.
  const { data: pedido } = await admin.from("orders").select("*").eq("id", assinatura.orderId!).maybeSingle();
  if (reembolso.ok && pedido) await registrarReembolso(admin, pedido);

  const respostaAsaas = [
    cancelamentoResposta ? `Recorrência: ${cancelamentoResposta}` : null,
    `Reembolso: ${reembolso.ok ? "aceito" : "RECUSADO"} · ${reembolso.resposta}`,
  ].filter(Boolean).join(" | ");
  const observacao = `Reembolso pedido pelo aluno${reembolso.ok ? "" : " (falhou no Asaas: o time precisa fazer na mão)"}.`;

  if (assinatura.cancelamentoPedidoEm) {
    // Já tinha cancelado: o registro é o mesmo, só ganha o reembolso.
    const { data: anterior } = await admin
      .from("subscription_cancellations")
      .select("id, detalhe, asaas_resposta")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (anterior)
      await admin
        .from("subscription_cancellations")
        .update({
          detalhe: [anterior.detalhe, observacao, detalhe].filter(Boolean).join("\n").slice(0, 2000),
          asaas_resposta: [anterior.asaas_resposta, respostaAsaas].filter(Boolean).join(" | ").slice(0, 1000),
        })
        .eq("id", anterior.id);
  } else {
    await admin.from("subscription_cancellations").insert({
      user_id: user.id,
      email: user.email,
      order_id: assinatura.orderId,
      asaas_subscription_id: assinatura.asaasSubscriptionId,
      plano: assinatura.plano,
      motivo,
      detalhe: [observacao, detalhe].filter(Boolean).join("\n"),
      acesso_ate: reembolso.ok ? new Date().toISOString() : assinatura.acessoAte,
      asaas_ok: cancelamentoOk,
      asaas_resposta: respostaAsaas.slice(0, 1000),
    });
    if (!reembolso.ok && assinatura.recorrente) {
      await admin.from("memberships").update({ status: "canceled" }).eq("user_id", user.id).eq("source", "subscription");
    }
  }

  const valor = assinatura.valor != null ? Number(assinatura.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "o valor pago";
  const rotulo = MOTIVOS.find((m) => m.id === motivo)?.label ?? motivo;
  const alerta = reembolso.ok ? "" : " — O ASAAS RECUSOU, FAÇA O REEMBOLSO NA MÃO";
  await avisarTime("cancelamento", (para) =>
    sendHtmlEmail(
      para,
      `Reembolso pedido pelo aluno: ${user.email}${alerta}`,
      `<p style="font-family:Arial">O aluno <b>${user.email}</b> pediu reembolso dentro de 7 dias úteis da compra.</p>` +
        [`Valor: ${valor}`, `Motivo: ${rotulo}`, detalhe ? `Detalhe: ${detalhe}` : null, `Resposta do Asaas: ${respostaAsaas}`]
          .filter(Boolean)
          .map((l) => `<p style="font-family:Arial;margin:2px 0;color:#475569">${String(l).replace(/</g, "&lt;")}</p>`)
          .join("") +
        `<p><a href="${SITE_URL}/admin/cancelamentos">Abrir no painel</a></p>`,
    ),
  );
  if (user.email) {
    await sendHtmlEmail(
      user.email,
      reembolso.ok ? "Seu reembolso foi solicitado" : "Recebemos seu pedido de reembolso",
      reembolso.ok
        ? `<p style="font-family:Arial">Seu reembolso de <b>${valor}</b> foi solicitado e a assinatura foi encerrada.</p>` +
            `<p style="font-family:Arial;color:#475569">O valor volta pelo mesmo meio de pagamento. No Pix, costuma cair em poucos minutos. No cartão, o estorno pode aparecer em até duas faturas, conforme o banco.</p>` +
            `<p style="font-family:Arial;color:#475569">Obrigado por ter experimentado a DriveData Academy.</p>`
        : `<p style="font-family:Arial">Recebemos seu pedido de reembolso de <b>${valor}</b>. A cobrança automática não conseguiu concluir agora, então o nosso time faz isso em até 1 dia útil e te avisa por aqui.</p>`,
    ).catch(() => {});
  }

  revalidatePath("/conta/assinatura");
  redirect(reembolso.ok ? "/conta/assinatura?reembolsada=1" : "/conta/assinatura?reembolso_pendente=1");
}
