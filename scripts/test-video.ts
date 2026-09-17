/* Testes do leitor de vídeo colado.

   Esse módulo decide se a gravação aparece ou não para o aluno. Quando ele
   erra, o admin salva, a tela não mostra nada e ninguém sabe se o problema foi
   o link. Por isso o caso real que apareceu em produção está aqui como teste.

   npm run test:video */

import { resolverVideo, srcColado, pandaId } from "../lib/video";

let ok = 0;
let falhou = 0;
const checa = (nome: string, cond: boolean, detalhe = "") => {
  if (cond) { ok++; return; }
  falhou++;
  console.log(`  FALHOU: ${nome}${detalhe ? ` -> ${detalhe}` : ""}`);
};

const HOST = "player-vz-a566992d-663.tv.pandavideo.com.br";
const ID = "38410d39-afba-40aa-9bc9-d419efdbd251";
const EMBED = `https://${HOST}/embed/?v=${ID}`;

// O código exatamente como o Panda entrega no botão Compartilhar.
const IFRAME = `<iframe id="panda-${ID}" src="${EMBED}" style="border:none;" allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture" allowfullscreen=true width="720" height="360" fetchpriority="high"></iframe>`;

console.log("\nPanda");
checa("tira o src do iframe colado", srcColado(IFRAME) === EMBED, srcColado(IFRAME));
checa("o id do iframe não engana o leitor", !srcColado(IFRAME).startsWith("panda-"));
checa("iframe vira embed", resolverVideo(IFRAME)?.src === EMBED);
checa("iframe é reconhecido como panda", resolverVideo(IFRAME)?.provedor === "panda");
checa("url de embed passa direto", resolverVideo(EMBED)?.src === EMBED);
checa("embed funciona sem a variável de host", resolverVideo(EMBED, null)?.src === EMBED);
checa("id solto precisa do host", resolverVideo(ID, null) === null);
checa("id solto com host monta a url", resolverVideo(ID, HOST)?.src === EMBED);
checa("pandaId acha na url", pandaId(EMBED) === ID);
checa("pandaId acha no iframe", pandaId(IFRAME) === ID);
checa("iframe com aspas simples", resolverVideo(`<iframe src='${EMBED}'></iframe>`)?.src === EMBED);
checa("espaço em volta não atrapalha", resolverVideo(`  ${EMBED}  `)?.src === EMBED);

console.log("\nYouTube");
checa("youtu.be", resolverVideo("https://youtu.be/Uz-ofb40uyM")?.src.includes("/embed/Uz-ofb40uyM") === true);
checa("watch", resolverVideo("https://www.youtube.com/watch?v=Uz-ofb40uyM")?.provedor === "youtube");
checa("live", resolverVideo("https://www.youtube.com/live/Uz-ofb40uyM?si=abc")?.src.includes("Uz-ofb40uyM") === true);
checa("id de 11 caracteres", resolverVideo("Uz-ofb40uyM")?.provedor === "youtube");
checa("iframe do YouTube também", resolverVideo(`<iframe src="https://www.youtube.com/embed/Uz-ofb40uyM"></iframe>`)?.provedor === "youtube");

console.log("\nVazio e lixo");
checa("vazio é nulo", resolverVideo("") === null);
checa("nulo é nulo", resolverVideo(null) === null);
checa("só espaço é nulo", resolverVideo("   ") === null);
checa("texto qualquer é nulo", resolverVideo("me manda o link depois") === null);
checa("link de outro site é nulo", resolverVideo("https://drive.google.com/file/d/123/view") === null);
checa("srcColado de vazio é string vazia", srcColado(undefined) === "");

console.log(`\n${ok} passaram, ${falhou} falharam.`);
process.exit(falhou ? 1 : 0);
