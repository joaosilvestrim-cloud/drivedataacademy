import { IDIOMA_PADRAO, type Idioma } from "./idioma";

/* Frases da interface, indexadas pelo próprio português.

   A chave é o texto em português, não um código: quem lê o componente entende
   o que está escrito sem abrir o dicionário, e frase sem tradução aparece em
   português em vez de sumir.

   O arquivo lib/i18n/frases-geradas.ts é escrito pelo scripts/i18n.py, que
   extrai as frases das telas e traduz com glossário técnico. Tradução revisada
   à mão entra em CORRECOES e vence a automática. */

import { GERADAS } from "./frases-geradas";
import { MASCOT_POLL_PHRASES } from "./mascot-poll";

type Par = { en: string; es: string };

/* Correções manuais: tudo que a máquina traduziu de um jeito que a gente não
   usaria. Vence o arquivo gerado. */
const CORRECOES: Record<string, Partial<Par>> = {
  ...MASCOT_POLL_PHRASES,
  // Pedaços curtos das datas da home ("ter, 06/10 às 19:30"): palavra solta
  // demais para a tradução automática acertar sem contexto.
  "às": { en: "at", es: "a las" },
  "Hoje": { en: "Today", es: "Hoy" },
  "Amanhã": { en: "Tomorrow", es: "Mañana" },
  "Validade": { en: "Valid until", es: "Válido hasta" },
  // Painel do Universo 4D: frases inteiras, sem nome no meio, para a ordem
  // das palavras funcionar nos três idiomas.
  "Cada competência acende porque um projeto a demonstra.": { en: "Each skill lights up because a project proves it.", es: "Cada competencia se enciende porque un proyecto la demuestra." },
  "Toque numa esfera para ver qual, e aperte play para ver a carreira crescer.": { en: "Tap a sphere to see which one, and press play to watch the career grow.", es: "Toca una esfera para ver cuál y pulsa play para ver crecer la carrera." },
  "competência": { en: "skill", es: "competencia" },
  "competências": { en: "skills", es: "competencias" },
  "projeto": { en: "project", es: "proyecto" },
  "projetos": { en: "projects", es: "proyectos" },
  "em": { en: "in", es: "en" },
  "carreira desde": { en: "career since", es: "carrera desde" },
  "Pausar": { en: "Pause", es: "Pausar" },
  "Ver a evolução": { en: "Watch the evolution", es: "Ver la evolución" },
  // Dica embaixo do player. "Legendas" e "engrenagem" precisam bater com o
  // que o menu do Panda escreve em cada idioma, senão o aluno procura um
  // botão que não existe com esse nome.
  "Esta aula tem legenda. No player, clique na engrenagem, abra Legendas e escolha o idioma.": {
    en: "This lesson has subtitles. In the player, click the gear, open Subtitles and pick your language.",
    es: "Esta clase tiene subtítulos. En el reproductor, haz clic en el engranaje, abre Subtítulos y elige tu idioma.",
  },
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
