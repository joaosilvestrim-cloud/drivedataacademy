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
