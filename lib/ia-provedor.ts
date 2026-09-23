import "server-only";

/* Camada de fornecedor de IA.

   O modelo que a Academy usa, o gpt-oss-120b, é de peso aberto. Ele não
   pertence ao Groq: o Groq apenas serve ele. Together, Fireworks, DeepInfra,
   Cerebras e uma GPU própria servem exatamente os mesmos pesos, pela mesma API
   no formato da OpenAI.

   Isso é o que torna o fornecedor descartável, e é o motivo deste arquivo
   existir. Antes, a URL do Groq era constante no código e a chave tinha nome de
   fornecedor. Trocar de provedor era mexer em código e publicar. Agora é
   variável de ambiente, e o prompt não muda, porque o modelo é o mesmo.

   A ordem de leitura preserva o que já está em produção:

     1. IA_BASE_URL / IA_API_KEY / IA_MODEL, se existirem;
     2. GROQ_API_KEY / GROQ_MODEL, que é o que está na Vercel hoje.

   Sem configurar nada novo, o comportamento é idêntico ao de antes.

   A reserva (IA_BACKUP_*) nasce vazia e não custa nada: ela só é chamada
   quando o primeiro fornecedor falha de um jeito que outro resolveria. */

export type Provedor = { nome: string; url: string; chave: string; modelo: string };

export const MODELO_PADRAO = "openai/gpt-oss-120b";
const GROQ_BASE = "https://api.groq.com/openai/v1";

/* Aceita tanto a base ("https://api.groq.com/openai/v1") quanto o caminho
   completo. Errar isso é a forma mais fácil de configurar um provedor novo e
   receber 404 sem entender por quê. */
export function completarUrl(base: string): string {
  const limpa = (base || "").trim().replace(/\/+$/, "");
  if (!limpa) return "";
  return /\/chat\/completions$/.test(limpa) ? limpa : `${limpa}/chat/completions`;
}

function apelido(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host.split(".").slice(-2).join(".");
  } catch {
    return "fornecedor";
  }
}

function montar(base: string | undefined, chave: string | undefined, modelo: string | undefined, modeloPedido?: string): Provedor | null {
  const url = completarUrl(base || "");
  if (!url || !chave) return null;
  return { nome: apelido(url), url, chave, modelo: modeloPedido || modelo || MODELO_PADRAO };
}

/* A lista de fornecedores, na ordem em que serão tentados. Vazia significa que
   ninguém configurou IA nenhuma, e quem chama devolve null, como sempre fez. */
export function provedores(modeloPedido?: string): Provedor[] {
  const lista = [
    montar(process.env.IA_BASE_URL, process.env.IA_API_KEY, process.env.IA_MODEL, modeloPedido),
    montar(GROQ_BASE, process.env.GROQ_API_KEY, process.env.GROQ_MODEL, modeloPedido),
    montar(process.env.IA_BACKUP_BASE_URL, process.env.IA_BACKUP_API_KEY, process.env.IA_BACKUP_MODEL, modeloPedido),
  ].filter((p): p is Provedor => p !== null);

  // Duas variáveis apontando para o mesmo lugar não são dois fornecedores.
  const vistos = new Set<string>();
  return lista.filter((p) => {
    const id = `${p.url}|${p.modelo}`;
    if (vistos.has(id)) return false;
    vistos.add(id);
    return true;
  });
}

/* Vale a pena tentar o próximo fornecedor?

   Só quando a falha é do fornecedor, não do pedido. Um 400 por corpo malformado
   vai falhar igual em todo mundo, e insistir seria gastar chamada à toa. Já
   chave inválida, modelo ausente, limite estourado e erro de servidor são
   exatamente o caso que a reserva existe para cobrir. */
function vaiAdiante(status: number): boolean {
  return status === 401 || status === 403 || status === 404 || status === 408 || status === 429 || status >= 500;
}

export type PedidoIA = {
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
  json?: boolean;
  modelo?: string;
  /* Teto por chamada. O assistente responde dentro de uma requisição do aluno,
     então esperar um fornecedor pendurado é pior que cair para o próximo. */
  timeoutMs?: number;
};

export type RespostaIA = { texto: string; provedor: string; modelo: string };

/* Uma chamada de chat, tentando os fornecedores em ordem.

   Devolve null quando ninguém respondeu, que é o contrato que os chamadores já
   esperavam: sem IA, o chamado vai para o time humano. */
export async function chamarIA(pedido: PedidoIA): Promise<RespostaIA | null> {
  const lista = provedores(pedido.modelo);
  if (!lista.length) return null;

  const corpoBase: Record<string, unknown> = {
    messages: pedido.messages,
    temperature: pedido.temperature ?? 0.3,
    max_tokens: pedido.max_tokens ?? 600,
  };
  if (pedido.json) corpoBase.response_format = { type: "json_object" };

  for (const p of lista) {
    const controle = new AbortController();
    const relogio = setTimeout(() => controle.abort(), pedido.timeoutMs ?? 30000);
    try {
      const res = await fetch(p.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${p.chave}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...corpoBase, model: p.modelo }),
        signal: controle.signal,
        cache: "no-store",
      });

      if (!res.ok) {
        if (vaiAdiante(res.status)) {
          console.warn(`[ia] ${p.nome} respondeu ${res.status}, tentando o próximo`);
          continue;
        }
        console.warn(`[ia] ${p.nome} respondeu ${res.status}, sem sentido tentar outro`);
        return null;
      }

      const data = await res.json();
      const escolha = data?.choices?.[0];
      const texto = escolha?.message?.content?.trim();
      if (texto) return { texto, provedor: p.nome, modelo: p.modelo };

      /* Vazio por teto de tokens não é fornecedor quebrado.

         Modelo com raciocínio gasta o orçamento pensando antes de escrever, e
         com max_tokens curto devolve conteúdo vazio e finish_reason "length".
         O próximo fornecedor faria exatamente o mesmo, então insistir só
         gastaria chamada. Aumentar o teto é que resolve. */
      if (escolha?.finish_reason === "length") {
        console.warn(`[ia] ${p.nome} truncou a resposta no teto de tokens`);
        return null;
      }
      console.warn(`[ia] ${p.nome} devolveu resposta vazia, tentando o próximo`);
      continue;
    } catch (e) {
      // Rede caiu, DNS falhou ou estourou o tempo. É exatamente o caso da reserva.
      console.warn(`[ia] ${p.nome} não respondeu: ${(e as Error)?.name || "erro"}`);
      continue;
    } finally {
      clearTimeout(relogio);
    }
  }

  return null;
}
