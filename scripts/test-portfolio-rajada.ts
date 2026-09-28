/* Uso: npx tsx scripts/test-portfolio-rajada.ts

   Simula a turma clicando junto em "Organizar nos campos", com a mesma
   politica de nova tentativa da tela (15 a 30s de espera, ate 4 vezes). */
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
const console_warn = console.warn;
console.warn = () => {};

const RELATOS = [
  "fiz um dashboard de vendas no power bi pro pessoal comercial, antes eles faziam tudo no excel juntando varias planilhas e demorava muito. puxei os dados do sql server e fiz umas medidas em dax de meta e realizado",
  "Na empresa o fechamento do financeiro levava 3 dias porque 4 analistas conciliavam 15 planilhas na mão. Montei um fluxo no Power Query + Power Automate que junta tudo e um relatório no Power BI. Hoje o fechamento sai em 4 horas.",
  "automatizei o relatório de estoque que o almoxarifado mandava por email toda sexta, agora sai do protheus direto pro power bi com alerta de ruptura",
  "criei um modelo em python que prevê a demanda de peças para a manutenção, usando o histórico de ordens de serviço do sap",
  "montei no fabric um lakehouse que junta os dados de três filiais, antes cada uma mandava um excel diferente para a matriz",
  "fiz um painel de indicadores de RH com turnover e absenteísmo por área, os dados vinham de uma planilha que o DP atualizava",
  "desenvolvi um visual em svg dentro do power bi para mostrar o mapa da fábrica com status das máquinas em tempo real",
  "usei o snowflake para centralizar os dados de marketing e fiz uma análise de funil de conversão em sql",
];

(async () => {
  const React = require("react");
  if (typeof React.cache !== "function") React.cache = (fn: any) => fn;
  const { organizarRelato } = await import("../lib/portfolio-ia");
  const { LACUNA } = await import("../lib/portfolio");

  const t0 = Date.now();
  const resultados = await Promise.all(
    RELATOS.map(async (relato, i) => {
      let r: any = await organizarRelato(relato);
      let tentativas = 1;
      while (!r.ok && r.ocupado && tentativas <= 4) {
        await new Promise((ok) => setTimeout(ok, (15 + Math.random() * 15) * 1000));
        r = await organizarRelato(relato);
        tentativas++;
      }
      const seg = ((Date.now() - t0) / 1000).toFixed(0);
      if (!r.ok) return `aluno ${i + 1}: FALHOU depois de ${tentativas} tentativas (${seg}s)`;
      const tudo = Object.values(r.campos).flat().join(" ");
      const lac = (tudo.match(new RegExp(LACUNA.source, "g")) || []).length;
      const inv = (tudo.replace(new RegExp(LACUNA.source, "g"), "").match(/\d+/g) || []).filter((n) => !relato.includes(n));
      return `aluno ${i + 1}: ok em ${seg}s, ${tentativas} tentativa(s) | ${r.campos.titulo} | ferramentas: ${r.campos.ferramentas.join(", ")} | lacunas ${lac} | inventados: ${inv.length ? inv.join(",") : "nenhum"}`;
    }),
  );
  console.log(resultados.join("\n"));
  const ok = resultados.filter((x) => x.includes(": ok")).length;
  console.log(`\n${ok} de ${RELATOS.length} conseguiram, em ${((Date.now() - t0) / 1000).toFixed(0)}s no total`);
  console.warn = console_warn;
})();
