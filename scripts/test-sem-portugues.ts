/* Procura português sobrando numa página servida em inglês.

   O test:i18n confere o dicionário: se a chave existe, se a tradução não está
   vazia, se o tamanho faz sentido. Ele não vê o que ficou de fora do
   dicionário, que é justamente o problema difícil: a frase que ninguém
   envolveu com tr().

   Este teste olha por outro lado. Sobe o servidor, pede a página com o cookie
   em inglês e procura palavra que só existe em português. Se achar, alguém
   esqueceu de traduzir alguma coisa.

   Uso: npm run build && npx next start -p 3470 & depois
        npx tsx scripts/test-sem-portugues.ts http://localhost:3470 */

const BASE = process.argv[2] || "http://localhost:3470";

/* Palavras que não existem em inglês nem em espanhol e aparecem em quase toda
   frase nossa. "para" e "e" ficam de fora: existem em espanhol. */
const SO_PORTUGUES = [
  "você", "voce", "não", "nao", "são", "está", "estão", "ção", "ções",
  "seu ", "sua ", "dos ", "das ", "num ", "numa ", "pelo ", "pela ",
  "aqui", "agora", "mesmo", "cada ", "quando", "onde", "porque", "também",
  "já ", "ainda", "depois", "antes", "sempre", "nunca", "muito", "pouco",
];

/* Onde o português é esperado e não é erro: nome próprio, termo técnico e o
   texto que o time cadastrou e ainda não traduziu no /admin/traducoes. */
const PERDOADAS = [
  "Raio-X do Dashboard", "Forja DAX", "Arena SQL", "Caixa-Preta",
  "DriveData", "Academy", "Power BI", "Protheus",
];

const PAGINAS = [
  "/", "/entrar", "/matricula", "/cursos", "/criar-conta", "/esqueci-senha",
  "/ferramenta-visuais", "/portfolio", "/universo/demo", "/decision-lab/demo",
  "/dataflow-lab/demo", "/ferramentas/raio-x/demo",
];

function texto(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ");
}

async function main() {
  let falhas = 0;
  for (const pagina of PAGINAS) {
    let html: string;
    try {
      const r = await fetch(BASE + pagina, { headers: { Cookie: "lang=en" } });
      html = await r.text();
    } catch {
      console.log(`  PULOU ${pagina} (servidor fora do ar)`);
      continue;
    }
    let limpo = texto(html);
    for (const p of PERDOADAS) limpo = limpo.split(p).join(" ");
    const achadas = SO_PORTUGUES.filter((p) => limpo.toLowerCase().includes(p));
    if (achadas.length === 0) {
      console.log(`  ok   ${pagina}`);
      continue;
    }
    falhas++;
    console.log(`  FALHOU ${pagina}: ${achadas.join(", ")}`);
    // Mostra o trecho, que é o que ajuda a achar o arquivo.
    for (const p of achadas.slice(0, 3)) {
      const i = limpo.toLowerCase().indexOf(p);
      console.log(`      …${limpo.slice(Math.max(0, i - 60), i + 60).trim()}…`);
    }
  }
  console.log(falhas === 0 ? "\nnenhuma página com português sobrando" : `\n${falhas} páginas com português sobrando`);
  process.exit(falhas ? 1 : 0);
}

main();
