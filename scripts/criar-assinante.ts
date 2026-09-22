/* Cria um assinante à mão, igual a uma compra confirmada.

   Serve para venda fechada fora do site, cortesia combinada ou migração: a
   pessoa precisa entrar na plataforma como assinante, sem ter passado pelo
   checkout.

   Faz exatamente o que o webhook do Asaas faz num PAYMENT_CONFIRMED de
   assinatura, na mesma ordem, para a conta nascer idêntica a uma compra real:

     1. pedido com status paid, produto subscription, gateway manual;
     2. conta de acesso, com e-mail já confirmado;
     3. perfil;
     4. membership source=subscription, plan=full, 35 dias (o mesmo prazo que
        cada pagamento renova);
     5. selo de Fundador;
     6. e-mail "crie sua senha", com o código de acesso.

   O gateway fica "manual" de propósito: é o que diz, olhando o pedido depois,
   que não houve dinheiro entrando pelo Asaas. Assim a conciliação não procura
   uma cobrança que nunca existiu, e a tela de assinatura do aluno não oferece
   cancelar uma recorrência que não existe.

   Uso: npx tsx scripts/criar-assinante.ts <email> ["Nome Completo"] */

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

/* O lib/email.ts importa "server-only", que não existe como pacote: é um
   marcador que o Next resolve no build. O shim acima cobre isso, mas só
   funciona em import dinâmico, porque import estático é resolvido antes de
   qualquer linha deste arquivo rodar. */
const emails = async () => {
  /* O lib/email.ts usa cache() do React para não consultar o idioma da pessoa
     duas vezes na mesma renderização. Fora do runtime do Next esse cache não
     existe, e o módulo quebra ao carregar. Aqui não há renderização nenhuma,
     então a função sem cache faz o mesmo trabalho. */
  const React = require("react");
  if (typeof React.cache !== "function") React.cache = (fn: any) => fn;
  return import("../lib/email");
};

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");

async function acharUsuario(email: string): Promise<{ id: string; jaEntrou: boolean } | null> {
  let page = 1;
  for (;;) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const achou = (data?.users ?? []).find((u) => (u.email || "").toLowerCase() === email);
    if (achou) return { id: achou.id, jaEntrou: !!achou.last_sign_in_at };
    if (!data || data.users.length < 1000) return null;
    page++;
  }
}

async function main() {
  const email = (process.argv[2] || "").trim().toLowerCase();
  const nome = (process.argv[3] || "").trim();
  if (!email) return console.log("uso: npx tsx scripts/criar-assinante.ts <email> [\"Nome\"]");

  // 1. Pedido. Existe para o aluno ter histórico e para o painel de
  //    pagamentos não mostrar um assinante que apareceu do nada.
  const { data: pedido, error: erroPedido } = await admin
    .from("orders")
    .insert({
      email,
      name: nome || null,
      product: "subscription",
      amount: 0,
      status: "paid",
      gateway: "manual",
      external_reference: "manual:assinatura",
    })
    .select("id")
    .single();
  if (erroPedido || !pedido) return console.log("erro no pedido:", erroPedido?.message);
  console.log("pedido:", pedido.id);

  /* 2. Conta. Se já existir, não recria: só libera o acesso.

     "Precisa criar senha" não é o mesmo que "conta nova". Conta criada aqui
     nasce com senha aleatória que ninguém conhece, então enquanto a pessoa
     não tiver entrado nenhuma vez, o e-mail certo continua sendo o do código.
     Foi exatamente o caso desta conta: uma execução anterior criou o usuário
     e morreu antes de mandar o e-mail. */
  const existente0 = await acharUsuario(email);
  let userId = existente0?.id ?? null;
  const precisaSenha = !existente0 || !existente0.jaEntrou;
  if (!userId) {
    const senha = "Dd" + Math.random().toString(36).slice(2, 10) + "!9";
    const { data: criado, error } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { full_name: nome },
    });
    if (error || !criado?.user) return console.log("erro ao criar a conta:", error?.message);
    userId = criado.user.id;
    console.log("conta criada:", userId);
  } else {
    console.log("conta já existia:", userId, existente0!.jaEntrou ? "(já entrou antes)" : "(nunca entrou)");
  }
  await admin.from("orders").update({ user_id: userId }).eq("id", pedido.id);

  // 3. Perfil
  if (nome) await admin.from("profiles").upsert({ id: userId, full_name: nome }, { onConflict: "id" });

  // 4. Acesso. 35 dias é o mesmo prazo que cada pagamento renova no webhook.
  const ate = new Date(Date.now() + 35 * 864e5).toISOString();
  const { data: existente } = await admin
    .from("memberships").select("id").eq("user_id", userId).eq("source", "subscription").limit(1).maybeSingle();
  if (existente) {
    await admin.from("memberships").update({ status: "active", plan: "full", expires_at: ate }).eq("id", existente.id);
    console.log("assinatura reativada até", ate.slice(0, 10));
  } else {
    await admin.from("memberships").insert({ user_id: userId, plan: "full", status: "active", source: "subscription", expires_at: ate });
    console.log("assinatura criada até", ate.slice(0, 10));
  }

  // 5. Selo da primeira turma
  await admin.from("user_badges").upsert({ user_id: userId, badge: "fundador" }, { onConflict: "user_id,badge" });

  // 6. E-mail. Conta nova recebe o código para criar a senha; conta que já
  //    existia recebe só o aviso de acesso liberado, porque a senha dela
  //    continua valendo e mandar "crie sua senha" confundiria.
  if (precisaSenha) {
    const { data: link } = await admin.auth.admin.generateLink({ type: "recovery", email } as any);
    const codigo = ((link as any)?.properties?.email_otp as string) || "";
    const r = await (await emails()).sendAccountSetupEmail(email, nome, codigo, pedido.id);
    console.log("e-mail 'crie sua senha':", r.sent ? "enviado" : "NÃO enviado — " + r.reason);
  } else {
    const r = await (await emails()).sendAccessGrantedEmail(email, nome, SITE, pedido.id);
    console.log("e-mail 'acesso liberado':", r.sent ? "enviado" : "NÃO enviado — " + r.reason);
  }
}

main();
