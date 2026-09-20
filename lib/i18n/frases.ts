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
  // Nome da ferramenta, não descrição: "Raio-X of the Dashboard" fica com
  // cara de tradução pela metade. O nome é o mesmo nos três idiomas.
  "Raio-X do Dashboard": { en: "Raio-X do Dashboard", es: "Raio-X do Dashboard" },
  "Destaque": { es: "Destacado" },
  // O modelo resumiu estas duas em estilo de telegrama e perdeu a segunda
  // metade da ideia, que é justamente a parte útil.
  "De um lado o extrato do sistema, do outro o que o painel mostra. A diferença entre eles é o tamanho da encrenca. Só isso, ainda não diz onde ela mora.": {
    en: "On one side the system statement, on the other what the dashboard shows. The gap between them is the size of the trouble. That alone doesn't say where it lives.",
  },
  "Diga o nome da sua medida e marque o que precisa: acumulado no ano, comparação com o ano anterior, média móvel. Sai tudo escrito em cima dela.": {
    en: "Give your measure a name and tick what you need: year to date, same period last year, moving average. It all comes out written on top of it.",
  },
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
