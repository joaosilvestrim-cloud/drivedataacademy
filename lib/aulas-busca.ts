import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/* Acha onde um assunto é explicado nas aulas.

   É o que separa um assistente que sabe o CATÁLOGO de um que sabe o
   CONTEÚDO. Antes, "onde ele fala de Snowpipe" virava encaminhamento para o
   time: a resposta existia, estava gravada, e ninguém achava.

   A busca é textual em português, dentro do próprio Postgres. Não é preguiça
   de não usar vetor: a pergunta aqui quase sempre carrega um termo técnico
   exato, e nesse caso o índice textual acerta mais, responde em milissegundos
   e não custa chamada de API nenhuma. */

export type Trecho = {
  lesson_id: string;
  aula: string;
  modulo: string;
  curso: string;
  curso_slug: string;
  inicio: number;
  texto: string | null;
  liberado: boolean;
  peso: number;
  cobertura: number;
};

const mmss = (s: number) => {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
};

/* Nem toda mensagem merece uma busca.

   "oi", "obrigado" e "não consigo pagar" não têm nada a ver com conteúdo de
   aula, e procurar assim mesmo só gasta tempo e enche o contexto de ruído que
   piora a resposta. O corte é grosseiro de propósito: na dúvida, busca. */
const SEM_BUSCA = /^(oi|ol[áa]|bom dia|boa tarde|boa noite|obrigad[oa]|valeu|tchau|ok|certo|sim|n[ãa]o)\b/i;

export function vaiProcurar(pergunta: string): boolean {
  const p = (pergunta || "").trim();
  if (p.length < 8) return false;
  if (SEM_BUSCA.test(p)) return false;
  return true;
}

export async function trechosRelevantes(
  admin: SupabaseClient,
  pergunta: string,
  cursosLiberados: string[],
  limite = 6,
): Promise<Trecho[]> {
  if (!vaiProcurar(pergunta)) return [];
  const { data, error } = await admin.rpc("buscar_trechos", {
    termo: pergunta.slice(0, 300),
    cursos_liberados: cursosLiberados,
    limite,
  });
  if (error || !Array.isArray(data)) return [];

  /* Quando nada casa de verdade, calar é melhor que devolver o que sobrou.

     Mandar o aluno assistir 45 minutos da aula errada é pior do que dizer
     que não sei.

     Quem decide isso é a COBERTURA, não a nota. Tentei pela nota em quatro
     versões e não dá: ela depende do tamanho da pergunta e da raridade das
     palavras, então "onde ele fala de snowpipe" e "arquitetura medalhão
     bronze prata ouro" tiravam 0.51 e 0.50, indistinguíveis, embora só a
     primeira tenha resposta no material.

     Cobertura é a fração das palavras da pergunta presentes no mesmo trecho,
     e aí a separação é limpa: 100% contra 25%.

     A nota volta a ter voz num caso só: quando ela é muito alta, o texto
     casou forte de verdade e vale responder mesmo com cobertura parcial. É o
     que segura "warehouse tamanho e custo", onde o melhor trecho fala de
     dimensionamento sem repetir as três palavras. */
  const achados = (data as Trecho[]).filter((t) => t.peso > 0);
  if (!achados.length) return [];
  return achados.filter((t) => t.cobertura >= 0.6 || t.peso >= 1);
}

/* Monta o bloco que entra no contexto do modelo.

   Duas listas separadas, e a separação é o ponto. O que o aluno já tem vem
   com o texto e ele pode ser citado. O que ele não comprou vem só como
   ponteiro: o assistente diz que o assunto é coberto e em qual treinamento,
   sem entregar de graça a aula que alguém pagou.

   Sem isso o assistente viraria, sem querer, o maior vazamento de conteúdo
   pago da plataforma. */
export function blocoDeTrechos(trechos: Trecho[]): string {
  if (!trechos.length) return "";

  const meus = trechos.filter((t) => t.liberado && t.texto);
  const outros = trechos.filter((t) => !t.liberado);

  const partes: string[] = [];

  if (meus.length) {
    partes.push(
      "=== TRECHOS DAS AULAS QUE ESTE ALUNO JÁ TEM ===",
      "Use para responder e SEMPRE diga em que aula e em que minuto está, para a pessoa ir direto ao ponto.",
      ...meus.map(
        (t) => `[${t.curso} · ${t.modulo} · ${t.aula} · ${mmss(t.inicio)}] ${t.texto}`,
      ),
    );
  }

  if (outros.length) {
    const vistos = new Set<string>();
    const linhas: string[] = [];
    for (const t of outros) {
      const chave = `${t.curso}|${t.aula}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      linhas.push(`- "${t.aula}", no treinamento ${t.curso}`);
    }
    partes.push(
      "",
      "=== ASSUNTO COBERTO EM TREINAMENTO QUE ESTE ALUNO NÃO TEM ===",
      "Diga que o assunto é tratado e em qual treinamento, e que ele pode ver em Cursos. NÃO explique o conteúdo dessas aulas e NÃO invente o que elas dizem.",
      ...linhas,
    );
  }

  return partes.join("\n");
}
