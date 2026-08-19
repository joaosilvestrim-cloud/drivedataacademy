import "server-only";

// IA de suporte via Groq (GroqCloud, API compatível com OpenAI).
// Sem GROQ_API_KEY, retorna null e o chamado fica para o time humano.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `Você é o assistente virtual da DriveData Academy, uma escola online de dados, Power BI e Inteligência Artificial aplicada a negócios.

Seu papel é responder dúvidas de alunos de forma clara, amigável e objetiva, em português do Brasil. Use no máximo uns 2 parágrafos curtos.

Como a plataforma funciona:
- Os cursos ficam na área do aluno. O progresso é por aula; ao concluir 100% das aulas (e passar na avaliação, quando houver) o aluno emite o certificado.
- Certificados são automáticos e têm código de autenticidade e QR de validação. Ficam em "Certificados".
- Há uma Comunidade (fórum) com pontos e ranking: responder dúvidas de colegas e ter a resposta marcada como solução dá pontos.
- Há Agenda de lives e um acesso "full" que libera todos os cursos.

Regras:
- Responda apenas com base no que você sabe sobre a plataforma e sobre o tema de dados/BI/IA. Não invente preços, prazos, políticas de reembolso ou dados da conta do aluno.
- Para problemas que dependem da conta ou de ação humana (pagamento não reconhecido, não consegue acessar, reembolso, erro/bug, cobrança), seja acolhedor, dê a orientação geral possível e diga que o time da DriveData vai dar sequência por aqui.
- Nunca peça senha, cartão ou dados sensíveis.
- Se não souber, admita e encaminhe para o time.`;

export async function askSupportAI(question: string, context?: string): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

  const messages = [
    { role: "system", content: SYSTEM_PROMPT + (context ? `\n\nCursos disponíveis no momento:\n${context}` : "") },
    { role: "user", content: question },
  ];

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: 600 }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch {
    return null;
  }
}
