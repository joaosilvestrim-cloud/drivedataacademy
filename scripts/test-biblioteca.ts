/* Testes da Biblioteca de referência.

   Biblioteca é conteúdo, e conteúdo quebra de um jeito específico: id repetido,
   verbete sem armadilha, parêntese faltando no código que o aluno vai colar,
   busca que não acha o que devia. É isso que este arquivo cobre.

   npm run test:biblioteca */

import { DAX } from "../lib/biblioteca/dax";
import { SQL } from "../lib/biblioteca/sql";
import { M } from "../lib/biblioteca/m";
import { ITENS, filtrar, tagsDe, semAcento, NOME_LINGUAGEM } from "../lib/biblioteca";

let ok = 0;
let falhou = 0;

function checa(nome: string, condicao: boolean, detalhe = "") {
  if (condicao) { ok++; return; }
  falhou++;
  console.log(`  FALHOU: ${nome}${detalhe ? ` -> ${detalhe}` : ""}`);
}

function titulo(t: string) { console.log(`\n${t}`); }

/* ------------------------------------------------------------ o acervo */
titulo("Acervo");

checa("tem os três arquivos somados", ITENS.length === DAX.length + SQL.length + M.length);
checa("tem pelo menos 60 verbetes", ITENS.length >= 60, `tem ${ITENS.length}`);
checa("DAX tem pelo menos 25", DAX.length >= 25, `tem ${DAX.length}`);
checa("SQL tem pelo menos 15", SQL.length >= 15, `tem ${SQL.length}`);
checa("Power Query tem pelo menos 15", M.length >= 15, `tem ${M.length}`);

const ids = ITENS.map((i) => i.id);
checa("nenhum id repetido", new Set(ids).size === ids.length, [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))].join(", "));

for (const [lista, prefixo, lingua] of [[DAX, "dax-", "dax"], [SQL, "sql-", "sql"], [M, "m-", "m"]] as const) {
  checa(`ids de ${lingua} começam com ${prefixo}`, lista.every((i) => i.id.startsWith(prefixo)), lista.filter((i) => !i.id.startsWith(prefixo)).map((i) => i.id).join(", "));
  checa(`linguagem de ${lingua} está certa`, lista.every((i) => i.linguagem === lingua), lista.filter((i) => i.linguagem !== lingua).map((i) => i.id).join(", "));
}

/* ------------------------------------------------------- campos do verbete */
titulo("Verbetes");

const vazio = (s: string | undefined) => !s || !s.trim();

checa("todo verbete tem título", !ITENS.some((i) => vazio(i.titulo)), ITENS.filter((i) => vazio(i.titulo)).map((i) => i.id).join(", "));
checa("todo verbete tem quando usar", !ITENS.some((i) => vazio(i.quando)), ITENS.filter((i) => vazio(i.quando)).map((i) => i.id).join(", "));
checa("todo verbete tem código", !ITENS.some((i) => vazio(i.codigo)), ITENS.filter((i) => vazio(i.codigo)).map((i) => i.id).join(", "));
checa("todo verbete tem explicação", !ITENS.some((i) => vazio(i.explicacao)), ITENS.filter((i) => vazio(i.explicacao)).map((i) => i.id).join(", "));

// A armadilha é a razão de existir da Biblioteca. Verbete sem ela é só um trecho de código.
const semArmadilha = ITENS.filter((i) => vazio(i.armadilha));
checa("todo verbete tem armadilha", semArmadilha.length === 0, semArmadilha.map((i) => i.id).join(", "));

checa("nível é um dos três", ITENS.every((i) => ["básico", "intermediário", "avançado"].includes(i.nivel)));
checa("todo verbete tem pelo menos uma tag", ITENS.every((i) => i.tags.length > 0), ITENS.filter((i) => !i.tags.length).map((i) => i.id).join(", "));
checa("nenhuma tag em branco ou com maiúscula", ITENS.every((i) => i.tags.every((t) => t.trim() === t && t === t.toLowerCase() && t.length > 0)));
checa("nenhuma tag repetida dentro do mesmo verbete", ITENS.every((i) => new Set(i.tags).size === i.tags.length), ITENS.filter((i) => new Set(i.tags).size !== i.tags.length).map((i) => i.id).join(", "));

// Título curto demais não diz nada, e título longo demais estoura a lista.
const tituloRuim = ITENS.filter((i) => i.titulo.length < 8 || i.titulo.length > 60);
checa("títulos entre 8 e 60 caracteres", tituloRuim.length === 0, tituloRuim.map((i) => `${i.id}(${i.titulo.length})`).join(", "));

const quandoRuim = ITENS.filter((i) => i.quando.length < 15);
checa("o quando usar é uma frase de verdade", quandoRuim.length === 0, quandoRuim.map((i) => i.id).join(", "));

// Título repetido confunde na lista, mesmo em linguagens diferentes.
const titulos = ITENS.map((i) => `${i.linguagem}|${semAcento(i.titulo)}`);
checa("nenhum título repetido na mesma linguagem", new Set(titulos).size === titulos.length);

/* ------------------------------------------------------------- o código */
titulo("Código");

function equilibrado(codigo: string, abre: string, fecha: string): boolean {
  // Conta fora de texto entre aspas, senão um parêntese dentro de string dá falso positivo.
  let dentro = false;
  let saldo = 0;
  for (let k = 0; k < codigo.length; k++) {
    const c = codigo[k];
    if (c === '"') { dentro = !dentro; continue; }
    if (dentro) continue;
    if (c === abre) saldo++;
    if (c === fecha) saldo--;
    if (saldo < 0) return false;
  }
  return saldo === 0;
}

const parenteses = ITENS.filter((i) => !equilibrado(i.codigo, "(", ")"));
checa("parênteses equilibrados em todo código", parenteses.length === 0, parenteses.map((i) => i.id).join(", "));

const colchetes = ITENS.filter((i) => !equilibrado(i.codigo, "[", "]"));
checa("colchetes equilibrados em todo código", colchetes.length === 0, colchetes.map((i) => i.id).join(", "));

const chaves = ITENS.filter((i) => !equilibrado(i.codigo, "{", "}"));
checa("chaves equilibradas em todo código", chaves.length === 0, chaves.map((i) => i.id).join(", "));

const aspas = ITENS.filter((i) => (i.codigo.match(/"/g) || []).length % 2 !== 0);
checa("aspas fechadas em todo código", aspas.length === 0, aspas.map((i) => i.id).join(", "));

// Aspas curvas e travessão vindos de editor de texto quebram o código ao colar.
const sujeira = ITENS.filter((i) => /[“”‘’–—]/.test(i.codigo));
checa("nenhuma aspa curva ou travessão no código", sujeira.length === 0, sujeira.map((i) => i.id).join(", "));

const comTab = ITENS.filter((i) => i.codigo.includes("\t"));
checa("nenhum tab no código", comTab.length === 0, comTab.map((i) => i.id).join(", "));

// Todo let de M precisa do in, senão o passo não compila.
const mQuebrado = M.filter((i) => /(^|\n)let\b/.test(i.codigo) && !/\bin\b/.test(i.codigo));
checa("todo let do Power Query tem in", mQuebrado.length === 0, mQuebrado.map((i) => i.id).join(", "));

// SQL que abre CTE precisa de SELECT depois.
const sqlQuebrado = SQL.filter((i) => /\bWITH\b/i.test(i.codigo) && !/\bSELECT\b/i.test(i.codigo));
checa("todo WITH do SQL tem SELECT", sqlQuebrado.length === 0, sqlQuebrado.map((i) => i.id).join(", "));

/* --------------------------------------------------------------- a busca */
titulo("Busca e filtros");

checa("busca vazia devolve tudo", filtrar(ITENS, "", "todas", "").length === ITENS.length);
checa("espaço em branco não filtra nada", filtrar(ITENS, "   ", "todas", "").length === ITENS.length);
checa("filtro de linguagem bate com a contagem", filtrar(ITENS, "", "sql", "").length === SQL.length);

// A busca é para quem digita rápido e sem acento.
const comAcento = filtrar(ITENS, "período", "todas", "").length;
const semAcentoNaBusca = filtrar(ITENS, "periodo", "todas", "").length;
checa("busca ignora acento", comAcento === semAcentoNaBusca && semAcentoNaBusca > 0, `${comAcento} vs ${semAcentoNaBusca}`);
checa("busca ignora caixa", filtrar(ITENS, "DATEADD", "todas", "").length === filtrar(ITENS, "dateadd", "todas", "").length);

checa("acha pelo título", filtrar(ITENS, "duplicata", "todas", "").some((i) => i.id === "sql-duplicatas"));
checa("acha pelo código", filtrar(ITENS, "ROW_NUMBER", "todas", "").some((i) => i.id === "sql-deduplicar"));
checa("acha pela armadilha", filtrar(ITENS, "NOT IN", "todas", "").some((i) => i.id === "sql-anti-join"));
checa("acha pela tag", filtrar(ITENS, "conciliação", "todas", "").length > 0);
checa("termo inexistente devolve vazio", filtrar(ITENS, "zzzzquenãoexiste", "todas", "").length === 0);

checa("busca com linguagem devolve só aquela linguagem", filtrar(ITENS, "a", "dax", "").every((i) => i.linguagem === "dax"));
checa("filtro por tag devolve só quem tem a tag", filtrar(ITENS, "", "todas", "tempo").every((i) => i.tags.includes("tempo")));
checa("tag inexistente devolve vazio", filtrar(ITENS, "", "todas", "tag-que-nao-existe").length === 0);

/* -------------------------------------------------------------- as tags */
titulo("Tags");

const tags = tagsDe(ITENS);
checa("tagsDe devolve algo", tags.length > 0);
checa("tags vêm da mais usada para a menos usada", tags.every((t, i) => i === 0 || tags[i - 1][1] >= t[1]));
checa("a contagem da tag bate com o filtro", tags.every(([t, n]) => filtrar(ITENS, "", "todas", t).length === n));
checa("nenhuma tag órfã com contagem zero", tags.every(([, n]) => n > 0));

// Tag que aparece em um verbete só não ajuda a navegar: ou vira duas, ou some.
const tagsSolitarias = tags.filter(([, n]) => n === 1);
checa("no máximo 4 tags usadas uma única vez", tagsSolitarias.length <= 4, tagsSolitarias.map(([t]) => t).join(", "));

// Cada linguagem precisa render tag por si, senão a coluna de filtros some ao trocar de aba.
for (const l of ["dax", "sql", "m"] as const) {
  checa(`${NOME_LINGUAGEM[l]} tem tags próprias`, tagsDe(filtrar(ITENS, "", l, "")).length >= 4);
}

/* ---------------------------------------------------- cobertura de assunto */
titulo("Cobertura");

// Cobrir é o aluno achar pela busca de verdade, e não o termo existir em algum campo escondido.
const cobre = (termo: string) => filtrar(ITENS, termo, "todas", "").length > 0;

for (const termo of ["ano anterior", "acumulado", "media movel", "ranking", "divide", "duplicata", "calendario", "junção", "nulo", "desdinamiz", "percentual", "ticket"]) {
  checa(`cobre "${termo}"`, cobre(termo));
}

console.log(`\n${ok} passaram, ${falhou} falharam.`);
process.exit(falhou ? 1 : 0);
