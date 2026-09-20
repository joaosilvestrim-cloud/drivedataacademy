/* O que o mascote fala nos balões, quando o aluno não pediu nada.

   Três tipos, intercalados: dica da plataforma (sempre com o link para onde ela
   leva), piada de tech e o convite para conversar. A dica ensina a usar o que já
   existe e o aluno não achou; a piada dá motivo para olhar o balão da próxima
   vez. Sem uma, o balão vira propaganda. Sem a outra, vira ruído.

   Regra das piadas: curtas, de quem trabalha com dados, sem ninguém como alvo. */

export type Balao =
  | { tipo: "dica"; titulo: string; texto: string; href: string; acao: string; so?: string }
  | { tipo: "piada"; texto: string; final?: string }
  | { tipo: "ajuda" };

export const DICAS: Extract<Balao, { tipo: "dica" }>[] = [
  { tipo: "dica", titulo: "Seu .pbix tem nota", texto: "Suba o relatório no Raio-X e receba a revisão de um consultor. O arquivo não sai do seu computador.", href: "/conta/ferramentas/raio-x", acao: "Abrir o Raio-X" },
  { tipo: "dica", titulo: "Calendário pronto em 1 minuto", texto: "A Forja DAX gera a tabela de datas com ano fiscal e feriados, já com o nome das suas tabelas.", href: "/conta/ferramentas/forja", acao: "Forjar calendário" },
  { tipo: "dica", titulo: "Treine SQL sem medo", texto: "Na Arena SQL a base é gerada só para você, e quando você erra eu digo exatamente onde.", href: "/conta/ferramentas/arena", acao: "Entrar na Arena" },
  { tipo: "dica", titulo: "O número não bate?", texto: "Tem uma ferramenta inteira para treinar a cena mais comum da profissão: achar por que o painel diverge.", href: "/conta/ferramentas/conciliacao", acao: "Pegar um chamado" },
  { tipo: "dica", titulo: "Esqueceu a sintaxe?", texto: "A Biblioteca tem 96 padrões de DAX, SQL, Power Query, Oracle e Protheus, cada um com a armadilha que o pessoal cai. Aperte / para buscar.", href: "/conta/ferramentas/biblioteca", acao: "Abrir a Biblioteca" },
  { tipo: "dica", titulo: "Treine a fórmula, não só a teoria", texto: "No treino de DAX e Excel você responde com o número e com a fórmula, sobre uma base que é só sua. A correção mostra o atalho que quebra depois.", href: "/conta/ferramentas/dojo", acao: "Começar o treino" },
  { tipo: "dica", titulo: "Como a IA escolhe cada palavra", texto: "Na Caixa-Preta você monta um modelo de linguagem no navegador e vê a probabilidade de cada token.", href: "/conta/ferramentas/caixa-preta", acao: "Abrir a caixa" },
  { tipo: "dica", titulo: "Perdeu a live?", texto: "Toda gravação fica em Gravações, para assistir quando der. Está incluído na assinatura.", href: "/conta/gravacoes", acao: "Ver gravações" },
  { tipo: "dica", titulo: "Próximo encontro", texto: "A agenda tem as lives e mentorias dos próximos meses. Algumas emitem certificado de participação.", href: "/conta/agenda", acao: "Abrir a agenda" },
  { tipo: "dica", titulo: "Responder também pontua", texto: "Ajudar um colega na comunidade soma pontos. Resposta marcada como solução vale mais.", href: "/conta/comunidade", acao: "Ir para a comunidade" },
  { tipo: "dica", titulo: "Seu perfil é vitrine", texto: "Na Vitrine, empresas e colegas veem seu perfil. Foto e LinkedIn preenchidos fazem diferença.", href: "/conta/perfil", acao: "Completar perfil" },
  { tipo: "dica", titulo: "Seu mapa de competências", texto: "O Knowledge Universe desenha em 3D o que você já domina, a partir do que você fez aqui.", href: "/conta/universo", acao: "Ver meu universo" },
  { tipo: "dica", titulo: "Certificado na mão", texto: "Terminou um curso? O certificado aparece na hora, com código para qualquer um validar.", href: "/conta/certificados", acao: "Meus certificados" },
  { tipo: "dica", titulo: "Tem ideia pra Academy?", texto: "Sugestões vão direto para o time, e as mais votadas entram no roadmap.", href: "/conta/sugestoes", acao: "Mandar sugestão" },
  // Contextuais: só aparecem na tela onde fazem sentido.
  { tipo: "dica", titulo: "Atalho da Biblioteca", texto: "Use as setas para andar na lista e o botão Copiar para levar o código direto para o Power BI.", href: "/conta/ferramentas/biblioteca", acao: "Entendi", so: "/conta/ferramentas/biblioteca" },
  { tipo: "dica", titulo: "Dica de ranking", texto: "Mensagem conta ponto até 5 por dia. Depois disso, o que sobe é ajudar: reação e solução.", href: "/conta/ranking", acao: "Ver ranking", so: "/conta/comunidade" },
];

export const PIADAS: Extract<Balao, { tipo: "piada" }>[] = [
  { tipo: "piada", texto: "Por que o analista terminou com a planilha?", final: "Ela tinha células demais mescladas." },
  { tipo: "piada", texto: "Eu não tenho medo de nada.", final: "Só de CALCULATE sem REMOVEFILTERS." },
  { tipo: "piada", texto: "SELECT * FROM geladeira WHERE fome = 1;", final: "0 linhas retornadas. Clássico." },
  { tipo: "piada", texto: "Qual o prato preferido do engenheiro de dados?", final: "Pipeline ao molho de ETL." },
  { tipo: "piada", texto: "Meu relacionamento é igual modelo estrela:", final: "um centro de atenção e várias dimensões." },
  { tipo: "piada", texto: "O dashboard ficou pronto em 5 minutos.", final: "Os 3 dias seguintes foram o alinhamento de cor." },
  { tipo: "piada", texto: "Toc toc. Quem é? NULL.", final: "NULL quem? Exatamente." },
  { tipo: "piada", texto: "Dado bom é igual café:", final: "tratado na hora e servido sem duplicata." },
  { tipo: "piada", texto: "Por que o DAX foi ao terapeuta?", final: "Problema de contexto. Sempre é contexto." },
  { tipo: "piada", texto: "Existem 10 tipos de pessoas:", final: "as que entendem binário e as que não entendem." },
  { tipo: "piada", texto: "O Excel travou.", final: "Ele também precisava de um tempo pra processar tudo isso." },
  { tipo: "piada", texto: "Eu ia fazer uma piada de UDP,", final: "mas não sei se você ia receber." },
  { tipo: "piada", texto: "Funcionou na minha máquina.", final: "Então vamos mandar sua máquina pro cliente." },
  { tipo: "piada", texto: "Por que o Power Query é calmo?", final: "Ele sempre aplica uma etapa de cada vez." },
  { tipo: "piada", texto: "Meu humor é igual gráfico de pizza:", final: "ninguém entende quando tem mais de 5 fatias." },
];

/** Monta a fila da sessão: ajuda, dica, piada, dica, piada... sem repetir. */
export function montarFila(pathname: string, semente: number): Balao[] {
  const embaralha = <T,>(lista: T[]) => {
    const a = [...lista];
    let s = semente || 1;
    for (let i = a.length - 1; i > 0; i--) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const j = s % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const contextuais = DICAS.filter((d) => d.so && pathname.startsWith(d.so));
  const gerais = embaralha(DICAS.filter((d) => !d.so && !pathname.startsWith(d.href)));
  const dicas = [...contextuais, ...gerais];
  const piadas = embaralha(PIADAS);
  const fila: Balao[] = [{ tipo: "ajuda" }];
  const n = Math.max(dicas.length, piadas.length);
  for (let i = 0; i < n; i++) {
    if (dicas[i]) fila.push(dicas[i]);
    if (piadas[i]) fila.push(piadas[i]);
  }
  return fila;
}
