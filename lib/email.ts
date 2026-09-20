import { tradutorDoEmail } from "@/lib/i18n/email";
import "server-only";

type SendMaterialArgs = {
  to: string;
  name: string;
  materialTitle: string;
  fileUrl: string | null;
  subject?: string | null;
  message?: string | null;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Resolve um remetente válido. Se RESEND_FROM estiver vazio/malformado
// (ex.: "Nome <onboarding@>"), cai no domínio de teste do Resend.
/* Normaliza um remetente vindo da Vercel. Aceita "email", "Nome <email>" e
   também "Nome email", com ou sem aspas em volta. Devolve null se não achar um
   email válido. Antes, "Nome email" sem os sinais < > caía no remetente de
   teste do Resend, que só entrega para o dono da conta. */
function remetenteValido(valor: string | undefined): string | null {
  const raw = (valor || "").trim().replace(/^["']|["']$/g, "").trim();
  if (!raw) return null;
  const email = raw.match(/[^\s<>"']+@[^\s<>"']+\.[^\s<>"']+/)?.[0];
  if (!email) return null;
  const nome = raw.replace(email, "").replace(/[<>"']/g, "").trim();
  return nome ? `${nome} <${email}>` : email;
}

function resolveFrom(preferencia?: string): string {
  // A variável específica vence a geral. Se ela estiver inválida, tenta a geral
  // antes de cair no remetente de teste.
  return (
    (preferencia ? remetenteValido(process.env[preferencia]) : null) ||
    remetenteValido(process.env.RESEND_FROM) ||
    "DriveData Academy <onboarding@resend.dev>"
  );
}

// Nome amigável do anexo a partir do título + extensão da URL.
function attachmentName(title: string, url: string): string {
  const clean = url.split("?")[0];
  const ext = (clean.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  const base =
    (title || "material")
      .normalize("NFD")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 50) || "material";
  return ext ? `${base}.${ext}` : base;
}

// Baixa o arquivo e devolve um anexo em base64 (ou null se falhar/grande demais).
async function buildAttachment(title: string, url: string | null) {
  if (!url) return null;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length === 0 || buf.length > 15 * 1024 * 1024) return null; // até ~15MB
    return { filename: attachmentName(title, url), content: buf.toString("base64") };
  } catch {
    return null;
  }
}

// Envio genérico via Resend. Sem chave configurada, retorna { sent: false }.
export type EmailMeta = { kind?: string; orderId?: string | null };

/* Cada envio fica em email_log, enviado ou não. É o que o painel de operação
   usa para conferir se quem pagou recebeu o código. O registro nunca derruba
   o envio: se a tabela não existir ainda, o erro é engolido. */
async function registrarEmail(to: string, subject: string, meta: EmailMeta | undefined, status: "sent" | "failed", reason?: string, providerId?: string) {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    await createAdminClient().from("email_log").insert({
      to_email: to, subject, kind: meta?.kind || "outro", status, reason: reason || null, provider_id: providerId || null, order_id: meta?.orderId || null,
    });
  } catch { /* sem registro, sem drama */ }
}

export async function sendHtmlEmail(to: string, subject: string, html: string, remetente?: string, meta?: EmailMeta): Promise<{ sent: boolean; reason?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) { await registrarEmail(to, subject, meta, "failed", "not-configured"); return { sent: false, reason: "not-configured" }; }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: resolveFrom(remetente), to, subject, html }),
    });
    if (!res.ok) {
      const corpo = (await res.text().catch(() => "")).slice(0, 300);
      const reason = `resend-${res.status}${corpo ? ": " + corpo : ""}`;
      await registrarEmail(to, subject, meta, "failed", reason);
      return { sent: false, reason: `resend-${res.status}` };
    }
    const json = await res.json().catch(() => ({}));
    await registrarEmail(to, subject, meta, "sent", undefined, json?.id);
    return { sent: true };
  } catch {
    await registrarEmail(to, subject, meta, "failed", "network");
    return { sent: false, reason: "network" };
  }
}

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0b1220;padding:32px 0;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#0f172a;border:1px solid rgba(255,255,255,.08);border-radius:20px;overflow:hidden">
        <tr><td style="padding:32px">
          <p style="margin:0 0 4px;font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#15c47e;font-weight:700">DriveData Academy</p>
          <h1 style="margin:0 0 16px;color:#fff;font-size:22px">${esc(title)}</h1>
          ${bodyHtml}
        </td></tr>
      </table>
      <p style="margin:16px 0 0;color:#64748b;font-size:12px">© DriveData Academy</p>
    </td></tr></table>
  </body></html>`;
}

// Boas-vindas quando o aluno ganha acesso full.
export async function sendAccessGrantedEmail(to: string, name: string, siteUrl: string, orderId?: string | null) {
  const f = await tradutorDoEmail(to);
  const firstName = esc((name || "").split(" ")[0] || "");
  const body = `
    <p style="margin:0 0 16px;color:#cbd5e1">${f("Olá")}${firstName ? ", " + firstName : ""}! ${f("Seu acesso à DriveData Academy foi liberado. 🎉")}</p>
    <p style="margin:0 0 20px;color:#cbd5e1">${f("Agora você tem acesso à")} <b style="color:#fff">${f("comunidade, às lives e às gravações")}</b>, ${f("às ferramentas e ao preço de assinante nos treinamentos.")}</p>
    <a href="${siteUrl}/conta" style="display:inline-block;background:#15c47e;color:#04140d;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px">${f("Entrar na plataforma")}</a>
    <p style="margin:24px 0 0;color:#64748b;font-size:12px">${f("Bons estudos!")}</p>`;
  return sendHtmlEmail(to, f("Seu acesso foi liberado 🎉"), shell(f("Bem-vindo(a)!"), body), "RESEND_FROM_CONTA", { kind: "acesso", orderId });
}

// Treinamento comprado pelo assinante: pagamento confirmado, curso liberado.
export async function sendCoursePurchasedEmail(to: string, name: string, courseTitle: string, courseUrl: string) {
  const f = await tradutorDoEmail(to);
  const firstName = esc((name || "").split(" ")[0] || "");
  const body = `
    <p style="margin:0 0 16px;color:#cbd5e1">${f("Olá")}${firstName ? ", " + firstName : ""}! ${f("Seu pagamento foi confirmado.")}</p>
    <p style="margin:0 0 20px;color:#cbd5e1">${f("O treinamento")} <b style="color:#fff">${esc(courseTitle)}</b> ${f("já está liberado na sua conta.")}</p>
    <a href="${courseUrl}" style="display:inline-block;background:#15c47e;color:#04140d;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px">${f("Começar agora")}</a>
    <p style="margin:24px 0 0;color:#64748b;font-size:12px">${f("Bons estudos!")}</p>`;
  return sendHtmlEmail(to, `${f("Treinamento liberado")}: ${courseTitle}`, shell(f("Treinamento liberado"), body), "RESEND_FROM_CONTA", { kind: "curso" });
}

// Correção de um desafio do Knowledge Universe: aprovado ou devolvido.
export async function sendChallengeReviewEmail(
  to: string, name: string, challengeTitle: string,
  approved: boolean, feedback: string, siteUrl: string, qualityPercent?: number | null
) {
  const f = await tradutorDoEmail(to);
  const firstName = esc((name || "").split(" ")[0] || "");
  const body = approved
    ? `
    <p style="margin:0 0 16px;color:#cbd5e1">${f("Olá")}${firstName ? ", " + firstName : ""}! ${f("Sua entrega foi aprovada. 🎉")}</p>
    <p style="margin:0 0 6px;color:#fff;font-size:17px;font-weight:700">${esc(challengeTitle)}</p>
    ${qualityPercent != null ? `<p style="margin:0 0 16px;color:#15c47e;font-size:14px">Qualidade avaliada: ${qualityPercent}%</p>` : ""}
    <div style="margin:0 0 20px;padding:14px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)">
      <p style="margin:0 0 6px;color:#94a3b8;font-size:12px;font-weight:700">${f("RETORNO DA EQUIPE")}</p>
      <p style="margin:0;color:#cbd5e1;font-size:14px;line-height:1.6">${esc(feedback)}</p>
    </div>
    <p style="margin:0 0 20px;color:#cbd5e1">${f("A evidência já entrou no seu universo de conhecimento.")}</p>
    <a href="${siteUrl}/universo" style="display:inline-block;background:#15c47e;color:#04140d;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px">Ver meu universo</a>`
    : `
    <p style="margin:0 0 16px;color:#cbd5e1">${f("Olá")}${firstName ? ", " + firstName : ""}! ${f("Demos uma olhada na sua entrega e ela precisa de ajustes antes de ser aprovada.")}</p>
    <p style="margin:0 0 6px;color:#fff;font-size:17px;font-weight:700">${esc(challengeTitle)}</p>
    <div style="margin:14px 0 20px;padding:14px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)">
      <p style="margin:0 0 6px;color:#94a3b8;font-size:12px;font-weight:700">${f("O QUE AJUSTAR")}</p>
      <p style="margin:0;color:#cbd5e1;font-size:14px;line-height:1.6">${esc(feedback)}</p>
    </div>
    <p style="margin:0 0 20px;color:#cbd5e1">${f("Você pode reenviar quantas vezes precisar. Faz parte do processo.")}</p>
    <a href="${siteUrl}/conta/desafios" style="display:inline-block;background:#15c47e;color:#04140d;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px">Reenviar minha entrega</a>`;
  return sendHtmlEmail(
    to,
    approved ? `${f("Desafio aprovado")}: ${challengeTitle} 🎉` : `${f("Sua entrega precisa de ajustes")}: ${challengeTitle}`,
    shell(approved ? f("Entrega aprovada!") : f("Quase lá"), body)
  );
}

// Conta criada após a confirmação do pagamento: aluno define a senha por este link.
// Sai pelo remetente de conta (RESEND_FROM_CONTA), separado do remetente de
// materiais de marketing. Sem essa variável, usa RESEND_FROM como antes.
// Bloco do código de acesso, igual nos dois e-mails que o usam.
function blocoCodigo(codigo: string, f: (s: string) => string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;width:100%;background:rgba(21,196,126,.08);border:1px solid rgba(21,196,126,.35);border-radius:14px">
      <tr><td style="padding:18px 16px;text-align:center">
        <p style="margin:0 0 6px;color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">${f("Seu código de acesso")}</p>
        <p style="margin:0;color:#fff;font-size:30px;font-weight:700;letter-spacing:.28em;font-family:'Courier New',monospace">${esc(codigo)}</p>
      </td></tr>
    </table>`;
}

/* Conta criada depois do pagamento. Manda um código, não um link de uso único:
   filtros como o do Outlook abrem links antes da pessoa e gastam o token. O
   botão só leva para a tela onde o código é digitado, então pode ser aberto
   por qualquer robô sem estragar nada. */
export async function sendAccountSetupEmail(to: string, name: string, codigo: string, orderId?: string | null) {
  const f = await tradutorDoEmail(to);
  const firstName = esc((name || "").split(" ")[0] || "");
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");
  const tela = `${site}/redefinir-senha?email=${encodeURIComponent(to)}`;
  const body = `
    <p style="margin:0 0 14px;color:#cbd5e1">${f("Olá")}${firstName ? ", " + firstName : ""}! ${f("Seu pagamento foi confirmado e sua conta na DriveData Academy já está criada. 🎉")}</p>
    <p style="margin:0 0 20px;color:#cbd5e1">${f("Falta só um passo: criar a senha que você vai usar para entrar. Use o código abaixo.")}</p>
    ${codigo ? blocoCodigo(codigo, f) : ""}
    <a href="${tela}" style="display:inline-block;background:#15c47e;color:#04140d;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px">Criar minha senha</a>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0;width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px">
      <tr><td style="padding:14px 16px">
        <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">${f("Seu login")}</p>
        <p style="margin:0;color:#fff;font-size:15px">${esc(to)}</p>
      </td></tr>
    </table>
    <p style="margin:20px 0 0;color:#94a3b8;font-size:13px;line-height:1.6">${f("O código vale por tempo limitado. Se expirar, peça outro em")} <a href="${site}/esqueci-senha" style="color:#15c47e">Criar ou trocar senha</a> ${f("usando este mesmo e-mail.")}</p>
    <p style="margin:12px 0 0;color:#64748b;font-size:12px">${f("Se você não fez essa compra, ignore este e-mail.")}</p>`;
  return sendHtmlEmail(to, f("Pagamento confirmado: crie sua senha de acesso"), shell(f("Sua conta está pronta"), body), "RESEND_FROM_CONTA", { kind: "conta", orderId });
}

// Acesso de demonstração: login temporário que mostra a área do assinante e
// libera só o DriveCanvas. Com código quando a conta é nova (a pessoa cria a
// senha), sem código quando ela já tinha conta.
export async function sendDemoAccessEmail(to: string, name: string, codigo: string | null, ate: string) {
  const f = await tradutorDoEmail(to);
  const firstName = esc((name || "").split(" ")[0] || "");
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");
  const fim = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(ate));
  const botao = codigo
    ? `<a href="${site}/redefinir-senha?email=${encodeURIComponent(to)}" style="display:inline-block;background:#15c47e;color:#04140d;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px">Criar senha e entrar</a>`
    : `<a href="${site}/entrar" style="display:inline-block;background:#15c47e;color:#04140d;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px">${f("Entrar na Academy")}</a>`;
  const body = `
    <p style="margin:0 0 14px;color:#cbd5e1">${f("Olá")}${firstName ? ", " + firstName : ""}! ${f("Liberamos para você um acesso de demonstração à DriveData Academy.")}</p>
    <p style="margin:0 0 20px;color:#cbd5e1">${f("Você vai ver a área completa do assinante, e pode usar à vontade o")} <b style="color:#fff">DriveCanvas</b>, ${f("nossa ferramenta de visuais HTML e SVG para o Power BI. O acesso vale até")} <b style="color:#fff">${esc(fim)}</b>.</p>
    ${codigo ? `<p style="margin:0 0 12px;color:#cbd5e1">${f("Para entrar, crie sua senha com o código abaixo.")}</p>${blocoCodigo(codigo, f)}` : ""}
    ${botao}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0;width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px">
      <tr><td style="padding:14px 16px">
        <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">${f("Seu login")}</p>
        <p style="margin:0;color:#fff;font-size:15px">${esc(to)}</p>
      </td></tr>
    </table>
    <p style="margin:20px 0 0;color:#94a3b8;font-size:13px;line-height:1.6">${f("Gostou? Assinando, você libera tudo: cursos, lives, gravações, comunidade e todas as ferramentas.")}</p>`;
  return sendHtmlEmail(to, f("Seu acesso de demonstração à DriveData Academy"), shell(f("Acesso de demonstração"), body), "RESEND_FROM_CONTA", { kind: "demo" });
}

// Código para criar ou trocar a senha, pedido em /esqueci-senha.
export async function sendAccessCodeEmail(to: string, codigo: string) {
  const f = await tradutorDoEmail(to);
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");
  const tela = `${site}/redefinir-senha?email=${encodeURIComponent(to)}`;
  const body = `
    <p style="margin:0 0 20px;color:#cbd5e1">${f("Recebemos um pedido para criar ou trocar a senha da sua conta. Digite este código na tela de senha.")}</p>
    ${blocoCodigo(codigo, f)}
    <a href="${tela}" style="display:inline-block;background:#15c47e;color:#04140d;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px">${f("Digitar o código")}</a>
    <p style="margin:20px 0 0;color:#94a3b8;font-size:13px;line-height:1.6">${f("O código vale por tempo limitado e só o último pedido funciona.")}</p>
    <p style="margin:12px 0 0;color:#64748b;font-size:12px">${f("Se não foi você, ignore este e-mail. Sua senha continua a mesma.")}</p>`;
  return sendHtmlEmail(to, `${f("Seu código de acesso")}: ${codigo}`, shell(f("Código de acesso"), body), "RESEND_FROM_CONTA", { kind: "codigo" });
}

// Confirmação de compra de workshop avulso: manda o link/acesso.
export async function sendWorkshopEmail(to: string, name: string, workshopTitle: string, when: string, link: string | null) {
  const f = await tradutorDoEmail(to);
  const firstName = esc((name || "").split(" ")[0] || "");
  const body = `
    <p style="margin:0 0 16px;color:#cbd5e1">${f("Olá")}${firstName ? ", " + firstName : ""}! ${f("Seu pagamento foi confirmado e sua vaga no workshop está garantida. 🎉")}</p>
    <p style="margin:0 0 6px;color:#fff;font-size:18px;font-weight:700">${esc(workshopTitle)}</p>
    <p style="margin:0 0 20px;color:#cbd5e1">${esc(when)}</p>
    ${link ? `<a href="${link}" style="display:inline-block;background:#15c47e;color:#04140d;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px">${f("Acessar o workshop")}</a>` : `<p style="margin:0;color:#cbd5e1">${f("Enviaremos o link de acesso perto do horário.")}</p>`}
    <p style="margin:24px 0 0;color:#64748b;font-size:12px">${f("Nos vemos lá!")}</p>`;
  return sendHtmlEmail(to, `${f("Confirmado")}: ${workshopTitle}`, shell(f("Vaga garantida! 🎟️"), body));
}

// Certificado de participação na live, emitido pelo formulário do QR code.
export async function sendLiveCertificateEmail(to: string, name: string, liveTitle: string, code: string) {
  const f = await tradutorDoEmail(to);
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");
  const url = `${site}/certificado/${code}`;
  const firstName = esc((name || "").split(" ")[0] || "");
  const body = `
    <p style="margin:0 0 16px;color:#cbd5e1">${f("Olá")}${firstName ? ", " + firstName : ""}! ${f("Obrigado por participar da transmissão.")}</p>
    <p style="margin:0 0 6px;color:#fff;font-size:18px;font-weight:700">${esc(liveTitle)}</p>
    <p style="margin:0 0 20px;color:#cbd5e1">${f("Seu certificado de participação está pronto. O código")} <b style="color:#fff">${esc(code)}</b> ${f("serve para qualquer pessoa validar.")}</p>
    <a href="${url}" style="display:inline-block;background:#15c47e;color:#04140d;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px">${f("Ver e baixar o certificado")}</a>
    <p style="margin:24px 0 0;color:#64748b;font-size:12px">${f("Guarde este e-mail: o link vale para sempre.")}</p>`;
  return sendHtmlEmail(to, `${f("Seu certificado")}: ${liveTitle}`, shell(f("Certificado de participação"), body), "RESEND_FROM_CONTA", { kind: "certificado-live" });
}

// Aviso interno de novo pedido/intenção de matrícula (antes do pagamento automático).
export async function sendOrderNotice(adminTo: string, data: { name: string; email: string; phone?: string | null; amount?: number | null }) {
  const f = await tradutorDoEmail(adminTo);
  const body = `
    <p style="margin:0 0 12px;color:#cbd5e1">${f("Nova intenção de matrícula no acesso full:")}</p>
    <p style="margin:0 0 6px;color:#fff"><b>${esc(data.name)}</b></p>
    <p style="margin:0 0 6px;color:#cbd5e1">${esc(data.email)}</p>
    ${data.phone ? `<p style="margin:0 0 6px;color:#cbd5e1">WhatsApp: ${esc(data.phone)}</p>` : ""}
    ${data.amount != null ? `<p style="margin:0 0 6px;color:#cbd5e1">Valor: R$ ${data.amount.toFixed(2)}</p>` : ""}
    <p style="margin:16px 0 0;color:#64748b;font-size:12px">${f("Confirme o pagamento e libere em Admin → Vendas → Acessos.")}</p>`;
  return sendHtmlEmail(adminTo, "Nova matrícula (acesso full)", shell(f("Nova matrícula"), body));
}

// Envia o conteúdo por e-mail via Resend. Se a chave não estiver configurada,
// retorna { sent: false } e o app entrega o link na própria página.
export async function sendMaterialEmail({
  to,
  name,
  materialTitle,
  fileUrl,
  subject,
  message,
}: SendMaterialArgs): Promise<{ sent: boolean; reason?: string }> {
  const f = await tradutorDoEmail(to);
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: "not-configured" };

  const from = resolveFrom();
  const subj = subject?.trim() || `${f("Seu material")}: ${materialTitle}`;
  const firstName = esc((name || "").split(" ")[0] || "");
  const extra = message?.trim() ? `<p style="margin:0 0 16px;color:#475569">${esc(message.trim())}</p>` : "";
  const button = fileUrl
    ? `<a href="${fileUrl}" style="display:inline-block;background:#15c47e;color:#04140d;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px">${f("Acessar o material")}</a>`
    : "";

  const html = `<!doctype html><html><body style="margin:0;background:#0b1220;padding:32px 0;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#0f172a;border:1px solid rgba(255,255,255,.08);border-radius:20px;overflow:hidden">
        <tr><td style="padding:32px">
          <p style="margin:0 0 4px;font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#15c47e;font-weight:700">DriveData Academy</p>
          <h1 style="margin:0 0 16px;color:#fff;font-size:22px">${f("Olá")}${firstName ? ", " + firstName : ""}! 👋</h1>
          <p style="margin:0 0 16px;color:#cbd5e1">${f("Aqui está o conteúdo que você solicitou:")}</p>
          <p style="margin:0 0 20px;color:#fff;font-size:18px;font-weight:700">${esc(materialTitle)}</p>
          ${extra}
          ${button}
          <p style="margin:24px 0 0;color:#64748b;font-size:12px">${f("Se você não solicitou este material, pode ignorar este e-mail.")}</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;color:#64748b;font-size:12px">© DriveData Academy</p>
    </td></tr></table>
  </body></html>`;

  const attachment = await buildAttachment(materialTitle, fileUrl);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject: subj,
        html,
        ...(attachment ? { attachments: [attachment] } : {}),
      }),
    });
    if (!res.ok) {
      return { sent: false, reason: `resend-${res.status}` };
    }
    return { sent: true };
  } catch {
    return { sent: false, reason: "network" };
  }
}
