import { tr } from "@/lib/i18n/traduzir-servidor";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBrandedEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const metadata = { title: "Recomendação confirmada · DriveData Academy", robots: { index: false } };

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");

/* O link do e-mail de confirmação cai aqui. Conferido o código, a
   recomendação passa a esperar a aprovação do aluno, e ele é avisado. */
export default async function Confirmar({ params, searchParams }: { params: { token: string }; searchParams: { c?: string } }) {
  const admin = createAdminClient();
  const { data: rec } = await admin
    .from("portfolio_recomendacoes")
    .select("id, user_id, status, codigo_email, autor_nome")
    .eq("token", params.token)
    .maybeSingle();

  let titulo = "Link inválido";
  let texto = "Este link de confirmação não é válido. Se você escreveu uma recomendação, use o link do e-mail mais recente.";

  if (rec && rec.status === "aguardando_email" && rec.codigo_email && rec.codigo_email === searchParams.c) {
    await admin
      .from("portfolio_recomendacoes")
      .update({ status: "aguardando_aprovacao", confirmado_em: new Date().toISOString(), codigo_email: null })
      .eq("id", rec.id);
    titulo = "Recomendação confirmada";
    texto = "Obrigado! Ela foi para a aprovação de quem pediu e, aprovada, aparece no portfólio com seu nome e cargo.";

    // Avisa o aluno. Falha de e-mail não desfaz a confirmação.
    try {
      const { data: u } = await admin.auth.admin.getUserById(rec.user_id);
      if (u?.user?.email) {
        await sendBrandedEmail(
          u.user.email,
          "Você recebeu uma recomendação",
          "Chegou uma recomendação",
          `<p style="margin:0 0 20px;color:#cbd5e1">${(rec.autor_nome || "Um colega").replace(/[<>&]/g, "")} {tr("escreveu uma recomendação para o seu portfólio. Leia e decida se ela aparece no seu site.")}</p>
           <a href="${SITE}/conta/portfolio" style="display:inline-block;background:#15c47e;color:#04140d;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px">{tr("Ver a recomendação")}</a>`,
          { kind: "recomendacao-recebida" },
        );
      }
    } catch {}
  } else if (rec && (rec.status === "aguardando_aprovacao" || rec.status === "aprovada")) {
    titulo = "Já confirmada";
    texto = "Esta recomendação já tinha sido confirmada. Obrigado!";
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-24 text-tinta">
      <p className="text-sm text-acento">{tr("DriveData Academy")}</p>
      <h1 className="mt-2 font-display text-3xl font-bold">{titulo}</h1>
      <p className="mt-4 text-slate-300">{texto}</p>
    </main>
  );
}
