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

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: subj, html }),
    });
    if (!res.ok) {
      return { sent: false, reason: `resend-${res.status}` };
    }
    return { sent: true };
  } catch {
    return { sent: false, reason: "network" };
  }
}
