import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { IDIOMA_PADRAO, type Idioma } from "./idioma";
import { idiomaAtual } from "./idioma-servidor";

/* Tradução do conteúdo que mora no banco.

   O texto da interface está no dicionário do código, porque é fixo. Curso,
   aula, live e material não são: o time cria e edita todo dia. Então a
   tradução vive no banco, ao lado do original, e a tela pede quando precisa.

   Quem não tem tradução não tem linha. A tela cai no português, que é a
   fonte da verdade, em vez de mostrar campo vazio. */

/** As tabelas e os campos que valem a pena traduzir. */
export const TRADUZIVEIS = {
  courses: ["title", "subtitle", "description", "level"],
  course_modules: ["title"],
  lessons: ["title", "content"],
  live_events: ["title", "description"],
  materials: ["title", "subtitle", "description", "cta_text"],
} as const;

export type TabelaTraduzivel = keyof typeof TRADUZIVEIS;

type Linha = { registro: string; campo: string; texto: string };

/** { registroId: { campo: texto } } para uma tabela e um idioma. */
export type MapaDeTraducao = Record<string, Record<string, string>>;

export async function traducoesDe(
  tabela: TabelaTraduzivel,
  registros: string[],
  idioma?: Idioma,
): Promise<MapaDeTraducao> {
  const lang = idioma ?? idiomaAtual();
  if (lang === IDIOMA_PADRAO || registros.length === 0) return {};

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("content_translations")
    .select("registro, campo, texto")
    .eq("tabela", tabela)
    .eq("idioma", lang)
    .in("registro", registros);

  const mapa: MapaDeTraducao = {};
  for (const l of (data ?? []) as Linha[]) {
    (mapa[l.registro] ??= {})[l.campo] = l.texto;
  }
  return mapa;
}

/* Devolve o registro com os campos traduzidos por cima do original.

   O campo que não tem tradução fica como está, então a tela nunca perde
   texto por causa de uma tradução que ninguém fez ainda. */
export function comTraducao<T extends { id: string }>(registro: T, mapa: MapaDeTraducao): T {
  const traduzido = mapa[registro.id];
  if (!traduzido) return registro;
  const copia = { ...registro } as Record<string, unknown>;
  for (const [campo, texto] of Object.entries(traduzido)) {
    if (texto && copia[campo] != null) copia[campo] = texto;
  }
  return copia as T;
}

/** O mesmo, para uma lista: busca as traduções de todos os registros de uma vez. */
export async function listaTraduzida<T extends { id: string }>(
  tabela: TabelaTraduzivel,
  registros: T[],
  idioma?: Idioma,
): Promise<T[]> {
  const mapa = await traducoesDe(tabela, registros.map((r) => r.id), idioma);
  if (Object.keys(mapa).length === 0) return registros;
  return registros.map((r) => comTraducao(r, mapa));
}
