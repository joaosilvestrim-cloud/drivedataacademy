import "server-only";
import { chamarClaude, chamarIA } from "@/lib/ia-provedor";
import { catalogVersions } from "@/lib/knowledge/server";
import type { Catalog } from "@/lib/knowledge/types";

/* Competências que um projeto prova, lidas no texto inteiro do projeto.

   Antes o Universo 4D só olhava o campo Ferramentas. Um projeto de gestão
   que coordenou cronograma, riscos e stakeholders acendia apenas "Trello",
   que nem está no catálogo. O João pediu que a constelação nascesse do que
   o projeto conta, e que cada esfera dissesse por que acendeu.

   A regra é a mesma do organizador: nada de fato novo. Cada competência vem
   com um TRECHO copiado do próprio projeto que a prova, e o código confere
   que o trecho existe mesmo no texto. Se a IA citar algo que não está lá, a
   competência cai. Isso não depende de a IA obedecer: é uma busca de texto.

   O trecho também é o "por que" que o visitante lê no 4D. Então ele serve
   duas vezes: como prova para a plataforma e como explicação para quem vê. */

export type CompetenciaProvada = { id: string; trecho: string };
export type CompetenciasDoProjeto = { hash: string; itens: CompetenciaProvada[] };

const norm = (t: string) =>
  (t || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/* Impressão do texto, para não pagar a IA de novo quando o aluno salva o
   projeto sem mudar nada. Não precisa ser criptográfica, só estável. */
export function hashDoTexto(texto: string): string {
  let h = 5381;
  const s = norm(texto);
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return String(h >>> 0);
}

export function textoDoProjeto(p: { titulo?: string | null; resumo?: string | null; problema?: string | null; resultado?: string | null; descricao?: string | null }): string {
  return [p.titulo, p.resumo, p.problema, p.resultado, p.descricao].filter(Boolean).join("\n");
}

async function catalogoAtual(): Promise<Catalog | null> {
  try {
    const versoes = await catalogVersions();
    return (versoes.at(-1)?.document as Catalog) ?? null;
  } catch {
    return null;
  }
}

/** Devolve null quando a IA não respondeu. Lista vazia é resposta válida: o texto não prova nada do catálogo. */
export async function identificarCompetencias(texto: string): Promise<CompetenciaProvada[] | null> {
  const limpo = (texto || "").trim().slice(0, 6000);
  if (limpo.length < 30) return [];
  const catalogo = await catalogoAtual();
  if (!catalogo) return null;

  const lista = catalogo.competencies.map((c) => `- ${c.id}: ${c.name}. ${c.description}`).join("\n");
  const sistema = `Você lê o texto de um projeto profissional e aponta quais competências do catálogo abaixo ele DEMONSTRA.

Catálogo (use só estes ids):
${lista}

Devolva APENAS um JSON: {"competencias": [{"id": "...", "trecho": "..."}]}

Regras:
- "trecho" é uma citação LITERAL do texto do projeto, copiada caractere por caractere, de 3 a 25 palavras, que prova a competência. Não resuma, não parafraseie, não junte pedaços de frases diferentes.
- Só entra competência que o projeto mostra a pessoa exercendo. Assunto citado de passagem, desejo ou plano não conta.
- O trecho precisa PROVAR aquela competência, não só estar perto dela. Pergunte: um recrutador, lendo só esse trecho, concluiria que a pessoa tem essa competência?
- Competência que é ferramenta (Power BI, DAX, SQL, Excel, Python, Snowflake) só entra se o nome da ferramenta estiver no trecho. "Dashboard" não prova Power BI; "planilha" não prova Excel.
- Stakeholders: só quando o texto fala de alinhar expectativas, comunicar decisões ou negociar com clientes, patrocinadores ou áreas. Acompanhar desempenho não é isso.
- Riscos: só quando o texto fala de identificar, antecipar ou tratar riscos.
- Agentes: quando a pessoa construiu ou coordenou um agente de IA com ferramentas ou etapas.
- Na dúvida, deixe de fora. Uma competência a menos é melhor que uma sem prova.
- Uma entrada por competência. No máximo 10.
- Se nada do catálogo é demonstrado, devolva {"competencias": []}.`;

  let resposta = await chamarClaude({ sistema, usuario: limpo, max_tokens: 1200 });
  if (!resposta) {
    for (const modelo of ["openai/gpt-oss-120b", "openai/gpt-oss-20b"]) {
      const r = await chamarIA({
        messages: [
          { role: "system", content: sistema },
          { role: "user", content: limpo },
        ],
        json: true,
        temperature: 0.1,
        max_tokens: 1400,
        raciocinio: "low",
        modelo,
        timeoutMs: 30000,
      });
      if (r) { resposta = r.texto; break; }
    }
  }
  if (!resposta) return null;

  let j: any;
  try {
    j = JSON.parse(resposta.slice(resposta.indexOf("{"), resposta.lastIndexOf("}") + 1));
  } catch {
    return null;
  }

  /* Competência que é ferramenta só vale com o nome dela no trecho. No teste,
   "dashboards de psicólogos e pacientes" acendeu Power BI num projeto que não
   usou Power BI. O trecho existia, mas não provava. Para ferramenta isso dá
   para conferir no código; para as outras, fica o critério do prompt. */
const EXIGE_TERMO: Record<string, string[]> = {
  "power-bi": ["power bi", "powerbi"],
  dax: ["dax"],
  sql: ["sql"],
  excel: ["excel"],
  python: ["python"],
  snowflake: ["snowflake"],
};

/* A trava. O trecho só vale se estiver no texto, comparado sem acento,
     pontuação nem maiúscula, porque a IA às vezes troca uma vírgula ou uma
     aspa. Trocar uma palavra já não passa. */
  const ids = new Set(catalogo.competencies.map((c) => c.id));
  const fonte = ` ${norm(limpo)} `;
  const vistos = new Set<string>();
  const itens: CompetenciaProvada[] = [];
  for (const c of Array.isArray(j?.competencias) ? j.competencias : []) {
    const id = String(c?.id || "");
    const trecho = String(c?.trecho || "").trim().replace(/^["'“”]+|["'“”]+$/g, "");
    const palavras = norm(trecho).split(" ").filter(Boolean).length;
    if (!ids.has(id) || vistos.has(id) || palavras < 3) continue;
    if (!fonte.includes(` ${norm(trecho)} `)) continue;
    const termos = EXIGE_TERMO[id];
    if (termos && !termos.some((t) => ` ${norm(trecho)} `.includes(` ${t} `))) continue;
    vistos.add(id);
    itens.push({ id, trecho: trecho.slice(0, 220) });
  }
  return itens.slice(0, 10);
}

/* Para salvar o projeto: reaproveita o que já foi identificado se o texto não
   mudou, e nunca impede o salvamento. Se a IA estiver fora, o projeto é salvo
   sem competências novas e o 4D cai para as ferramentas, como era antes. */
export async function competenciasParaSalvar(
  texto: string,
  anterior: CompetenciasDoProjeto | null | undefined,
): Promise<CompetenciasDoProjeto | null> {
  const hash = hashDoTexto(texto);
  if (anterior?.hash === hash) return anterior;
  const itens = await identificarCompetencias(texto);
  if (itens === null) return anterior ?? null;
  return { hash, itens };
}

/** Nome de cada competência, para a tela do aluno. */
export async function nomesDasCompetencias(): Promise<Record<string, string>> {
  const catalogo = await catalogoAtual();
  return Object.fromEntries((catalogo?.competencies ?? []).map((c) => [c.id, c.name]));
}
