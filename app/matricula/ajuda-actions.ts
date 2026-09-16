"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendHtmlEmail } from "@/lib/email";
import { avisarTime } from "@/lib/notificacoes";
import { MOTIVOS } from "@/lib/ajuda-checkout";

/* Pedido de ajuda de quem está tentando assinar.

   Quem não conseguiu pagar, ou pagou e não recebeu o código, não tem conta e
   por isso não consegue abrir chamado pela área do aluno. Este atalho grava o
   mesmo tipo de chamado, sem login, e liga ao usuário quando o e-mail já
   existe. Não tem IA no meio: é formulário com cara de conversa. */

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function abrirChamadoCheckout(dados: {
  motivo: string;
  nome: string;
  email: string;
  telefone?: string;
  mensagem: string;
}): Promise<{ ok: true; protocolo: string } | { ok: false; erro: string }> {
  const nome = (dados.nome || "").trim();
  const email = (dados.email || "").trim().toLowerCase();
  const mensagem = (dados.mensagem || "").trim();
  const telefone = (dados.telefone || "").trim();
  const motivo = MOTIVOS[dados.motivo] ? dados.motivo : "outro";

  if (nome.length < 2) return { ok: false, erro: "Escreva seu nome." };
  if (!EMAIL_OK.test(email)) return { ok: false, erro: "Confira o e-mail digitado." };
  if (mensagem.length < 5) return { ok: false, erro: "Conte com um pouco mais de detalhe o que aconteceu." };

  const admin = createAdminClient();

  // Se a pessoa já tem conta, o chamado fica preso nela e aparece na Ajuda.
  let userId: string | null = null;
  const lookup = await admin.rpc("user_id_by_email", { p_email: email });
  if (!lookup.error) userId = (lookup.data as string | null) ?? null;

  const assunto = `[Assinatura] ${MOTIVOS[motivo]}`;
  const { data: ticket, error } = await admin
    .from("support_tickets")
    .insert({ user_id: userId, email, subject: assunto, category: "financeiro", status: "open", last_actor: "user" })
    .select("id")
    .single();
  if (error || !ticket) return { ok: false, erro: "Não consegui registrar agora. Tente de novo em um minuto." };

  const corpo = [`Nome: ${nome}`, telefone ? `WhatsApp: ${telefone}` : "", "", mensagem].filter(Boolean).join("\n");
  await admin.from("support_messages").insert({ ticket_id: ticket.id, author: "user", body: corpo });

  await avisarTime("chamado_ajuda", (para) =>
    sendHtmlEmail(
      para,
      `Ajuda na assinatura: ${MOTIVOS[motivo]}`,
      `<p style="font-family:Arial">Pedido de ajuda no checkout.</p>
       <p style="font-family:Arial"><b>${nome}</b> · ${email}${telefone ? " · " + telefone : ""}</p>
       <p style="font-family:Arial;color:#475569">${mensagem.replace(/</g, "&lt;")}</p>
       <p><a href="${SITE_URL}/admin/suporte">Abrir no painel</a></p>`
    )
  );

  return { ok: true, protocolo: ticket.id.slice(0, 8).toUpperCase() };
}
