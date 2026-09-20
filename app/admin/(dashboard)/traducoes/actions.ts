"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { TRADUZIVEIS, type TabelaTraduzivel } from "@/lib/i18n/conteudo";
import { traduzirTexto } from "@/lib/i18n/traduzir-conteudo";
import { IDIOMAS, type Idioma } from "@/lib/i18n/idioma";

/* Traduções do conteúdo do banco.

   Duas formas de preencher: o botão "Traduzir com IA", que escreve tudo de
   uma vez e marca como 'ia', e a edição à mão, que marca como 'humano'. A
   segunda sempre vence, e é ela que tira o aviso de "não revisado" da tela. */

async function admin() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return createAdminClient();
}

function voltar(tabela: string, registro: string, msg: string, ok = true) {
  revalidatePath("/admin/traducoes");
  revalidatePath("/conta", "layout");
  redirect(`/admin/traducoes?tabela=${tabela}&registro=${registro}&${ok ? "ok" : "error"}=${encodeURIComponent(msg)}`);
}

const OUTROS_IDIOMAS = IDIOMAS.filter((l) => l !== "pt") as Exclude<Idioma, "pt">[];

export async function salvarTraducao(formData: FormData) {
  const supabase = await admin();
  const tabela = String(formData.get("tabela") || "") as TabelaTraduzivel;
  const registro = String(formData.get("registro") || "");
  if (!TRADUZIVEIS[tabela] || !registro) voltar(tabela, registro, "Registro inválido.", false);

  const linhas: { tabela: string; registro: string; campo: string; idioma: string; texto: string; origem: string; updated_at: string }[] = [];
  const apagar: { campo: string; idioma: string }[] = [];

  for (const campo of TRADUZIVEIS[tabela]) {
    for (const idioma of OUTROS_IDIOMAS) {
      const bruto = formData.get(`${campo}__${idioma}`);
      if (bruto == null) continue;
      const texto = String(bruto).trim();
      // Campo esvaziado é um pedido para voltar ao português, não uma
      // tradução vazia: a linha sai da tabela.
      if (!texto) apagar.push({ campo, idioma });
      else linhas.push({ tabela, registro, campo, idioma, texto, origem: "humano", updated_at: new Date().toISOString() });
    }
  }

  if (linhas.length) {
    const { error } = await supabase.from("content_translations").upsert(linhas);
    if (error) voltar(tabela, registro, error.message, false);
  }
  for (const a of apagar) {
    await supabase.from("content_translations").delete()
      .eq("tabela", tabela).eq("registro", registro).eq("campo", a.campo).eq("idioma", a.idioma);
  }
  voltar(tabela, registro, "Tradução salva.");
}

export async function traduzirComIA(formData: FormData) {
  const supabase = await admin();
  const tabela = String(formData.get("tabela") || "") as TabelaTraduzivel;
  const registro = String(formData.get("registro") || "");
  if (!TRADUZIVEIS[tabela] || !registro) voltar(tabela, registro, "Registro inválido.", false);

  const campos = TRADUZIVEIS[tabela] as readonly string[];
  const { data: original } = await supabase.from(tabela).select(["id", ...campos].join(", ")).eq("id", registro).maybeSingle();
  if (!original) voltar(tabela, registro, "Não achei esse registro.", false);

  // O que já foi revisado por gente não é sobrescrito pela máquina.
  const { data: jaTem } = await supabase
    .from("content_translations").select("campo, idioma, origem")
    .eq("tabela", tabela).eq("registro", registro);
  const revisado = new Set((jaTem ?? []).filter((l) => l.origem === "humano").map((l) => `${l.campo}|${l.idioma}`));

  const linhas = [];
  for (const campo of campos) {
    const texto = (original as unknown as Record<string, unknown>)[campo];
    if (typeof texto !== "string" || !texto.trim()) continue;
    for (const idioma of OUTROS_IDIOMAS) {
      if (revisado.has(`${campo}|${idioma}`)) continue;
      const saida = await traduzirTexto(texto, idioma);
      if (!saida) continue;
      linhas.push({ tabela, registro, campo, idioma, texto: saida, origem: "ia", updated_at: new Date().toISOString() });
    }
  }

  if (!linhas.length) voltar(tabela, registro, "Nada para traduzir. Confira a GROQ_API_KEY.", false);
  const { error } = await supabase.from("content_translations").upsert(linhas);
  if (error) voltar(tabela, registro, error.message, false);
  voltar(tabela, registro, `${linhas.length} campos traduzidos. Revise antes de confiar.`);
}
