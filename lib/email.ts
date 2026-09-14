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
export async function sendHtmlEmail(to: string, subject: string, html: string, remetente?: string): Promise<{ sent: boolean; reason?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: "not-configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: resolveFrom(remetente), to, subject, html }),
    });
    if (!res.ok) return { sent: false, reason: `resend-${res.status}` };
    return { sent: true };
  } catch {
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
export async function sendAccessGrantedEmail(to: string, name: string, siteUrl: string) {
  const firstName = esc((name || "").split(" ")[0] || "");
  const body = `
    <p style="margin:0 0 16px;color:#cbd5e1">Olá${firstName ? ", " + firstName : ""}! Seu acesso à DriveData Academy foi liberado. 🎉</p>
    <p style="margin:0 0 20px;color:#cbd5e1">Agora você tem acesso à <b style="color:#fff">comunidade, às lives e às gravações</b>, às ferramentas e ao preço de assinante nos treinamentos.</p>
    <a href="${siteUrl}/conta" style="display:inline-block;background:#15c47e;color:#04140d;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px">Entrar na plataforma</a>
    <p style="margin:24px 0 0;color:#64748b;font-size:12px">Bons estudos!</p>`;
  return sendHtmlEmail(to, "Seu acesso foi liberado 🎉", shell("Bem-vindo(a)!", body), "RESEND_FROM_CONTA");
}

// Treinamento comprado pelo assinante: pagamento confirmado, curso liberado.
export async function sendCoursePurchasedEmail(to: string, name: string, courseTitle: string, courseUrl: string) {
  const firstName = esc((name || "").split(" ")[0] || "");
  const body = `
    <p style="margin:0 0 16px;color:#cbd5e1">Olá${firstName ? ", " + firstName : ""}! Seu pagamento foi confirmado.</p>
    <p style="margin:0 0 20px;color:#cbd5e1">O treinamento <b style="color:#fff">${esc(courseTitle)}</b> já está liberado na sua conta.</p>
    <a href="${courseUrl}" style="display:inline-block;background:#15c47e;color:#04140d;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px">Começar agora</a>
    <p style="margin:24px 0 0;color:#64748b;font-size:12px">Bons estudos!</p>`;
  return sendHtmlEmail(to, `Treinamento liberado: ${courseTitle}`, shell("Treinamento liberado", body), "RESEND_FROM_CONTA");
}

// Correção de um desafio do Knowledge Universe: aprovado ou devolvido.
export async function sendChallengeReviewEmail(
  to: string, name: string, challengeTitle: string,
  approved: boolean, feedback: string, siteUrl: string, qualityPercent?: number | null
) {
  const firstName = esc((name || "").split(" ")[0] || "");
  const body = approved
    ? `
    <p style="margin:0 0 16px;color:#cbd5e1">Olá${firstName ? ", " + firstName : ""}! Sua entrega foi aprovada. 🎉</p>
    <p style="margin:0 0 6px;color:#fff;font-size:17px;font-weight:700">${esc(challengeTitle)}</p>
    ${qualityPercent != null ? `<p style="margin:0 0 16px;color:#15c47e;font-size:14px">Qualidade avaliada: ${qualityPercent}%</p>` : ""}
    <div style="margin:0 0 20px;padding:14px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)">
      <p style="margin:0 0 6px;color:#94a3b8;font-size:12px;font-weight:700">RETORNO DA EQUIPE</p>
      <p style="margin:0;color:#cbd5e1;font-size:14px;line-height:1.6">${esc(feedback)}</p>
    </div>
    <p style="margin:0 0 20px;color:#cbd5e1">A evidência já entrou no seu universo de conhecimento.</p>
    <a href="${siteUrl}/universo" style="display:inline-block;background:#15c47e;color:#04140d;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px">Ver meu universo</a>`
    : `
    <p style="margin:0 0 16px;color:#cbd5e1">Olá${firstName ? ", " + firstName : ""}! Demos uma olhada na sua entrega e ela precisa de ajustes antes de ser aprovada.</p>
    <p style="margin:0 0 6px;color:#fff;font-size:17px;font-weight:700">${esc(challengeTitle)}</p>
    <div style="margin:14px 0 20px;padding:14px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)">
      <p style="margin:0 0 6px;color:#94a3b8;font-size:12px;font-weight:700">O QUE AJUSTAR</p>
      <p style="margin:0;color:#cbd5e1;font-size:14px;line-height:1.6">${esc(feedback)}</p>
    </div>
    <p style="margin:0 0 20px;color:#cbd5e1">Você pode reenviar quantas vezes precisar. Faz parte do processo.</p>
    <a href="${siteUrl}/conta/desafios" style="display:inline-block;background:#15c47e;color:#04140d;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px">Reenviar minha entrega</a>`;
  return sendHtmlEmail(
    to,
    approved ? `Desafio aprovado: ${challengeTitle} 🎉` : `Sua entrega precisa de ajustes: ${challengeTitle}`,
    shell(approved ? "Entrega aprovada!" : "Quase lá", body)
  );
}

// Conta criada após a confirmação do pagamento: aluno define a senha por este link.
// Sai pelo remetente de conta (RESEND_FROM_CONTA), separado do remetente de
// materiais de marketing. Sem essa variável, usa RESEND_FROM como antes.
// Bloco do código de acesso, igual nos dois e-mails que o usam.
function blocoCodigo(codigo: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;width:100%;background:rgba(21,196,126,.08);border:1px solid rgba(21,196,126,.35);border-radius:14px">
      <tr><td style="padding:18px 16px;text-align:center">
        <p style="margin:0 0 6px;color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">Seu código de acesso</p>
        <p style="margin:0;color:#fff;font-size:30px;font-weight:700;letter-spacing:.28em;font-family:'Courier New',monospace">${esc(codigo)}</p>
      </td></tr>
    </table>`;
}

/* Conta criada depois do pagamento. Manda um código, não um link de uso único:
   filtros como o do Outlook abrem links antes da pessoa e gastam o token. O
   botão só leva para a tela onde o código é digitado, então pode ser aberto
   por qualquer robô sem estragar nada. */
export async function sendAccountSetupEmail(to: string, name: string, codigo: string) {
  const firstName = esc((name || "").split(" ")[0] || "");
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");
  const tela = `${site}/redefinir-senha?email=${encodeURIComponent(to)}`;
  const body = `
    <p style="margin:0 0 14px;color:#cbd5e1">Olá${firstName ? ", " + firstName : ""}! Seu pagamento foi confirmado e sua conta na DriveData Academy já está criada. 🎉</p>
    <p style="margin:0 0 20px;color:#cbd5e1">Falta só um passo: criar a senha que você vai usar para entrar. Use o código abaixo.</p>
    ${codigo ? blocoCodigo(codigo) : ""}
    <a href="${tela}" style="display:inline-block;background:#15c47e;color:#04140d;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px">Criar minha senha</a>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0;width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px">
      <tr><td style="padding:14px 16px">
        <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">Seu login</p>
        <p style="margin:0;color:#fff;font-size:15px">${esc(to)}</p>
      </td></tr>
    </table>
    <p style="margin:20px 0 0;color:#94a3b8;font-size:13px;line-height:1.6">O código vale por tempo limitado. Se expirar, peça outro em <a href="${site}/esqueci-senha" style="color:#15c47e">Criar ou trocar senha</a> usando este mesmo e-mail.</p>
    <p style="margin:12px 0 0;color:#64748b;font-size:12px">Se você não fez essa compra, ignore este e-mail.</p>`;
  return sendHtmlEmail(to, "Pagamento confirmado: crie sua senha de acesso", shell("Sua conta está pronta", body), "RESEND_FROM_CONTA");
}

// Código para criar ou trocar a senha, pedido em /esqueci-senha.
export async function sendAccessCodeEmail(to: string, codigo: string) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");
  const tela = `${site}/redefinir-senha?email=${encodeURIComponent(to)}`;
  const body = `
    <p style="margin:0 0 20px;color:#cbd5e1">Recebemos um pedido para criar ou trocar a senha da sua conta. Digite este código na tela de senha.</p>
    ${blocoCodigo(codigo)}
    <a href="${tela}" style="display:inline-block;background:#15c47e;color:#04140d;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px">Digitar o código</a>
    <p style="margin:20px 0 0;color:#94a3b8;font-size:13px;line-height:1.6">O código vale por tempo limitado e só o último pedido funciona.</p>
    <p style="margin:12px 0 0;color:#64748b;font-size:12px">Se não foi você, ignore este e-mail. Sua senha continua a mesma.</p>`;
  return sendHtmlEmail(to, `Seu código de acesso: ${codigo}`, shell("Código de acesso", body), "RESEND_FROM_CONTA");
}

// Confirmação de compra de workshop avulso: manda o link/acesso.
export async function sendWorkshopEmail(to: string, name: string, workshopTitle: string, when: string, link: string | null) {
  const firstName = esc((name || "").split(" ")[0] || "");
  const body = `
    <p style="margin:0 0 16px;color:#cbd5e1">Olá${firstName ? ", " + firstName : ""}! Seu pagamento foi confirmado e sua vaga no workshop está garantida. 🎉</p>
    <p style="margin:0 0 6px;color:#fff;font-size:18px;font-weight:700">${esc(workshopTitle)}</p>
    <p style="margin:0 0 20px;color:#cbd5e1">${esc(when)}</p>
    ${link ? `<a href="${link}" style="display:inline-block;background:#15c47e;color:#04140d;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px">Acessar o workshop</a>` : `<p style="margin:0;color:#cbd5e1">Enviaremos o link de acesso perto do horário.</p>`}
    <p style="margin:24px 0 0;color:#64748b;font-size:12px">Nos vemos lá!</p>`;
  return sendHtmlEmail(to, `Confirmado: ${workshopTitle}`, shell("Vaga garantida! 🎟️", body));
}

// Aviso interno de novo pedido/intenção de matrícula (antes do pagamento automático).
export async function sendOrderNotice(adminTo: string, data: { name: string; email: string; phone?: string | null; amount?: number | null }) {
  const body = `
    <p style="margin:0 0 12px;color:#cbd5e1">Nova intenção de matrícula no acesso full:</p>
    <p style="margin:0 0 6px;color:#fff"><b>${esc(data.name)}</b></p>
    <p style="margin:0 0 6px;color:#cbd5e1">${esc(data.email)}</p>
    ${data.phone ? `<p style="margin:0 0 6px;color:#cbd5e1">WhatsApp: ${esc(data.phone)}</p>` : ""}
    ${data.amount != null ? `<p style="margin:0 0 6px;color:#cbd5e1">Valor: R$ ${data.amount.toFixed(2)}</p>` : ""}
    <p style="margin:16px 0 0;color:#64748b;font-size:12px">Confirme o pagamento e libere em Admin → Vendas → Acessos.</p>`;
  return sendHtmlEmail(adminTo, "Nova matrícula (acesso full)", shell("Nova matrícula", body));
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
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: "not-configured" };

  const from = resolveFrom();
  const subj = subject?.trim() || `Seu material: ${materialTitle}`;
  const firstName = esc((name || "").split(" ")[0] || "");
  const extra = message?.trim() ? `<p style="margin:0 0 16px;color:#475569">${esc(message.trim())}</p>` : "";
  const button = fileUrl
    ? `<a href="${fileUrl}" style="display:inline-block;background:#15c47e;color:#04140d;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px">Acessar o material</a>`
    : "";

  const html = `<!doctype html><html><body style="margin:0;background:#0b1220;padding:32px 0;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#0f172a;border:1px solid rgba(255,255,255,.08);border-radius:20px;overflow:hidden">
        <tr><td style="padding:32px">
          <p style="margin:0 0 4px;font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#15c47e;font-weight:700">DriveData Academy</p>
          <h1 style="margin:0 0 16px;color:#fff;font-size:22px">Olá${firstName ? ", " + firstName : ""}! 👋</h1>
          <p style="margin:0 0 16px;color:#cbd5e1">Aqui está o conteúdo que você solicitou:</p>
          <p style="margin:0 0 20px;color:#fff;font-size:18px;font-weight:700">${esc(materialTitle)}</p>
          ${extra}
          ${button}
          <p style="margin:24px 0 0;color:#64748b;font-size:12px">Se você não solicitou este material, pode ignorar este e-mail.</p>
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
