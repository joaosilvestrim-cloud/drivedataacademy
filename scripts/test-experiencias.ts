/* Uso: npx tsx scripts/test-experiencias.ts

   Confere a leitura da trajetoria a partir de um trecho de LinkedIn: cargo,
   organizacao e anos precisam estar no texto. */
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

const TEXTO = `Experiência
Gerente de Projetos de TI Sênior | Delivery Manager
A2F · Tempo integral
fev. de 2021 - o momento · 5 anos 8 meses
São Paulo, Brasil · Híbrido
Atuo na liderança de projetos estratégicos em tecnologia e operações, com foco em transformação digital, inovação orientada por dados e alta performance de equipes.
Technology Project Manager & Co-founder
Ayumana · Autônomo
jul. de 2024 - o momento · 2 anos 3 meses
Co-fundador e responsável pela gestão técnica e estratégica do desenvolvimento de uma plataforma de psicoterapia digital, conectando pacientes e psicólogos através de sessões online.
Analista de Infraestrutura e implementação de sistemas
Atrebo · Terceirizado
jan. de 2020 - fev. de 2021 · 1 ano 2 meses
Sevilha, Andaluzia, Espanha · Remoto
Trabajé directamente con el equipo de Sevillia en España, asegurando una comunicación fluida y una colaboración efectiva.
Analista de suporte técnico Júnior
ABC Cargas · Tempo integral
mar. de 2015 - jan. de 2019 · 3 anos 11 meses
Assumi uma série de responsabilidades essenciais para garantir o funcionamento eficaz da infraestrutura de TI.`;

(async () => {
  const React = require("react");
  if (typeof React.cache !== "function") React.cache = (fn: any) => fn;
  const { organizarExperiencias } = await import("../lib/portfolio-ia");
  const r = await organizarExperiencias(TEXTO);
  if (!r.ok) return console.log("ERRO:", r.erro);
  for (const e of r.itens) console.log(`${e.inicio ?? "?"} a ${e.fim ?? "atual"} | ${e.cargo} | ${e.organizacao ?? "-"} | setor: ${e.setor ?? "-"}\n   ${e.descricao ?? "(sem descricao)"}`);
})();
