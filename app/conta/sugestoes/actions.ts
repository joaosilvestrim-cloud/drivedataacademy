"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendHtmlEmail } from "@/lib/email";
import { avisarTime } from "@/lib/notificacoes";

/* Canal de sugestões. Entra como chamado da categoria "sugestao", então usa o
   que já existe: fila no admin, aviso piscando no menu, resposta e histórico.
   A diferença é que aqui a IA não responde: sugestão é para o time ler. */

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");

export async function enviarSugestao(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const assunto = ((formData.get("subject") as string) || "").trim();
  const mensagem = ((formData.get("message") as string) || "").trim();
  const sobre = ((formData.get("about") as string) || "plataforma").trim();
  if (assunto.length < 3 || mensagem.length < 5) {
    redirect("/conta/sugestoes?erro=" + encodeURIComponent("Escreva um título e conte a ideia com um pouco mais de detalhe."));
  }

  const rotulo = sobre === "conteudo" ? "Conteúdo" : sobre === "comunidade" ? "Comunidade" : "Plataforma";
  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("support_tickets")
    .insert({
      user_id: user.id,
      email: user.email,
      subject: `[${rotulo}] ${assunto}`,
      category: "sugestao",
      status: "open",
      last_actor: "user",
    })
    .select("id")
    .single();

  if (ticket) {
    await admin.from("support_messages").insert({ ticket_id: ticket.id, author: "user", body: mensagem });
    await avisarTime("chamado_ajuda", (para) =>
      sendHtmlEmail(
        para,
        `Nova sugestão: ${assunto}`,
        `<p style="font-family:Arial">Sugestão de <b>${user.email}</b> sobre ${rotulo.toLowerCase()}.</p><p style="font-family:Arial;color:#475569">${mensagem.replace(/</g, "&lt;")}</p><p><a href="${SITE_URL}/admin/suporte">Abrir no painel</a></p>`
      )
    );
  }

  revalidatePath("/conta/sugestoes");
  redirect("/conta/sugestoes?ok=1");
}
