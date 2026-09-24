/* Reenvia o e-mail de "crie sua senha" para quem já tem conta e nunca entrou.

   O caso típico: assinante criado à mão, o e-mail saiu, e a pessoa só foi
   olhar dias depois. O código daquele e-mail é de uso único e expira, então
   não adianta pedir para ela procurar a mensagem antiga: o caminho é gerar um
   novo e mandar de novo.

   Só o ÚLTIMO código enviado vale. Rodar isto invalida o anterior, o que é
   exatamente o que se quer, mas vale lembrar se a pessoa estiver com os dois
   e-mails abertos na frente.

   Uso: npx tsx scripts/reenviar-codigo.ts <email> */

import fs from "fs";
import Module from "module";

const resolver = (Module as any)._resolveFilename;
(Module as any)._resolveFilename = function (req: string, ...rest: any[]) {
  if (req === "server-only") return require.resolve("./_vazio.js");
  return resolver.call(this, req, ...rest);
};

for (const l of fs.readFileSync(".env.local", "utf8").split("\n")) {
  if (!l.includes("=") || l.startsWith("#")) continue;
  const i = l.indexOf("=");
  const chave = l.slice(0, i).trim();
  if (!process.env[chave]) process.env[chave] = l.slice(i + 1).trim().replace(/^"|"$/g, "");
}

import { createClient } from "@supabase/supabase-js";

/* lib/email.ts importa "server-only", que não é pacote de verdade: é um
   marcador que o Next resolve no build. O shim acima cobre isso, mas só em
   import dinâmico, porque import estático é resolvido antes de este arquivo
   rodar. E o módulo usa cache() do React, que fora do Next não existe. */
const emails = async () => {
  const React = require("react");
  if (typeof React.cache !== "function") React.cache = (fn: any) => fn;
  return import("../lib/email");
};

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

async function acharUsuario(email: string) {
  for (let page = 1; page < 20; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const achou = (data?.users ?? []).find((u) => (u.email || "").toLowerCase() === email);
    if (achou) return achou;
    if (!data || data.users.length < 1000) return null;
  }
  return null;
}

async function main() {
  const email = (process.argv[2] || "").trim().toLowerCase();
  if (!email) {
    console.error("uso: npx tsx scripts/reenviar-codigo.ts <email>");
    process.exit(1);
  }

  const user = await acharUsuario(email);
  if (!user) {
    console.error(`não existe conta com ${email}. Para criar um assinante do zero, use scripts/criar-assinante.ts.`);
    process.exit(1);
  }

  /* Quem já entrou alguma vez tem senha. Mandar um código de criação de senha
     para essa pessoa confunde: o texto do e-mail diz que a conta acabou de
     nascer. Nesse caso o caminho dela é "Esqueci minha senha". */
  if (user.last_sign_in_at) {
    console.error(
      `${email} já entrou na plataforma em ${new Date(user.last_sign_in_at).toLocaleString("pt-BR")}.\n` +
        "Esta conta tem senha. Se ela esqueceu, o caminho é 'Esqueci minha senha' na tela de entrar.",
    );
    process.exit(1);
  }

  const { data: perfil } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const nome = perfil?.full_name || (user.user_metadata as any)?.full_name || "";

  const { data: assinatura } = await admin
    .from("memberships")
    .select("plan, status, source, expires_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  console.log(`conta   : ${email}`);
  console.log(`nome    : ${nome || "(sem nome no perfil)"}`);
  console.log(`acesso  : ${assinatura ? `${assinatura.plan} por ${assinatura.source}, até ${String(assinatura.expires_at).slice(0, 10)}` : "SEM ASSINATURA ATIVA"}`);

  if (!assinatura) {
    console.error("\nSem assinatura ativa: o e-mail diria que o acesso está liberado quando não está. Abortei.");
    process.exit(1);
  }

  const { data: link, error } = await admin.auth.admin.generateLink({ type: "recovery", email } as any);
  const codigo = ((link as any)?.properties?.email_otp as string) || "";
  if (error || !codigo) {
    console.error("não consegui gerar o código:", error?.message || "resposta sem email_otp");
    process.exit(1);
  }

  const r = await (await emails()).sendAccountSetupEmail(email, nome, codigo, null);
  console.log(`\ncódigo novo gerado e e-mail ${r.sent ? "ENVIADO" : "NÃO enviado: " + (r.reason || "motivo desconhecido")}`);
  if (r.sent) console.log("O código anterior deixou de valer. Só o último enviado funciona.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
