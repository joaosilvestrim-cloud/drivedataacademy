/* Confere o dicionário da interface sem abrir o navegador.

   O que pode dar errado aqui não é "traduziu feio", é "traduziu o que não era
   texto" ou "deixou uma tela falando duas línguas". Então os testes olham a
   forma: chave que parece código, tradução vazia, tradução muito mais longa
   que o original (sinal de linha trocada) e as chaves que a tela usa mas o
   dicionário não tem. */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { GERADAS } from "../lib/i18n/frases-geradas";
import { frase } from "../lib/i18n/frases";

let erros = 0;
let checagens = 0;
function ok(condicao: boolean, o_que: string) {
  checagens++;
  if (!condicao) {
    erros++;
    console.log("  FALHOU: " + o_que);
  }
}

const chaves = Object.keys(GERADAS);
ok(chaves.length > 400, `dicionário com ${chaves.length} frases`);

// 1. Nenhuma chave é pedaço de código.
// O ponto e vírgula só denuncia código no fim da linha: no meio da frase ele
// é pontuação, e a Academy escreve assim em vários lugares.
const CODIGO = /(className|=>|===|!==|;\s*$|;\s*[})]|\|\||&&|\breturn\b|\bconst\b|https?:\/\/)/;
for (const k of chaves) ok(!CODIGO.test(k), `chave parece código: ${k.slice(0, 60)}`);

// 2. Nenhuma tradução vazia.
for (const k of chaves) {
  ok(GERADAS[k].en.trim().length > 0, `sem inglês: ${k.slice(0, 40)}`);
  ok(GERADAS[k].es.trim().length > 0, `sem espanhol: ${k.slice(0, 40)}`);
}

// 3. Tradução desproporcional: quase sempre é linha trocada na volta do modelo.
for (const k of chaves) {
  // Só em frase longa: em rótulo curto o inglês encurta muito de verdade
  // ("Todas as ferramentas" vira "All tools") e a razão não diz nada.
  if (k.length < 40) continue;
  for (const idioma of ["en", "es"] as const) {
    const razao = GERADAS[k][idioma].length / k.length;
    ok(razao > 0.5 && razao < 2, `tamanho fora da curva (${idioma}): ${k.slice(0, 50)}`);
  }
}

// 4. Português continua sendo o português, sem passar pelo dicionário.
ok(frase("Conferir", "pt") === "Conferir", "pt devolve o próprio texto");
ok(frase("Conferir", "es") === "Comprobar", "correção manual vence a automática");
ok(frase("frase que não existe", "en") === "frase que não existe", "frase sem tradução cai no português");
ok(frase(" Copiar ", "en").startsWith(" ") && frase(" Copiar ", "en").endsWith(" "), "espaço das pontas preservado");

// 5. Toda chave que as telas usam está no dicionário.
function tsx(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? tsx(p) : p.endsWith(".tsx") ? [p] : [];
  });
}
const USO = /\btr\((["'])((?:[^"'\\]|\\.)*)\1\)/g;
const faltando: string[] = [];
for (const arquivo of tsx("app/conta")) {
  const texto = readFileSync(arquivo, "utf8");
  for (const m of texto.matchAll(USO)) {
    const chave = m[2].replace(/\\"/g, '"').replace(/\\'/g, "'");
    if (!(chave in GERADAS)) faltando.push(`${arquivo}: ${chave.slice(0, 50)}`);
  }
}
ok(faltando.length === 0, `tr() sem tradução:\n    ${faltando.slice(0, 10).join("\n    ")}`);

console.log(`\n${checagens - erros}/${checagens} checagens passaram`);
process.exit(erros ? 1 : 0);
