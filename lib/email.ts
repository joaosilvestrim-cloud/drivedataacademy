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
function resolveFrom(): string {
  const fallback = "DriveData Academy <onboarding@resend.dev>";
  const raw = (process.env.RESEND_FROM || "").trim();
  if (!raw) return fallback;
  const m = raw.match(/<([^>]+)>/);
  const addr = (m ? m[1] : raw).trim();
  // exige algo@dominio.tld
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) return raw;
  return fallback;
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
export async function sendHtmlEmail(to: string, subject: string, html: string): Promise<{ sent: boolean; reason?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: "not-configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: resolveFrom(), to, subject, html }),
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
    <p style="margin:0 0 20px;color:#cbd5e1">Agora você tem acesso a <b style="color:#fff">todos os cursos</b>, avaliações e certificados.</p>
    <a href="${siteUrl}/conta" style="display:inline-block;background:#15c47e;color:#04140d;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px">Entrar na plataforma</a>
    <p style="margin:24px 0 0;color:#64748b;font-size:12px">Bons estudos!</p>`;
  return sendHtmlEmail(to, "Seu acesso foi liberado 🎉", shell("Bem-vindo(a)!", body));
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
export async function sendAccountSetupEmail(to: string, name: string, setPasswordUrl: string) {
  const firstName = esc((name || "").split(" ")[0] || "");
  const body = `
    <p style="margin:0 0 16px;color:#cbd5e1">Olá${firstName ? ", " + firstName : ""}! Seu pagamento foi confirmado e sua conta na DriveData Academy está pronta. 🎉</p>
    <p style="margin:0 0 20px;color:#cbd5e1">Para começar, defina a sua senha de acesso:</p>
    <a href="${setPasswordUrl}" style="display:inline-block;background:#15c47e;color:#04140d;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px">Criar minha senha</a>
    <p style="margin:24px 0 0;color:#64748b;font-size:12px">O link é pessoal. Se não foi você, ignore este e-mail.</p>`;
  return sendHtmlEmail(to, "Pagamento confirmado — crie sua senha 🎉", shell("Sua conta está pronta!", body));
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
