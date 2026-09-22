"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendDemoAccessEmail } from "@/lib/email";

/* Cadastro da demonstração, feito pela própria pessoa durante a live.

   Não exige conta e não passa pelo time: o objetivo é justamente receber
   quem ainda não é aluno, várias pessoas ao mesmo tempo, sem ninguém digitando
   e-mail no admin ao vivo.

   A ordem aqui é pensada para a pessoa nunca ficar no meio do caminho:

     1. confere a campanha e a palavra-chave;
     2. grava o lead, que é o que interessa para o time mesmo se o resto
        falhar;
     3. cria a conta e libera o acesso;
     4. devolve o código na própria tela, e manda por e-mail também.

   O código aparece na tela de propósito. Numa live ninguém vai abrir o e-mail
   no meio da transmissão, e mandar a pessoa esperar é perder ela ali. */

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const so = (s: string) => s.replace(/[^a-z0-9]/gi, "").toLowerCase();

export async function pedirDemonstracao(formData: FormData) {
  const slug = (formData.get("slug") as string) || "";
  const texto = (c: string) => ((formData.get(c) as string) || "").trim();
  const volta = (erro: string) => redirect(`/demo/${slug}?erro=${encodeURIComponent(erro)}`);

  const admin = createAdminClient();
  const { data: campanha } = await admin
    .from("demo_invites")
    .select("id, titulo, palavra, dias, ativo, limite")
    .eq("slug", slug)
    .maybeSingle();

  if (!campanha) volta("Não encontrei esta demonstração.");
  if (!campanha!.ativo) volta("Esta demonstração está encerrada.");

  if (campanha!.limite) {
    const { count } = await admin
      .from("demo_signups").select("id", { count: "exact", head: true }).eq("invite_id", campanha!.id);
    if ((count ?? 0) >= campanha!.limite) volta("As vagas desta demonstração acabaram.");
  }

  const name = texto("name");
  const email = texto("email").toLowerCase();
  const phone = texto("phone");
  if (name.length < 3) volta("Escreva seu nome.");
  if (!EMAIL_OK.test(email)) volta("Confira o e-mail digitado.");
  if (so(phone).length < 10) volta("Confira o telefone, com DDD.");
  if (campanha!.palavra && so(texto("palavra")) !== so(campanha!.palavra)) {
    volta("A palavra-chave não confere. Ela aparece na tela da live.");
  }

  // 2. O lead primeiro. Se o passo da conta falhar, o contato não se perde.
  await admin.from("demo_signups").upsert(
    { invite_id: campanha!.id, name, email, phone, consent: formData.get("consent") === "on", origem: slug },
    { onConflict: "invite_id,email" },
  );

  // 3. Conta e acesso.
  let userId: string | null = null;
  let nova = false;
  for (let page = 1; page < 20; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const achou = (data?.users ?? []).find((u) => (u.email || "").toLowerCase() === email);
    if (achou) { userId = achou.id; break; }
    if (!data || data.users.length < 1000) break;
  }
  if (!userId) {
    const senha = "Dd" + Math.random().toString(36).slice(2, 10) + "!9";
    const { data: criado, error } = await admin.auth.admin.createUser({
      email, password: senha, email_confirm: true, user_metadata: { full_name: name },
    });
    if (error || !criado?.user) volta("Não consegui criar seu acesso agora. Tente de novo em um minuto.");
    userId = criado!.user!.id;
    nova = true;
  }
  await admin.from("demo_signups").update({ user_id: userId }).eq("invite_id", campanha!.id).eq("email", email);
  await admin.from("profiles").upsert({ id: userId, full_name: name, phone }, { onConflict: "id" });

  const ate = new Date(Date.now() + campanha!.dias * 864e5).toISOString();
  await admin.from("demo_access").upsert(
    { user_id: userId, expires_at: ate, created_by: `demo:${slug}`, note: campanha!.titulo },
    { onConflict: "user_id" },
  );

  /* 4. O código. Conta nova recebe o OTP para criar a senha; conta que já
        existe entra com a senha dela, e mandar um código confundiria. */
  let codigo = "";
  if (nova) {
    const { data: link } = await admin.auth.admin.generateLink({ type: "recovery", email } as any);
    codigo = ((link as any)?.properties?.email_otp as string) || "";
  }
  await sendDemoAccessEmail(email, name, codigo || null, ate).catch(() => {});

  redirect(`/demo/${slug}?ok=1&nova=${nova ? 1 : 0}&codigo=${encodeURIComponent(codigo)}`);
}
