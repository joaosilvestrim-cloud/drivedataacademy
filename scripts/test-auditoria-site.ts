/* Uso: npx tsx scripts/test-auditoria-site.ts <site.html>

   Confere a auditoria do site colado em tres casos: o site como veio, o
   mesmo site cortado no meio (o que acontece quando a IA bate no limite de
   resposta) e um site ruim de proposito. */
import fs from "fs";
import { auditarSite } from "../lib/portfolio-auditoria";

const html = fs.readFileSync(process.argv[2], "utf8");
const contexto = {
  titulosDosProjetos: [
    "Implantação de plataforma de gestão de ativos e infraestrutura",
    "Transformação digital orientada a dados",
    "Ayumana: plataforma de psicoterapia digital",
    "Programas de formação no PMI São Paulo",
  ],
  imagensPermitidas: [] as string[],
  linkUniverso: "https://academy.drivedata.com.br/portfolio/joao-vitor-lanfredi#universo",
};
// A foto do perfil e dele: entra na lista de imagens permitidas.
for (const m of html.matchAll(/<img\b[^>]*src=["']([^"']+)["']/gi)) if (m[1].includes("/avatars/")) contexto.imagensPermitidas.push(m[1]);

const ruim = `<!doctype html><html><head><title>Portfólio</title><script src="https://code.jquery.com/jquery.min.js"></script></head><body>
<h1>Seu Nome</h1><p>Lorem ipsum dolor sit amet.</p>
<h2>Transformação digital orientada a dados</h2>
<img src="https://images.unsplash.com/photo-123">
<form><input></form>
<!-- restante do código igual ao anterior -->
</body></html>`;

const casos: Record<string, string> = {
  "site atual": html,
  "site cortado": html.slice(0, Math.floor(html.length * 0.6)),
  "site ruim": ruim,
};

for (const [nome, h] of Object.entries(casos)) {
  const a = auditarSite(h, contexto);
  console.log(`\n=== ${nome}: ${a.nota}/100`);
  for (const x of a.achados) console.log(`  ${x.nivel.padEnd(5)} ${x.texto}`);
  if (!a.achados.length) console.log("  nenhum problema");
}
