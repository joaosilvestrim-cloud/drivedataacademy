import "server-only";
import { NOME_DO_IDIOMA, type Idioma } from "./idioma";

/* Traduz texto de curso, aula, live e material com a mesma IA do assistente.

   O resultado não vai direto para o ar como verdade final: ele entra na
   tabela com origem 'ia', e a tela do admin mostra o que ainda não passou por
   uma pessoa. Tradução de catálogo é texto de venda, e texto de venda merece
   uma lida antes de virar a primeira impressão de alguém. */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const GLOSSARIO =
  "This is a Brazilian data/BI school (DriveData Academy). Keep product and brand names exactly as written: " +
  "Power BI, DAX, SQL, Power Query, Excel, Oracle, Protheus, Snowflake, Fabric, Python, DriveData, Academy. " +
  "Keep the same tone and roughly the same length. Keep line breaks and Markdown as they are. " +
  "Do not add explanations, notes or quotes around the answer.";

/* A cota da Groq é por modelo e por dia. Traduzir o catálogo inteiro passa do
   que um modelo sozinho aguenta, então a lista existe: quando um esgota o
   dia, o trabalho segue no próximo em vez de parar no meio. */
const MODELOS = (process.env.GROQ_MODEL || "openai/gpt-oss-120b,openai/gpt-oss-20b,qwen/qwen3.8-27b")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

const esgotados = new Set<string>();

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* Artigo de blog não cabe numa chamada só. Cortar no meio devolveria meio
   texto, que é pior do que o português inteiro, então o texto longo é
   quebrado em parágrafos e remontado depois. A quebra respeita linha em
   branco para não partir uma frase no meio. */
const LIMITE = 2500;

function pedacos(texto: string): string[] {
  if (texto.length <= LIMITE) return [texto];
  const partes: string[] = [];
  let atual = "";
  for (const paragrafo of texto.split(/\n\n/)) {
    if (atual && atual.length + paragrafo.length > LIMITE) {
      partes.push(atual);
      atual = "";
    }
    atual += (atual ? "\n\n" : "") + paragrafo;
  }
  if (atual) partes.push(atual);
  return partes;
}

export async function traduzirTexto(texto: string, idioma: Idioma): Promise<string | null> {
  const partes = pedacos(texto.trim());
  if (partes.length > 1) {
    const saidas: string[] = [];
    for (const parte of partes) {
      const s = await traduzirPedaco(parte, idioma);
      // Um pedaço que falha estraga o texto inteiro: melhor não gravar nada e
      // deixar o artigo em português.
      if (!s) return null;
      saidas.push(s);
    }
    return saidas.join("\n\n");
  }
  return traduzirPedaco(texto, idioma);
}

async function traduzirPedaco(texto: string, idioma: Idioma): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key || !texto.trim() || idioma === "pt") return null;
  const destino = idioma === "es" ? "Latin American Spanish" : NOME_DO_IDIOMA[idioma];

  for (const model of MODELOS) {
    if (esgotados.has(model)) continue;
    for (let tentativa = 0; tentativa < 4; tentativa++) {
      try {
        const res = await fetch(GROQ_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            temperature: 0.2,
            max_tokens: 4000,
            messages: [
              { role: "system", content: `Translate the user's Brazilian Portuguese text into ${destino}. Reply with the translation only. ${GLOSSARIO}` },
              { role: "user", content: texto },
            ],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const saida = data?.choices?.[0]?.message?.content?.trim();
          return saida || null;
        }
        if (res.status !== 429) return null;
        const corpo = await res.text();
        // Cota do dia não volta esperando: só trocando de modelo.
        if (corpo.includes("per day")) {
          esgotados.add(model);
          break;
        }
        await espera(Math.min(60_000, Number(res.headers.get("retry-after") || 0) * 1000 || 5_000 * (tentativa + 1)));
      } catch {
        return null;
      }
    }
  }
  return null;
}
