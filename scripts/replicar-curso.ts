/* Copia as aulas que faltam de um curso para outro.

   Nasceu do Snowflake: o in-company recebe as aulas primeiro e depois elas
   descem para o curso da assinatura. Fazer isso na mão em 10 aulas é onde
   aparece aula fora de ordem, aula esquecida e aula duplicada.

   O que ele faz:
     - cria no destino os módulos que só existem na origem, pelo título;
     - copia as aulas que faltam, comparando pelo vídeo, não pelo título,
       porque título muda e vídeo não;
     - respeita a ordem da origem.

   O que ele NÃO faz, de propósito:
     - não mexe em aula que já existe no destino, nem em ordem, nem em título.
       Replicar é acrescentar o que falta, não sobrescrever o que o time já
       ajustou do lado de lá;
     - não copia anexos nem materiais: o arquivo é da aula de origem e
       duplicar registro de Storage cria dois donos para o mesmo arquivo.

   Uso:
     npx tsx scripts/replicar-curso.ts <slug-origem> <slug-destino> [--aplicar]

   Sem --aplicar ele só mostra o que faria. */

import fs from "fs";

for (const l of fs.readFileSync(".env.local", "utf8").split("\n")) {
  if (!l.includes("=") || l.startsWith("#")) continue;
  const i = l.indexOf("=");
  const chave = l.slice(0, i).trim();
  if (!process.env[chave]) process.env[chave] = l.slice(i + 1).trim().replace(/^"|"$/g, "");
}

import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

/* Aulas que nunca descem para o curso público, por id de vídeo do Panda.
   "Reuniao MS Teams" é gravação de reunião interna do projeto: serve ao
   cliente do in-company e não faz sentido nenhum para quem assina. */
const NAO_REPLICAR = new Set<string>(["a723ec18-d36e-476f-9bf9-dc3840e080c3"]);

const videoDe = (v: string | null) =>
  (v || "").match(/([0-9a-f]{8}-[0-9a-f-]{27})/)?.[1] ?? null;

async function curso(slug: string) {
  const { data } = await db.from("courses").select("id, title, slug").eq("slug", slug).maybeSingle();
  if (!data) throw new Error(`curso '${slug}' não existe`);
  return data;
}

async function estrutura(courseId: string) {
  const { data: mods } = await db.from("course_modules").select("id, title, position, available_at").eq("course_id", courseId).order("position");
  const { data: aulas } = await db.from("lessons").select("*").eq("course_id", courseId).order("position");
  return { mods: mods ?? [], aulas: aulas ?? [] };
}

async function main() {
  const [slugOrigem, slugDestino] = process.argv.slice(2);
  const aplicar = process.argv.includes("--aplicar");
  if (!slugOrigem || !slugDestino) {
    return console.log("uso: npx tsx scripts/replicar-curso.ts <origem> <destino> [--aplicar]");
  }

  const origem = await curso(slugOrigem);
  const destino = await curso(slugDestino);
  const A = await estrutura(origem.id);
  const B = await estrutura(destino.id);

  // O destino já tem este vídeo? É essa a pergunta que evita duplicar.
  const jaTem = new Set(B.aulas.map((a) => videoDe(a.video_id)).filter(Boolean));
  const modDestinoPorTitulo = new Map(B.mods.map((m) => [m.title.trim().toLowerCase(), m]));

  console.log(`origem : ${origem.title} (${A.aulas.length} aulas)`);
  console.log(`destino: ${destino.title} (${B.aulas.length} aulas)\n`);

  let criados = 0, copiadas = 0, puladas = 0;

  for (const mo of A.mods) {
    const aulasDoMod = A.aulas.filter((a) => a.module_id === mo.id);
    const faltando = aulasDoMod.filter((a) => {
      const v = videoDe(a.video_id);
      if (v && NAO_REPLICAR.has(v)) { puladas++; return false; }
      return !v || !jaTem.has(v);
    });
    if (!faltando.length) continue;

    let md = modDestinoPorTitulo.get(mo.title.trim().toLowerCase());
    if (!md) {
      console.log(`+ módulo "${mo.title}"`);
      criados++;
      if (aplicar) {
        const pos = Math.max(0, ...B.mods.map((m) => m.position ?? 0)) + 1;
        const { data, error } = await db.from("course_modules")
          .insert({ course_id: destino.id, title: mo.title, position: pos, available_at: mo.available_at })
          .select("id, title, position, available_at").single();
        if (error) return console.log("  erro ao criar o módulo:", error.message);
        md = data; B.mods.push(data); modDestinoPorTitulo.set(mo.title.trim().toLowerCase(), data);
      }
    }

    // A posição continua de onde o módulo de destino parou.
    let pos = Math.max(0, ...B.aulas.filter((a) => md && a.module_id === md.id).map((a) => a.position ?? 0));
    for (const a of faltando) {
      pos++;
      console.log(`  + ${a.title}`);
      copiadas++;
      if (aplicar && md) {
        const { error } = await db.from("lessons").insert({
          course_id: destino.id,
          module_id: md.id,
          title: a.title,
          type: a.type,
          video_id: a.video_id,
          video_provider: a.video_provider,
          content: a.content,
          duration: a.duration,
          materials: a.materials,
          is_preview: false,          // preview é decisão do curso de destino
          subtitle_langs: a.subtitle_langs,
          position: pos,
        });
        if (error) console.log("    erro:", error.message);
      }
    }
  }

  console.log(`\n${criados} módulo(s), ${copiadas} aula(s)${puladas ? `, ${puladas} pulada(s) pela lista de exceção` : ""}`);
  if (!aplicar) console.log("\nnada foi gravado. rode de novo com --aplicar para valer.");
}

main();
