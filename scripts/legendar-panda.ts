/* Gera as legendas que faltam, pela IA do próprio Panda.

   Faz o passo 2 do padrão descrito em docs/PADRAO-VIDEOS.md, que até aqui era
   manual no painel do Panda, vídeo por vídeo. Com 48 vídeos em uso isso não se
   sustentava: legendar à mão é onde as quatro legendas truncadas nasceram, e
   ninguém percebeu por semanas.

   O que ele sabe que o painel não conta:

   1. Só mexe em vídeo que alguma aula ou gravação de live aponta. A conta do
      Panda guarda material de cliente antigo e os vídeos de exemplo que vêm
      com a plataforma. Legendar isso é crédito no lixo.

   2. Não pergunta "tem legenda?", pergunta "a legenda vai até o fim?". Legenda
      que morre no minuto 10 de um vídeo de 74 aparece como pronta em qualquer
      listagem, inclusive na do painel do Panda.

   3. O Panda recusa transcrever por cima de legenda existente, com
      "Subtitles already exist for this lang". Então legenda truncada é apagada
      antes de refazer. Isso é intencional e só acontece abaixo do mínimo de
      cobertura: uma legenda ruim no lugar de nenhuma engana mais do que ajuda.

   COMO O PANDA COBRA, que é o ponto mais caro de errar:

   A cobrança é de ceil(duração / 30 min) por TRABALHO ENVIADO, e não por
   idioma. Um trabalho leva a transcrição mais todas as traduções pedidas junto,
   no campo `to_langs`. Então pedir português e inglês numa chamada custa
   metade de pedir em duas.

   A transcrição NÃO é gratuita. O painel do Panda dá essa impressão porque
   sempre manda a tradução junto, e a conta aparece uma vez só. Medido em
   28/09: um vídeo de 1 minuto, só transcrição, custou 1 crédito.

   Um crédito é R$ 1.

   Uso:
     npx tsx scripts/legendar-panda.ts            # só mostra o plano e o custo
     npx tsx scripts/legendar-panda.ts --aplicar  # dispara de verdade
     npx tsx scripts/legendar-panda.ts --limite 8 # para quando o custo chegar a 8 */

import fs from "fs";
import { createClient } from "@supabase/supabase-js";

for (const l of fs.readFileSync(".env.local", "utf8").split("\n")) {
  if (!l.includes("=") || l.startsWith("#")) continue;
  const i = l.indexOf("=");
  const k = l.slice(0, i).trim();
  if (!process.env[k]) process.env[k] = l.slice(i + 1).trim().replace(/^"|"$/g, "");
}

const PANDA = "https://api-v2.pandavideo.com.br";
const BASE = "pt-BR"; // idioma falado nas aulas: é dele que as traduções saem
const OBRIGATORIOS = ["pt-BR", "en"];
const COBERTURA_MINIMA = 0.92;

const H: Record<string, string> = {
  Authorization: process.env.PANDA_API_KEY!,
  accept: "application/json",
  "content-type": "application/json",
};

async function api(caminho: string, init?: RequestInit) {
  const r = await fetch(PANDA + caminho, { headers: H, cache: "no-store", ...init });
  const texto = await r.text();
  if (!r.ok) throw new Error(`${r.status} em ${caminho}: ${texto.slice(0, 200)}`);
  return texto ? JSON.parse(texto) : null;
}

function fimDoVtt(texto: string): number {
  const seg = (t: string) => {
    const [h, m, s] = t.split(":");
    return Number(h) * 3600 + Number(m) * 60 + Number(s);
  };
  let fim = 0;
  for (const m of texto.matchAll(/--> (\d+:\d+:\d+\.\d+)/g)) fim = Math.max(fim, seg(m[1]));
  return fim;
}

/* Cobertura da legenda: até onde no vídeo ela chega. Devolve -1 quando não
   existe, para separar "não tem" de "tem e está ruim". */
async function cobertura(videoId: string, lang: string, duracao: number): Promise<number> {
  const r = await fetch(`${PANDA}/subtitles/${videoId}/${lang}`, { headers: H, cache: "no-store" });
  if (!r.ok) return -1;
  return fimDoVtt(await r.text()) / duracao;
}

async function emUso(): Promise<Set<string>> {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
  const ids = new Set<string>();
  const { data: aulas } = await db.from("lessons").select("video_id");
  for (const a of aulas ?? []) for (const id of String(a.video_id || "").match(uuid) ?? []) ids.add(id);
  const { data: lives } = await db.from("live_events").select("recording_url, recording_url_2");
  for (const l of lives ?? [])
    for (const campo of [l.recording_url, l.recording_url_2])
      for (const id of String(campo || "").match(uuid) ?? []) ids.add(id);
  return ids;
}

type Plano = {
  videoId: string;
  titulo: string;
  min: number;
  refazerBase: boolean; // manda transcrição nova, levando as traduções junto
  apagar: string[]; // idiomas truncados, que o Panda exige apagar antes
  traduzir: string[];
  custo: number;
};

async function main() {
  const iIdiomas = process.argv.indexOf("--idiomas");
  const idiomas = iIdiomas > 0 ? process.argv[iIdiomas + 1].split(",") : OBRIGATORIOS;
  const iLimite = process.argv.indexOf("--limite");
  const limite = iLimite > 0 ? Number(process.argv[iLimite + 1]) : Infinity;
  const aplicar = process.argv.includes("--aplicar");

  const usados = await emUso();
  const videos: any[] = [];
  for (let p = 1; p < 20; p++) {
    const r = await api(`/videos?limit=100&page=${p}`);
    const lote = r.videos ?? [];
    videos.push(...lote);
    if (lote.length < 100) break;
  }

  const planos: Plano[] = [];
  for (const v of videos) {
    /* Os dois ids do Panda: `id` é o da API e `video_external_id` é o do
       player, que é o que a plataforma guarda dentro do iframe colado. */
    if (!usados.has(v.id) && !usados.has(v.video_external_id)) continue;
    const duracao = Number(v.length || 0);
    if (!duracao) continue;

    const faltando: string[] = [];
    const apagar: string[] = [];
    for (const lang of idiomas) {
      const cob = await cobertura(v.id, lang, duracao);
      if (cob >= COBERTURA_MINIMA) continue;
      faltando.push(lang);
      if (cob >= 0) apagar.push(lang);
    }
    if (!faltando.length) continue;

    /* Uma chamada por vídeo sempre que possível. Se o português precisa ser
       refeito, as traduções vão de carona nele e o vídeo é cobrado uma vez.
       Se o português já está bom, sobra uma tradução por idioma, e aí cada
       uma é um trabalho cobrado. */
    const refazerBase = faltando.includes(BASE);
    const traduzir = faltando.filter((l) => l !== BASE);
    const unidade = Math.ceil(duracao / 1800);
    const chamadas = refazerBase ? 1 : traduzir.length;

    planos.push({
      videoId: v.id,
      titulo: String(v.title || v.id).replace(/\.(mp4|mov)$/i, ""),
      min: Math.round(duracao / 60),
      refazerBase,
      apagar,
      traduzir,
      custo: unidade * chamadas,
    });
  }

  /* Ordem de atendimento, que importa quando o saldo não cobre tudo.

     Primeiro as legendas truncadas. Elas são piores que legenda nenhuma: o
     seletor de idioma aparece, a aula parece legendada e a legenda morre no
     meio. O aluno não reclama porque assume que é assim mesmo. Legenda
     ausente, ao menos, é visível.

     Empate resolve pelo mais barato, porque com saldo curto isso conserta
     mais aulas com o mesmo dinheiro. */
  planos.sort((a, b) => Number(!!b.apagar.length) - Number(!!a.apagar.length) || a.custo - b.custo);

  const { balance } = await api("/credits");
  const total = planos.reduce((s, p) => s + p.custo, 0);

  console.log(`vídeos em uso: ${usados.size}  |  vídeos pendentes: ${planos.length}\n`);
  for (const p of planos) {
    const o = [p.refazerBase ? BASE : null, ...p.traduzir].filter(Boolean).join(" + ");
    const nota = p.apagar.length ? ` (apaga ${p.apagar.join(", ")} truncada)` : "";
    console.log(`  ${String(p.min).padStart(3)} min  ${String(p.custo).padStart(2)} créd  ${o.padEnd(12)} ${p.titulo.slice(0, 40)}${nota}`);
  }
  console.log(`\ncusto: ${total} créditos (R$ ${total},00)  |  saldo: ${balance}`);

  if (!aplicar) return console.log("\nmodo seco. Para disparar: --aplicar");

  let gasto = 0;
  for (const p of planos) {
    if (gasto + p.custo > Math.min(limite, balance)) {
      console.log(`\nparei em ${gasto} créditos. ${planos.length} vídeos no plano, faltam os de baixo.`);
      break;
    }
    try {
      /* O Panda recusa gerar por cima de legenda que já existe.

         O DELETE exige corpo, mesmo não tendo o que receber: sem ele responde
         "# must be object", porque o cabeçalho anuncia JSON e nada chega. */
      for (const lang of p.apagar) await api(`/subtitles/${p.videoId}/${lang}`, { method: "DELETE", body: "{}" });

      if (p.refazerBase) {
        await api("/aiworkflow", {
          method: "POST",
          body: JSON.stringify({ video_id: p.videoId, type: "TRANSCRIPTION", from_lang: BASE, to_langs: p.traduzir, tier: "essential" }),
        });
      } else {
        for (const lang of p.traduzir) {
          await api("/aiworkflow", {
            method: "POST",
            body: JSON.stringify({ video_id: p.videoId, type: "TRANSLATE", from_lang: BASE, to_lang: lang, tier: "essential" }),
          });
        }
      }
      gasto += p.custo;
      console.log(`ok    ${String(p.custo).padStart(2)} créd  ${p.titulo.slice(0, 48)}`);
    } catch (e: any) {
      console.log(`FALHA          ${p.titulo.slice(0, 48)}  ${e.message}`);
    }
  }

  console.log(`\ngasto nesta rodada: ${gasto} créditos.`);
  console.log("Os trabalhos entram numa fila e levam cerca de 30 min.");
  console.log("Depois rode: npx tsx scripts/auditar-videos.ts");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
