/* Uso: npx tsx scripts/backfill-competencias.ts

   Lê as competências dos projetos que já existiam antes da leitura do texto
   entrar no salvamento. Projeto novo não precisa disto: é lido ao salvar.
   Pula o que já foi lido com o mesmo texto, então rodar de novo é barato. */
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

(async () => {
  const React = require("react");
  if (typeof React.cache !== "function") React.cache = (fn: any) => fn;
  const { competenciasParaSalvar, nomesDasCompetencias, textoDoProjeto } = await import("../lib/portfolio-competencias");
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const nomes = await nomesDasCompetencias();

  const { data: projetos, error } = await db.from("portfolio_projects").select("id, titulo, resumo, problema, resultado, descricao, competencias");
  if (error) return console.log("erro:", error.message);

  for (const p of projetos ?? []) {
    const antes = (p as any).competencias?.hash;
    const novo = await competenciasParaSalvar(textoDoProjeto(p as any), (p as any).competencias);
    if (!novo) { console.log(`IA fora    ${p.titulo}`); continue; }
    if (novo.hash === antes) { console.log(`ja lido    ${p.titulo}`); continue; }
    await db.from("portfolio_projects").update({ competencias: novo }).eq("id", p.id);
    console.log(`lido       ${p.titulo}\n           ${novo.itens.map((i) => nomes[i.id] || i.id).join(", ") || "(nenhuma)"}`);
  }
})();
