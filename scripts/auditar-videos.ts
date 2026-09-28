/* Audita o padrão dos vídeos: legenda por idioma e cobertura da transcrição.

   Existe porque padrão que ninguém mede não é padrão, é intenção. Duas falhas
   reais já passaram despercebidas aqui:

   1. Aula subida sem legenda nenhuma. Ninguém percebe até um aluno abrir.
   2. Pior, e mais difícil de ver: legenda que EXISTE mas cobre só o começo do
      vídeo. Uma aula de 74 minutos tinha legenda até o minuto 10, e na tela
      parecia legendada. Só apareceu quando comparei com a duração real.

   Por isso a auditoria não pergunta "tem legenda?", pergunta "a legenda vai
   até o fim?".

   E pergunta antes de tudo: "alguém assiste isso?". A conta do Panda guarda
   vídeo de teste, material de cliente antigo e os exemplos que vêm com a
   plataforma. Legendar o que ninguém abre é crédito jogado fora, e uma lista
   de 19 pendências onde só 8 importam faz o padrão parecer inalcançável.

   Uso: npx tsx scripts/auditar-videos.ts [--idioma en] */

import fs from "fs";
import Module from "module";
import { createClient } from "@supabase/supabase-js";

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

const PANDA = "https://api-v2.pandavideo.com.br";
const OBRIGATORIOS = ["pt-BR", "en"]; // espanhol ainda é decisão comercial

/* Abaixo disto a legenda para antes do vídeo. 92% e não 100% porque é comum o
   fim ter só música, silêncio ou o "até a próxima" cortado. */
const COBERTURA_MINIMA = 0.92;

async function panda<T = any>(caminho: string): Promise<T> {
  const r = await fetch(PANDA + caminho, {
    headers: { Authorization: process.env.PANDA_API_KEY!, accept: "application/json" },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Panda ${r.status} em ${caminho}`);
  return (await r.json()) as T;
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

/* Os ids de vídeo que a plataforma realmente aponta, vindos das aulas e das
   gravações de live. O campo guarda o endereço de embed inteiro, então o id
   sai por expressão regular em vez de comparação direta. */
async function emUso(): Promise<Map<string, string>> {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
  const mapa = new Map<string, string>();

  const { data: aulas } = await db.from("lessons").select("title, video_id");
  for (const a of aulas ?? []) {
    for (const id of String(a.video_id || "").match(uuid) ?? []) mapa.set(id, `aula: ${a.title}`);
  }
  const { data: lives } = await db.from("live_events").select("title, recording_url, recording_url_2");
  for (const l of lives ?? []) {
    for (const campo of [l.recording_url, l.recording_url_2]) {
      for (const id of String(campo || "").match(uuid) ?? []) mapa.set(id, `gravação: ${l.title}`);
    }
  }
  return mapa;
}

async function main() {
  const i = process.argv.indexOf("--idioma");
  const idiomas = i > 0 ? [process.argv[i + 1]] : OBRIGATORIOS;
  const todos = process.argv.includes("--todos");
  const usados = await emUso();

  const videos: any[] = [];
  for (let p = 1; p < 20; p++) {
    const r = await panda<any>(`/videos?limit=100&page=${p}`);
    const lote = r.videos ?? [];
    videos.push(...lote);
    if (lote.length < 100) break;
  }

  const foraDaPlataforma: string[] = [];
  const semLegenda: string[] = [];
  const truncadas: string[] = [];
  const faltaIdioma: string[] = [];
  let ok = 0;

  for (const v of videos) {
    const titulo = String(v.title || v.id).replace(/\.mp4$/i, "").slice(0, 46);
    const duracao = Number(v.length || 0);
    if (!duracao) continue;

    /* Os dois ids do Panda. O `id` é o da API, usado nos endpoints. O que a
       plataforma guarda é o outro, o do player, que vem em
       `video_external_id` e é o `?v=` dentro do iframe colado. Confundir os
       dois foi o que fez a primeira versão desta checagem dizer que 50 vídeos
       estavam fora da plataforma. */
    const chaves = [v.id, v.video_external_id].filter(Boolean);
    const onde = chaves.map((k: string) => usados.get(k)).find(Boolean);
    if (!onde) {
      foraDaPlataforma.push(`${titulo}  (${Math.round(duracao / 60)} min)`);
      if (!todos) continue;
    }

    let subs: any[] = [];
    try {
      subs = (await panda<any>(`/subtitles/${v.id}`)).subtitles ?? [];
    } catch {
      /* vídeo sem nenhuma legenda devolve erro em alguns casos */
    }
    const tem = new Set(subs.map((s: any) => s.srclang));

    if (!tem.size) {
      semLegenda.push(`${titulo}  (${Math.round(duracao / 60)} min)`);
      continue;
    }

    const faltando = idiomas.filter((x) => !tem.has(x));
    if (faltando.length) faltaIdioma.push(`${titulo}  falta ${faltando.join(", ")}`);

    // Cobertura: a legenda do idioma base vai até onde no vídeo?
    try {
      const r = await fetch(`${PANDA}/subtitles/${v.id}/pt-BR`, {
        headers: { Authorization: process.env.PANDA_API_KEY! },
        cache: "no-store",
      });
      if (r.ok) {
        const fim = fimDoVtt(await r.text());
        const cob = fim / duracao;
        if (cob < COBERTURA_MINIMA) {
          truncadas.push(`${titulo}  legenda até ${Math.round(fim / 60)} min de ${Math.round(duracao / 60)} min  (${Math.round(cob * 100)}%)`);
        } else if (!faltando.length) ok++;
      }
    } catch {
      /* ignora: a falta de idioma já foi contada */
    }
  }

  const bloco = (titulo: string, itens: string[]) => {
    console.log(`\n${titulo} (${itens.length})`);
    if (!itens.length) console.log("  nada");
    for (const x of itens) console.log("  " + x);
  };

  const auditados = videos.length - (todos ? 0 : foraDaPlataforma.length);
  console.log(`vídeos no Panda: ${videos.length}  |  em uso na plataforma: ${auditados}  |  dentro do padrão: ${ok}`);
  bloco("SEM LEGENDA NENHUMA", semLegenda);
  bloco("LEGENDA TRUNCADA (para antes do fim do vídeo)", truncadas);
  bloco(`FALTA IDIOMA (${idiomas.join(", ")})`, faltaIdioma);
  bloco("FORA DA PLATAFORMA (nenhuma aula ou gravação aponta para eles)", foraDaPlataforma);
  if (!todos && foraDaPlataforma.length) {
    console.log("\n  Estes ficaram de fora da auditoria. Use --todos para cobrá-los também.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
