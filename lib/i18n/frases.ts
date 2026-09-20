import { IDIOMA_PADRAO, type Idioma } from "./idioma";

/* Frases da interface, indexadas pelo próprio português.

   A chave é o texto em português, não um código: quem lê o componente entende
   o que está escrito sem abrir o dicionário, e frase sem tradução aparece em
   português em vez de sumir.

   O arquivo lib/i18n/frases-geradas.ts é escrito pelo scripts/i18n.py, que
   extrai as frases das telas e traduz com glossário técnico. Tradução revisada
   à mão entra em CORRECOES e vence a automática. */

import { GERADAS } from "./frases-geradas";

type Par = { en: string; es: string };

/* Correções manuais: tudo que a máquina traduziu de um jeito que a gente não
   usaria. Vence o arquivo gerado. */
const CORRECOES: Record<string, Partial<Par>> = {
  "Ferramentas": { en: "Tools", es: "Herramientas" },
  "Gravações": { en: "Recordings", es: "Grabaciones" },
  "Vitrine": { en: "Directory", es: "Directorio" },
  // "Revisar" é revisar de novo; o botão manda conferir a resposta.
  "Conferir": { es: "Comprobar" },
  "Destaque": { es: "Destacado" },
};

export function frase(texto: string, idioma: Idioma): string {
  if (idioma === IDIOMA_PADRAO) return texto;
  const chave = texto.trim();
  const manual = CORRECOES[chave]?.[idioma as "en" | "es"];
  if (manual) return aplicarEspacos(texto, manual);
  const gerada = (GERADAS as Record<string, Par | undefined>)[chave]?.[idioma as "en" | "es"];
  return gerada ? aplicarEspacos(texto, gerada) : texto;
}

/* O texto original pode vir com espaço nas pontas, porque no JSX o espaço
   separa a frase do que vem ao lado. A tradução precisa manter esse espaço,
   senão palavras grudam. */
function aplicarEspacos(original: string, traduzido: string): string {
  const antes = original.match(/^\s*/)?.[0] ?? "";
  const depois = original.match(/\s*$/)?.[0] ?? "";
  return `${antes}${traduzido}${depois}`;
}
