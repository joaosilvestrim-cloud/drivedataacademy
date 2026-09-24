/* Indexa as transcrições das aulas para o assistente achar onde um assunto é
   explicado.

   A fonte é a pasta legendas/, que já existe por causa do trabalho de
   legendagem: cada aula tem um pt.vtt com a fala e os tempos. Aqui esse texto
   vira janelas curtas gravadas em licao_trecho.

   O casamento entre pasta e aula é pelo id do player do Panda. O campo
   lessons.video_id guarda o iframe inteiro, e o id aparece dentro dele como
   ?v=<uuid>, que é exatamente o nome da pasta.

   Rodar de novo é seguro: apaga os trechos da aula antes de regravar. Aula
   cuja transcrição mudou entra atualizada, o resto fica como está.

   Uso: npx tsx scripts/indexar-aulas.ts [--curso <slug>] */

import fs from "fs";
import path from "path";
import Module from "module";

const resolver = (Module as any)._resolveFilename;
(Module as any)._resolveFilename = function (req: string, ...rest: any[]) {
  if (req === "server-only") return require.resolve("./_vazio.js");
  return resolver.call(this, req, ...rest);
};

for (const l of fs.readFileSync(".env.local", "utf8").split("\n")) {
  if (!l.includes("=") || l.startsWith("#")) continue;
  const i = l.indexOf("=");
  const chave = l.slice(0, i).trim();
  if (!process.env[chave]) process.env[chave] = l.slice(i + 1).trim().replace(/^"|"$/g, "");
}

import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const PASTA = path.join(process.cwd(), "legendas");

/* Janela de indexação.

   45 segundos é o que responde "onde isso é explicado" sem mandar o aluno
   caçar dentro de uma aula de uma hora, e ainda dá contexto suficiente para o
   modelo entender o assunto do trecho. Abaixo disso o texto vira fragmento
   solto, e acima vira "está em algum lugar destes cinco minutos". */
const JANELA_SEG = 45;
const MIN_CHARS = 40;

type Bloco = { ini: number; fim: number; texto: string };

function segundos(t: string): number {
  const [h, m, s] = t.split(":");
  return Number(h) * 3600 + Number(m) * 60 + Number(s.replace(",", "."));
}

function lerVtt(caminho: string): Bloco[] {
  const bruto = fs.readFileSync(caminho, "utf8").replace(/\r/g, "");
  const blocos: Bloco[] = [];
  for (const pedaco of bruto.split("\n\n")) {
    const linhas = pedaco.split("\n").filter(Boolean);
    const iTempo = linhas.findIndex((l) => l.includes("-->"));
    if (iTempo < 0) continue;
    const [de, ate] = linhas[iTempo].split("-->").map((x) => x.trim().split(" ")[0]);
    const texto = linhas
      .slice(iTempo + 1)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (texto) blocos.push({ ini: segundos(de), fim: segundos(ate), texto });
  }
  return blocos;
}

/* Junta os blocos em janelas. A emenda é por tempo e não por quantidade de
   linhas, porque legenda de fala rápida tem muitas linhas curtas e a de fala
   pausada tem poucas longas: contar linha daria janelas de tamanhos
   absurdamente diferentes. */
function janelas(blocos: Bloco[]): Bloco[] {
  const saida: Bloco[] = [];
  let atual: Bloco | null = null;
  for (const b of blocos) {
    if (atual && b.fim - atual.ini <= JANELA_SEG) {
      atual.fim = b.fim;
      atual.texto += " " + b.texto;
    } else {
      if (atual && atual.texto.length >= MIN_CHARS) saida.push(atual);
      atual = { ...b };
    }
  }
  if (atual && atual.texto.length >= MIN_CHARS) saida.push(atual);
  return saida;
}

async function main() {
  const iCurso = process.argv.indexOf("--curso");
  const soCurso = iCurso > 0 ? process.argv[iCurso + 1] : null;

  const { data: aulas } = await admin
    .from("lessons")
    .select("id, title, video_id, course_id, courses(slug, title)")
    .not("video_id", "is", null);

  // player id do Panda -> aula. Uma aula pode repetir o vídeo de outra: os
  // dois cursos de Snowflake apontam para os mesmos arquivos, e nesse caso as
  // duas precisam do índice, cada uma com o seu controle de acesso.
  const porVideo = new Map<string, any[]>();
  for (const a of aulas ?? []) {
    const m = String(a.video_id || "").match(/[?&]v=([0-9a-f-]{36})/i);
    if (!m) continue;
    const curso: any = a.courses;
    if (soCurso && curso?.slug !== soCurso) continue;
    const lista = porVideo.get(m[1]) ?? [];
    lista.push(a);
    porVideo.set(m[1], lista);
  }

  console.log(`aulas com vídeo do Panda: ${porVideo.size} vídeo(s) distintos`);

  let indexadas = 0;
  let trechos = 0;
  let semTranscricao = 0;

  for (const [videoId, lista] of porVideo) {
    const vtt = path.join(PASTA, videoId, "pt.vtt");
    if (!fs.existsSync(vtt)) {
      semTranscricao += lista.length;
      continue;
    }

    const partes = janelas(lerVtt(vtt));
    if (!partes.length) continue;

    for (const aula of lista) {
      await admin.from("licao_trecho").delete().eq("lesson_id", aula.id);

      // Em lotes: 600 linhas de uma vez estoura o limite de payload.
      for (let i = 0; i < partes.length; i += 200) {
        const { error } = await admin.from("licao_trecho").insert(
          partes.slice(i, i + 200).map((p) => ({
            lesson_id: aula.id,
            inicio: Math.round(p.ini),
            fim: Math.round(p.fim),
            texto: p.texto.slice(0, 2000),
          })),
        );
        if (error) {
          console.error(`  erro em ${aula.title}: ${error.message}`);
          break;
        }
      }

      indexadas++;
      trechos += partes.length;
      const curso = (aula.courses as any)?.title || "";
      console.log(`  ${String(partes.length).padStart(3)} trechos  ${aula.title.slice(0, 38).padEnd(40)} ${curso.slice(0, 26)}`);
    }
  }

  console.log(`\naulas indexadas: ${indexadas}  |  trechos: ${trechos}`);
  if (semTranscricao) console.log(`aulas sem transcrição na pasta legendas/: ${semTranscricao}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
