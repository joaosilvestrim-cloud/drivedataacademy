/* Uso: npx tsx scripts/test-competencias.ts

   Confere a identificação de competências no texto do projeto: cada uma tem
   que vir com um trecho que existe de verdade no texto. */
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

const CASOS: Record<string, string> = {
  pmi: "Programas de formação no PMI São Paulo\nComo voluntário no capítulo do PMI São Paulo, fui gerente de projetos do Programa de Desenvolvimento Profissional, coordenando cronogramas, planejamento e execução dos treinamentos preparatórios como CAPM e PMP, e acompanhando o desempenho dos participantes. Desde 2025 sou gerente de programas da diretoria de cursos, certificações e formações, coordenando todos os gerentes de projetos dessa área.",
  ayumana: "Ayumana\nFui responsável pela gestão técnica e estratégica: arquitetura de produto, roadmap e o ciclo completo, da concepção ao lançamento. Geri o desenvolvimento dos dashboards de psicólogos e pacientes, do agendamento com videochamada, da carteira digital com pagamentos e do painel financeiro com conciliação. Implementei IA para suporte ao usuário e coordenei um agente de desenvolvimento remoto com prompts técnicos detalhados e controle de qualidade contínuo.",
  vazio: "Organizei a festa de fim de ano da empresa com decoração e música ao vivo.",
};

(async () => {
  const React = require("react");
  if (typeof React.cache !== "function") React.cache = (fn: any) => fn;
  const { identificarCompetencias, nomesDasCompetencias } = await import("../lib/portfolio-competencias");
  const nomes = await nomesDasCompetencias();
  for (const [nome, texto] of Object.entries(CASOS)) {
    const t0 = Date.now();
    const r = await identificarCompetencias(texto);
    console.log(`\n=== ${nome} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    if (r === null) { console.log("IA nao respondeu"); continue; }
    if (!r.length) console.log("  nenhuma competencia (esperado so no caso 'vazio')");
    for (const c of r) console.log(`  ${(nomes[c.id] || c.id).padEnd(22)} "${c.trecho}"`);
  }
})();
