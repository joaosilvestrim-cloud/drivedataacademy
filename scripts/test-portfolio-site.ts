/* Uso: npx tsx scripts/test-portfolio-site.ts [user_id]
   Mostra o prompt do site e confere que o universo publico nao vaza evento. */
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
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  // A conta do Joao que tem o projeto de ensaio.
  const { data: proj } = await db.from("portfolio_projects").select("user_id, titulo, status").order("updated_at", { ascending: false }).limit(5);
  console.log("projetos recentes:", JSON.stringify(proj));
  const userId = process.argv[2] || proj?.[0]?.user_id;
  if (!userId) return console.log("sem projeto para testar");

  const { montarPrompt } = await import("../lib/portfolio-site");
  const r = await montarPrompt(db as any, userId, "painel");
  console.log(`\n=== PROMPT (${r.prompt.length} caracteres) | projetos ${r.incluidos} | certificados ${r.certificados} | fora por lacuna: ${r.foraPorLacuna.join(", ") || "nenhum"} | privados: ${r.foraPorPrivado.join(", ") || "nenhum"}\n`);
  console.log(r.prompt);

  const { universoPublico } = await import("../lib/knowledge/publico");
  const t0 = Date.now();
  const u = await universoPublico(userId);
  console.log(`\n=== UNIVERSO PUBLICO (${Date.now() - t0}ms)`);
  if (!u) return console.log("sem universo (tabelas ku_* ausentes ou sem historico)");
  const ultimo = u.quadros.at(-1)!;
  const ativos = Object.values(ultimo.scores).filter((s) => s.score > 0);
  console.log(`quadros: ${u.quadros.length} (${u.quadros[0].at.slice(0, 7)} ate ${ultimo.at.slice(0, 7)}) | competencias demonstradas: ${ativos.length} de ${u.catalog.competencies.length}`);
  const vazou = Object.values(ultimo.scores).some((s) => s.evidence.length > 0);
  console.log(`evidencias brutas no payload: ${vazou ? "SIM, VAZOU" : "nenhuma"}`);
  console.log(`tamanho do JSON publico: ${(JSON.stringify(u).length / 1024).toFixed(0)} KB`);
  for (const s of ativos.sort((a, b) => b.score - a.score).slice(0, 5)) {
    const c = u.catalog.competencies.find((x) => x.id === s.id)!;
    console.log(`  ${c.name.padEnd(34)} ${String(Math.round(s.score)).padStart(3)}  ${s.level}  ultima: ${s.lastActivity}`);
  }
})();
