import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

/* Nome e descrição de cada ferramenta, com o que o admin trocou por cima.

   O padrão mora aqui, uma vez só. O que o admin muda fica em site_settings, na
   chave "ferramentas_nomes", como JSON: { "forja": { "nome": "...", "desc": "..." } }.
   Campo em branco volta ao padrão, então "restaurar" é só apagar o texto.

   A chave é a do cartão na vitrine de ferramentas (/conta/ferramentas). O
   painel de uso usa as chaves de lib/uso.ts, e a única que difere é o universo. */

export type NomeFerramenta = { nome: string; desc: string };

export const NOMES_PADRAO: Record<string, NomeFerramenta> = {
  "raio-x": { nome: "Raio-X do Dashboard", desc: "Analise seu .pbix ou .pbit, explore o mapa das páginas e transforme pontos de atenção em um plano de revisão. Compare versões do mesmo projeto, com leitura local do arquivo." },
  conciliacao: { nome: "O número não bate", desc: "O painel diz uma coisa, o sistema diz outra. Treine a investigação que resolve a cena mais comum da profissão: total, quebra por dimensão, linha." },
  "caixa-preta": { nome: "Caixa-Preta", desc: "Monte um modelo de linguagem no seu navegador e veja como a IA escolhe cada palavra. Token, probabilidade, temperatura e alucinação, ao vivo. Sem API." },
  arena: { nome: "Arena SQL", desc: "Desafios de SQL sobre uma base gerada só para você, com correção na hora. Quando erra, a Arena diz exatamente onde você tropeçou." },
  forja: { nome: "Forja DAX", desc: "Gera a tabela de calendário e as medidas de tempo com o nome das suas tabelas, com ano fiscal e feriados nacionais calculados. É só colar no Power BI." },
  dojo: { nome: "Treino de DAX e Excel", desc: "A mesma base, as mesmas perguntas, duas ferramentas. Você responde com o número e com a fórmula, e a correção confere as duas coisas." },
  biblioteca: { nome: "Biblioteca de referência", desc: "96 padrões de DAX, SQL, Power Query, Oracle e Protheus. Cada um diz quando usar, traz o código para colar e a armadilha em que a maioria cai." },
  "dataflow-lab": { nome: "DataFlow Lab", desc: "Importe CSVs, trate dados e execute SQL. Explore as transformações em 3D, reproduza cada etapa e compare resultados." },
  "decision-lab": { nome: "Decision Lab", desc: "Assuma uma empresa interativa em 3D. Decida preços, estoque e equipe, simule 30 dias e aprenda com os resultados da sua estratégia." },
  "knowledge-universe": { nome: "Knowledge Universe 4D", desc: "Suas atividades viram um mapa de competências em 3D. Comece pelo diagnóstico, abra seu universo e evolua entregando desafios." },
  visuais: { nome: "Ferramenta de Visuais", desc: "Crie cards em HTML e SVG para o Power BI e gere a medida DAX pronta, sem escrever código." },
};

/** Chave do painel de uso (lib/uso.ts) para a chave da vitrine. */
export const CHAVE_DA_VITRINE: Record<string, string> = { universo: "knowledge-universe" };

export const CHAVE_CONFIG = "ferramentas_nomes";
export const LIMITE_NOME = 40;
export const LIMITE_DESC = 220;

export const trocasDoAdmin = cache(async (): Promise<Record<string, Partial<NomeFerramenta>>> => {
  try {
    const { data } = await createAdminClient().from("site_settings").select("value").eq("key", CHAVE_CONFIG).maybeSingle();
    const bruto = JSON.parse(data?.value || "{}");
    return bruto && typeof bruto === "object" ? bruto : {};
  } catch {
    return {};
  }
});

/** Nome e descrição finais de todas as ferramentas, já com as trocas do admin. */
export const nomesDasFerramentas = cache(async (): Promise<Record<string, NomeFerramenta>> => {
  const trocas = await trocasDoAdmin();
  const final: Record<string, NomeFerramenta> = {};
  for (const [chave, padrao] of Object.entries(NOMES_PADRAO)) {
    final[chave] = {
      nome: (trocas[chave]?.nome || "").trim() || padrao.nome,
      desc: (trocas[chave]?.desc || "").trim() || padrao.desc,
    };
  }
  return final;
});

export async function nomeDaFerramenta(chave: string): Promise<string> {
  return (await nomesDasFerramentas())[CHAVE_DA_VITRINE[chave] ?? chave]?.nome ?? chave;
}
