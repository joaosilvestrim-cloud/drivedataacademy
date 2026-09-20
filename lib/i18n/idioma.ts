import { LANGS, DEFAULT_LANG, type Lang } from "./dictionaries";

/* O idioma, lido no servidor.

   A home já trocava de idioma no navegador, guardando a escolha em
   localStorage. Isso não serve para a área do aluno, que é renderizada no
   servidor: a página chegaria em português e trocaria depois, piscando.

   Agora a escolha vive em um cookie (`lang`). O servidor lê antes de
   renderizar, então a tela já nasce no idioma certo, e o mesmo cookie
   continua alimentando as telas de navegador.

   Este arquivo é puro de propósito: a tela também o importa, e quem fala com
   o cookie é o lib/i18n/idioma-servidor.ts. */

export const IDIOMAS = LANGS;
export type Idioma = Lang;
export const IDIOMA_PADRAO = DEFAULT_LANG;

export const NOME_DO_IDIOMA: Record<Idioma, string> = {
  pt: "Português",
  en: "English",
  es: "Español",
};

/** "pt-BR", "en", "es": o que vai no atributo lang do html. */
export const TAG_HTML: Record<Idioma, string> = { pt: "pt-BR", en: "en", es: "es" };

export function idiomaValido(valor: string | undefined | null): Idioma {
  return (IDIOMAS as readonly string[]).includes(valor || "") ? (valor as Idioma) : IDIOMA_PADRAO;
}
