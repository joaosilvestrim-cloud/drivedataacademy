/* Põe no ar o primeiro ebook: a Metodologia de BI do Bruno Caldas, nas duas
   edições que já existem (português e inglês).

   Idempotente: cria o bucket se faltar, sobe o arquivo que ainda não está lá e
   atualiza o registro em vez de duplicar. Rodar de novo não estraga nada.

   Uso: npx tsx scripts/seed-ebook-bi.ts */

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
import { BUCKET_EBOOKS } from "../lib/ebooks";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const DOWNLOADS = path.join(process.env.USERPROFILE || process.env.HOME || ".", "Downloads");

const EDICOES = [
  { idioma: "pt", arquivo: "Ebook - Metodologia de Business Intelligence (PT-BR).pdf" },
  { idioma: "en", arquivo: "Ebook - Business Intelligence Methodology.pdf" },
];

const EBOOK = {
  slug: "metodologia-de-projetos-de-bi",
  title: "Metodologia de Implementação de Projetos de BI",
  subtitle: "Gestão de Projetos aplicada ao BI, com as boas práticas do PMBOK",
  description:
    "O material escrito da aula do Bruno Caldas: como organizar um projeto de Business Intelligence dentro de uma metodologia clara, do planejamento e levantamento de requisitos ao desenvolvimento, validação, entrega e acompanhamento.",
  autor: "Bruno Caldas",
  paginas: 70,
  published: true,
  position: 0,
};

async function main() {
  // 1. O bucket é privado: o arquivo só sai por link assinado, pela rota que
  //    confere a assinatura.
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET_EBOOKS)) {
    const { error } = await supabase.storage.createBucket(BUCKET_EBOOKS, { public: false });
    if (error) return console.log("não consegui criar o bucket:", error.message);
    console.log("bucket criado:", BUCKET_EBOOKS);
  } else {
    console.log("bucket já existia:", BUCKET_EBOOKS);
  }

  // 2. O ebook. Pelo slug, então rodar de novo atualiza em vez de duplicar.
  const { data: ebook, error: erroEbook } = await supabase
    .from("ebooks")
    .upsert({ ...EBOOK, updated_at: new Date().toISOString() }, { onConflict: "slug" })
    .select("id, slug")
    .single();
  if (erroEbook || !ebook) return console.log("erro no ebook:", erroEbook?.message, "— a migration 20260920_ebooks.sql já rodou?");
  console.log("ebook:", ebook.slug);

  // 3. As edições.
  for (const e of EDICOES) {
    const origem = path.join(DOWNLOADS, e.arquivo);
    if (!fs.existsSync(origem)) {
      console.log(`  ! não achei ${e.arquivo} em ${DOWNLOADS}`);
      continue;
    }
    const corpo = fs.readFileSync(origem);
    const destino = `${ebook.slug}/${e.idioma}.pdf`;
    const { error: erroUp } = await supabase.storage
      .from(BUCKET_EBOOKS)
      .upload(destino, corpo, { contentType: "application/pdf", upsert: true });
    if (erroUp) {
      console.log(`  ! ${e.idioma}: ${erroUp.message}`);
      continue;
    }
    const { error: erroLinha } = await supabase.from("ebook_files").upsert({
      ebook_id: ebook.id,
      idioma: e.idioma,
      file_path: destino,
      file_name: e.arquivo,
      file_size: corpo.length,
    });
    console.log(`  ${e.idioma}: ${erroLinha ? "erro " + erroLinha.message : `${(corpo.length / 1048576).toFixed(1)} MB no ar`}`);
  }
}

main();
