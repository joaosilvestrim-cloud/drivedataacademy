/* Traduz de uma vez todo o conteúdo que mora no banco.

   O /admin/traducoes tem o botão "Traduzir com IA", mas é um registro por vez.
   Para virar a chave da plataforma inteira, isso seriam dezenas de cliques, e
   o time ficaria com telas pela metade enquanto clica.

   Este script faz o mesmo trabalho em lote: lê cada registro, traduz os
   campos que têm texto e grava em content_translations com origem 'ia'. O que
   alguém já revisou à mão (origem 'humano') nunca é tocado, e o que já tem
   tradução também não — então rodar de novo só completa o que falta.

   Uso: npx tsx scripts/traduzir-banco.ts [--forcar]
        --forcar refaz também o que a IA já tinha escrito. */

import fs from "fs";
import Module from "module";

// lib/i18n/traduzir-conteudo importa "server-only", que só existe no Next.
const resolver = (Module as any)._resolveFilename;
(Module as any)._resolveFilename = function (req: string, ...rest: any[]) {
  if (req === "server-only") return require.resolve("./_vazio.js");
  return resolver.call(this, req, ...rest);
};

for (const l of fs.readFileSync(".env.local", "utf8").split("\n")) {
  if (!l.includes("=") || l.startsWith("#")) continue;
  const i = l.indexOf("=");
  const chave = l.slice(0, i).trim();
  // O que já veio do shell vence o .env.local: é assim que se escolhe outro
  // modelo numa rodada sem editar arquivo.
  if (process.env[chave]) continue;
  process.env[chave] = l.slice(i + 1).trim().replace(/^"|"$/g, "");
}

import { createClient } from "@supabase/supabase-js";
import { TRADUZIVEIS, type TabelaTraduzivel } from "../lib/i18n/conteudo-tabelas";

/* Import tardio de propósito: o `import` no topo é içado para antes de tudo,
   inclusive do remendo acima, e aí o "server-only" volta a quebrar. */
const tradutor = async () => (await import("../lib/i18n/traduzir-conteudo")).traduzirTexto;

const forcar = process.argv.includes("--forcar");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const IDIOMAS = ["en", "es"] as const;

async function main() {
  const traduzirTexto = await tradutor();
  let escritas = 0;
  let pulados = 0;

  for (const tabela of Object.keys(TRADUZIVEIS) as TabelaTraduzivel[]) {
    const campos = TRADUZIVEIS[tabela] as readonly string[];
    const { data: registros, error } = await supabase
      .from(tabela)
      .select(["id", ...campos].join(", "))
      .limit(500);
    if (error) {
      console.log(`  ${tabela}: ${error.message}`);
      continue;
    }

    const { data: jaTem } = await supabase
      .from("content_translations")
      .select("registro, campo, idioma, origem")
      .eq("tabela", tabela);
    const feito = new Map<string, string>();
    for (const l of jaTem ?? []) feito.set(`${l.registro}|${l.campo}|${l.idioma}`, l.origem);

    console.log(`\n${tabela}: ${registros?.length ?? 0} registros`);

    for (const r of (registros ?? []) as unknown as Record<string, unknown>[]) {
      const id = r.id as string;
      const linhas: Record<string, unknown>[] = [];

      for (const campo of campos) {
        const texto = r[campo];
        if (typeof texto !== "string" || !texto.trim()) continue;
        for (const idioma of IDIOMAS) {
          const origem = feito.get(`${id}|${campo}|${idioma}`);
          // Revisão humana é palavra final, sempre. Tradução da máquina só é
          // refeita quando alguém pede.
          if (origem === "humano" || (origem === "ia" && !forcar)) {
            pulados++;
            continue;
          }
          const saida = await traduzirTexto(texto, idioma);
          if (!saida) continue;
          linhas.push({ tabela, registro: id, campo, idioma, texto: saida, origem: "ia", updated_at: new Date().toISOString() });
        }
      }

      if (!linhas.length) continue;
      const { error: erroGrava } = await supabase.from("content_translations").upsert(linhas);
      if (erroGrava) {
        console.log(`  ! ${id}: ${erroGrava.message}`);
        continue;
      }
      escritas += linhas.length;
      const titulo = String(r[campos[0]] ?? id).slice(0, 55);
      console.log(`  ${titulo} → ${linhas.length} campos`);
    }
  }

  console.log(`\n${escritas} traduções gravadas, ${pulados} já existiam.`);
  console.log("Revise em /admin/traducoes: tudo entrou marcado como não revisado.");
}

main();
