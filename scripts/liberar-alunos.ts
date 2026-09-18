/* Libera assinatura anual para uma lista de e-mails, exatamente como se a
   pessoa tivesse comprado o plano anual.

   Faz o mesmo que o webhook do Asaas faz no pagamento confirmado:
   conta criada, assinatura ativa por 1 ano (source "annual"), selo Fundador e
   o e-mail "Pagamento confirmado: crie sua senha de acesso" com o código.
   Não cria pedido em orders, então não entra no faturamento.

   Quem já tem conta segue o outro ramo do webhook: ganha a assinatura e recebe
   o e-mail de acesso liberado, sem código, porque já tem senha. Quem já tem
   assinatura ativa é pulado, então rodar duas vezes não manda e-mail repetido.

   npx tsx scripts/liberar-alunos.ts email1@x.com email2@y.com ... */

import fs from "fs";
import Module from "module";

// lib/email importa "server-only", que só existe dentro do Next.
const resolver = (Module as any)._resolveFilename;
(Module as any)._resolveFilename = function (req: string, ...rest: any[]) {
  if (req === "server-only") return require.resolve("./_vazio.js");
  return resolver.call(this, req, ...rest);
};

for (const l of fs.readFileSync(".env.local", "utf8").split("\n")) {
  if (!l.includes("=") || l.startsWith("#")) continue;
  const i = l.indexOf("=");
  process.env[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^"|"$/g, "");
}

const EMAILS = process.argv.slice(2).map((e) => e.trim().toLowerCase()).filter((e) => e.includes("@"));

async function main() {
  if (!EMAILS.length) { console.log("Passe os e-mails como argumento."); return; }
  const { createClient } = await import("@supabase/supabase-js");
  const { sendAccountSetupEmail, sendAccessGrantedEmail } = await import("../lib/email");
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  const { data: todos } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const contas = new Map((todos?.users ?? []).map((u: any) => [(u.email || "").toLowerCase(), u]));
  const expira = new Date(Date.now() + 365 * 864e5).toISOString();

  for (const email of EMAILS) {
    const conta: any = contas.get(email);
    if (conta) {
      const { data: ativa } = await admin.from("memberships").select("id").eq("user_id", conta.id).eq("status", "active").limit(1).maybeSingle();
      if (ativa) { console.log(`PULADO (já tem assinatura ativa)  ${email}`); continue; }
      const m = await admin.from("memberships").insert({ user_id: conta.id, plan: "full", status: "active", source: "annual", expires_at: expira });
      if (m.error) { console.log(`ERRO na assinatura     ${email}: ${m.error.message}`); continue; }
      await admin.from("user_badges").upsert({ user_id: conta.id, badge: "fundador" }, { onConflict: "user_id,badge" });
      const r = await sendAccessGrantedEmail(email, (conta.user_metadata?.full_name as string) || "", site);
      const enviado = (r as any)?.sent ?? true;
      console.log(`${enviado ? "OK (conta existente)" : `E-MAIL FALHOU (${(r as any)?.reason})`}  ${email} · assinatura até ${expira.slice(0, 10)}`);
      continue;
    }
    const senha = "Dd" + Math.random().toString(36).slice(2, 10) + "!9";
    const { data: criado, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { full_name: "" } });
    if (error || !criado?.user) { console.log(`ERRO na conta          ${email}: ${error?.message}`); continue; }
    const id = criado.user.id;

    const m = await admin.from("memberships").insert({ user_id: id, plan: "full", status: "active", source: "annual", expires_at: expira });
    if (m.error) { console.log(`ERRO na assinatura     ${email}: ${m.error.message}`); continue; }
    await admin.from("user_badges").upsert({ user_id: id, badge: "fundador" }, { onConflict: "user_id,badge" });

    const { data: link } = await admin.auth.admin.generateLink({ type: "recovery", email } as any);
    const codigo = ((link as any)?.properties?.email_otp as string) || "";
    const r = await sendAccountSetupEmail(email, "", codigo, null);
    console.log(`${r.sent ? "OK" : `E-MAIL FALHOU (${r.reason})`}  ${email} · assinatura até ${expira.slice(0, 10)}`);
  }
}

main();
