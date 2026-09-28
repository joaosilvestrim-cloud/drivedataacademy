/* Uso: npx tsx scripts/test-portfolio-publicar.ts [arquivo.html]
   ATENCAO: publica de verdade na conta institucional (admin@drivedata.com.br).

   Teste de ponta a ponta do site de portfolio: gera o prompt da conta
   institucional, pede o site a uma IA como o aluno faria e publica. */
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

const CONTA = "9c5924ae-77ce-4be0-bdfc-4bacff849ad7"; // admin@drivedata.com.br, "Equipe DriveData"

(async () => {
  const React = require("react");
  if (typeof React.cache !== "function") React.cache = (fn: any) => fn;
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { montarPrompt, limparHtmlColado, slugDoNome, slugLivre } = await import("../lib/portfolio-site");

  const { prompt } = await montarPrompt(db as any, CONTA, "painel");
  console.log("prompt:", prompt.length, "caracteres. Pedindo o site...");

  const t0 = Date.now();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 16000, messages: [{ role: "user", content: prompt }] }),
  });
  const j: any = await res.json();
  if (!res.ok) return console.log("erro da IA:", JSON.stringify(j).slice(0, 300));
  const bruto = (j.content ?? []).find((c: any) => c.type === "text")?.text || "";
  console.log(`resposta em ${((Date.now() - t0) / 1000).toFixed(0)}s, ${j.usage?.output_tokens} tokens de saida, parada: ${j.stop_reason}`);

  const limpo = limparHtmlColado(bruto);
  if (!limpo.ok) return console.log("HTML rejeitado:", limpo.erro);
  fs.writeFileSync(process.argv[2] || "site-teste.html", limpo.html);
  console.log("HTML:", (limpo.html.length / 1024).toFixed(1), "KB");

  const { data: perfil } = await db.from("profiles").select("full_name").eq("id", CONTA).maybeSingle();
  const slug = await slugLivre(db as any, slugDoNome(perfil?.full_name || ""), CONTA);
  const { error } = await db.from("portfolio_sites").upsert(
    { user_id: CONTA, slug, html: limpo.html, publicado: true, mostrar_universo: true, atualizado_em: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  console.log(error ? "erro ao publicar: " + error.message : `publicado: /portfolio/${slug}`);
})();
