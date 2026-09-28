/* Uso: npx tsx scripts/test-universo-portfolio.ts [saida.json]

   Confere a camada do portfólio do Universo 4D com uma carreira de exemplo em
   memória. Nada é gravado: o cliente do banco é um dublê que devolve os
   projetos abaixo. Só o catálogo do universo é lido de verdade. */
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

const PROJETOS = [
  { titulo: "Controle de estoque em planilha", ferramentas: ["Excel"], feito_em: "2019-03-01" },
  { titulo: "Relatório de vendas com SQL", ferramentas: ["SQL", "Excel"], feito_em: "2021-06-01" },
  { titulo: "Painel comercial", ferramentas: ["Power BI", "DAX", "SQL Server"], feito_em: "2023-02-01" },
  { titulo: "Lakehouse de filiais", ferramentas: ["Fabric", "Python", "Power BI"], feito_em: "2025-08-01" },
  // Com lacuna: nao pode acender nada.
  { titulo: "Projeto com [quanto tempo levava?]", ferramentas: ["Snowflake"], feito_em: "2024-01-01" },
  // So para a turma: nao pode acender nada na pagina publica.
  { titulo: "Projeto privado", ferramentas: ["Databricks"], feito_em: "2024-05-01", publico: false },
].map((p) => ({ resumo: "ok", problema: "ok", resultado: "ok", descricao: "ok", created_at: "2026-09-28T00:00:00Z", publico: true, ...p }));

const dubleDoBanco: any = {
  from: (tabela: string) => ({
    select: () => ({
      eq: () =>
        tabela === "profiles"
          ? { maybeSingle: async () => ({ data: { skills: ["Scrum", "Power BI"] } }) }
          : Promise.resolve({ data: PROJETOS }),
    }),
  }),
};

(async () => {
  const React = require("react");
  if (typeof React.cache !== "function") React.cache = (fn: any) => fn;
  const { universoDoPortfolio } = await import("../lib/knowledge/publico");
  const u = await universoDoPortfolio(dubleDoBanco, "teste");
  if (!u) return console.log("sem catalogo");

  console.log(`projetos que entraram: ${u.projetos} (esperado 4) | passo: ${u.passo} | quadros: ${u.quadros.length}`);
  for (const q of u.quadros) {
    const acesas = Object.values(q.scores).filter((s) => s.score > 0);
    console.log(`  ${q.at.slice(0, 7)}  ${String(acesas.length).padStart(2)} acesas: ${acesas.map((s) => `${s.id}(${s.score})`).join(" ")}`);
  }
  const hoje = u.quadros.at(-1)!.scores;
  const erros: string[] = [];
  if (u.projetos !== 4) erros.push("projeto com lacuna ou privado entrou");
  if (hoje["snowflake"]?.score) erros.push("Snowflake acendeu por projeto com lacuna");
  if (hoje["scrum"]?.level !== "Declarada no perfil, ainda sem projeto") erros.push("Scrum declarado nao apareceu como declarado");
  if (u.quadros[0].scores["scrum"]?.score) erros.push("declarada apareceu antes de hoje");
  if (!u.provas?.["power-bi"]?.length) erros.push("Power BI sem prova");
  if ((u.catalog as any).mappings) erros.push("mappings vazou");
  console.log(`\nprovas de Power BI: ${JSON.stringify(u.provas?.["power-bi"])}`);
  console.log(erros.length ? `\nFALHOU: ${erros.join("; ")}` : "\nOK: todas as regras conferem");
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(u));
})();
