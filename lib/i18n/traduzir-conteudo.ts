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

export async function traduzirTexto(texto: string, idioma: Idioma): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key || !texto.trim() || idioma === "pt") return null;
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  const destino = idioma === "es" ? "Latin American Spanish" : NOME_DO_IDIOMA[idioma];

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 2000,
        messages: [
          { role: "system", content: `Translate the user's Brazilian Portuguese text into ${destino}. Reply with the translation only. ${GLOSSARIO}` },
          { role: "user", content: texto.slice(0, 6000) },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const saida = data?.choices?.[0]?.message?.content?.trim();
    return saida || null;
  } catch {
    return null;
  }
}
