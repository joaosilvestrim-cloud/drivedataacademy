/* Devolve aos pedidos o id da assinatura do Asaas que o webhook apagou.

   O que aconteceu: o checkout gravava o id da assinatura (sub_...) em
   orders.gateway_id, e o webhook do primeiro pagamento sobrescrevia com o id
   da cobrança (pay_...). Sem o id certo, o cancelamento do aluno chamava
   DELETE /subscriptions/pay_... e tomava 404, ou seja, o cartão continuava
   sendo cobrado depois do cancelamento.

   O resgate é possível porque cada assinatura no Asaas carrega
   externalReference = "sub:<id do pedido>". O elo nunca se perdeu, só não
   estava do nosso lado.

   Só lê do Asaas e escreve numa coluna que estava vazia. Rodar de novo não
   muda nada.

   Uso: npx tsx scripts/recuperar-assinaturas.ts [--aplicar] */

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
  const k = l.slice(0, i).trim();
  if (!process.env[k]) process.env[k] = l.slice(i + 1).trim().replace(/^"|"$/g, "");
}

import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const BASE = process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";

async function asaas<T>(caminho: string): Promise<T[]> {
  const lista: T[] = [];
  for (let offset = 0; offset < 2000; offset += 100) {
    const sep = caminho.includes("?") ? "&" : "?";
    const r = await fetch(`${BASE}${caminho}${sep}limit=100&offset=${offset}`, {
      headers: { access_token: process.env.ASAAS_API_KEY!, "User-Agent": "drivedata-academy" },
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`Asaas respondeu ${r.status} em ${caminho}`);
    const j = await r.json();
    lista.push(...(j.data ?? []));
    if (!j.hasMore) break;
  }
  return lista;
}

async function main() {
  const aplicar = process.argv.includes("--aplicar");

  // includeDeleted: assinatura já cancelada também precisa do id certo, para
  // a tela do aluno e o histórico não mentirem sobre o que aconteceu.
  const subs = await asaas<any>("/subscriptions?includeDeleted=true");
  const porPedido = new Map<string, any>();
  for (const s of subs) {
    const ref = String(s.externalReference || "");
    if (ref.startsWith("sub:")) porPedido.set(ref.slice(4), s);
  }

  const { data: pedidos } = await admin
    .from("orders")
    .select("id, email, gateway_id, asaas_subscription_id, status")
    .eq("product", "subscription")
    .eq("gateway", "asaas");

  let ok = 0;
  let semPar = 0;
  let jaTinha = 0;

  for (const p of pedidos ?? []) {
    if (p.asaas_subscription_id) {
      jaTinha++;
      continue;
    }
    const s = porPedido.get(p.id);
    if (!s) {
      semPar++;
      console.log(`sem par   ${String(p.email).slice(0, 34).padEnd(36)} gateway_id=${p.gateway_id}`);
      continue;
    }
    console.log(
      `${aplicar ? "gravado " : "achado  "} ${String(p.email).slice(0, 34).padEnd(36)} ${s.id}  (${s.status}${s.deleted ? ", deletada" : ""})`,
    );
    if (aplicar) await admin.from("orders").update({ asaas_subscription_id: s.id }).eq("id", p.id);
    ok++;
  }

  console.log(`\npedidos: ${(pedidos ?? []).length} | já tinham: ${jaTinha} | recuperados: ${ok} | sem par no Asaas: ${semPar}`);
  if (!aplicar && ok) console.log("\nNada foi gravado. Rode de novo com --aplicar para valer.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
