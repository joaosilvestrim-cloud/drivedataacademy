/* Testa o motor do Raio-X contra arquivos .pbix e .pbit de verdade.

   Uso: npx tsx scripts/test-raiox.ts "C:/caminho/arquivo.pbix" [outro.pbit]
   Sem argumento, varre a pasta Downloads do usuário. */

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { extrairRelatorio } from "../lib/raiox/extrair";
import { auditar } from "../lib/raiox/regras";

const args = process.argv.slice(2);
const alvos = args;

if (!alvos.length) {
  console.log("Nenhum arquivo para testar.");
  process.exit(0);
}

let falhas = 0;
for (const caminho of alvos) {
  const nome = basename(caminho);
  try {
    const bytes = new Uint8Array(readFileSync(caminho));
    const inicio = Date.now();
    const relatorio = extrairRelatorio(nome, bytes);
    const laudo = auditar(relatorio);
    const ms = Date.now() - inicio;
    console.log(`\n=== ${nome} (${(bytes.length / 1024 / 1024).toFixed(1)} MB, ${relatorio.formato}, ${ms}ms)`);
    console.log(`    nota ${laudo.nota} | ${laudo.resumo.paginas} páginas, ${laudo.resumo.visuais} visuais, ${laudo.resumo.tabelas} tabelas, ${laudo.resumo.medidas} medidas`);
    console.log("    " + laudo.notas.map((n) => `${n.dimensao} ${n.nota}`).join(" · "));
    for (const a of laudo.achados.slice(0, 6)) {
      console.log(`    [${a.severidade}] ${a.titulo} — ${a.onde}`);
    }
    if (laudo.achados.length > 6) console.log(`    ... mais ${laudo.achados.length - 6} achados`);
  } catch (e: any) {
    falhas++;
    console.log(`\n=== ${nome}\n    FALHOU: ${e?.message || e}`);
  }
}
console.log(`\n${alvos.length - falhas}/${alvos.length} arquivos lidos.`);
