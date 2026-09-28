import "server-only";
import { chamarClaude, chamarIA } from "@/lib/ia-provedor";
import { FERRAMENTAS_SUGERIDAS as FERRAMENTAS, LIMITES, ferramentasValidas, limpar } from "@/lib/portfolio";

/* Organizar com IA: o aluno conta o projeto do jeito dele e a IA distribui
   nos campos do formulário.

   Existe porque o campo em branco é onde o portfólio morre. Quem fez o
   trabalho sabe contar a história numa conversa, mas trava diante de
   "Qual problema resolvia" e "O que mudou depois". A IA resolve a forma.

   E só a forma. A regra que manda em tudo aqui: ela NÃO inventa fato.
   Número, prazo, tamanho de equipe, nome de empresa, tudo que o aluno não
   disse vira uma lacuna em forma de pergunta, entre colchetes, como
   "[quanto tempo levava antes?]". Portfólio com "reduziu 80% do tempo" que
   ninguém mediu é o que derruba a pessoa na entrevista, no momento em que
   alguém pergunta como ela chegou nesse número. E a lacuna trava o envio
   para revisão (ver pendenciasDoProjeto), então ela não passa despercebida.

   Nada é gravado aqui. Os campos voltam para a tela, o aluno lê, corrige e
   só então salva. */
export async function organizarRelato(relato: string) {
  const texto = (relato || "").trim().slice(0, 3000);
  if (texto.length < 40) {
    return { ok: false as const, erro: "Conte um pouco mais. Duas ou três frases sobre o que você fez já bastam." };
  }

  const sistema = `Você ajuda um profissional de dados a transformar o relato de um projeto real em um cartão de portfólio.

Devolva APENAS um JSON com estas chaves:
- "titulo": nome do projeto, até 70 caracteres. Concreto, diz o que é. Ex: "Painel de fechamento mensal da distribuidora".
- "resumo": UMA frase corrida, até 160 caracteres, que conte a mudança. Ex: "Troquei 12 planilhas por um painel que abre em 3 segundos." Não escreva os rótulos "Antes:" e "Depois:".
- "problema": 1 a 3 frases. A dor de negócio que o relato descreve, do ponto de vista de quem sofria com ela. Não fale de tecnologia aqui.
- "resultado": 1 a 3 frases. O que mudou para as pessoas depois do projeto, segundo o relato.
- "descricao": 2 a 5 frases. Como foi feito, contando só os passos que o relato descreve.
- "ferramentas": SOMENTE ferramentas cujo nome aparece escrito no relato. Use estes nomes quando couber: ${FERRAMENTAS.join(", ")}.

REGRA MAIS IMPORTANTE: você só reorganiza e melhora a escrita do que o relato diz. Nunca acrescente fato.

Isso vale para número e vale para tudo o mais:
- número, prazo, percentual, tamanho de equipe, volume de dados;
- problema que o relato não citou ("gerava erros", "era difícil de acessar");
- como era feito antes, se o relato não contou ("era estimado manualmente", "não havia base histórica"). Não deduza o "antes" a partir do "depois": quem diz "criei um modelo de previsão" não disse que antes a previsão era manual;
- qualificador que o relato não usou ("em tempo real", "rápido", "automático", "preciso");
- ganho que o relato não afirmou ("facilitou a decisão", "aumentou a produtividade");
- ferramenta, passo técnico ou recurso do painel que o relato não citou.

Quando um fato fizer falta, escreva uma pergunta entre colchetes terminando em "?", no lugar exato onde ele entraria. Exemplos: "[quanto tempo levava antes?]", "[quantas pessoas usam o painel?]", "[o que a diretoria passou a decidir diferente?]".

Se o relato não descreve a dor ou como era antes, o "problema" é uma pergunta entre colchetes, por exemplo "[como a previsão de peças era feita antes deste modelo?]".
Se o relato não diz o que mudou depois do projeto, o "resultado" é feito só de perguntas entre colchetes. Uma lacuna honesta vale mais que uma conquista suposta, porque o aluno vai ter que defender cada frase numa entrevista.

Outras regras:
- Escreva em português do Brasil, primeira pessoa, frases curtas.
- Não use travessão.
- Não use adjetivo vazio: "robusto", "inovador", "eficiente", "poderoso", "completo".
- Nunca escreva o nome da empresa onde a pessoa trabalha ou do cliente dela, nem no título. Troque pelo setor: "uma cervejaria", "uma distribuidora de alimentos", "um banco". Portfólio é público e projeto interno costuma estar sob sigilo.
- Se o relato citar dado pessoal (CPF, salário ou avaliação de pessoa identificada), não repita o dado. Descreva o projeto sem ele e acrescente no fim da "descricao" a frase: "[os dados pessoais foram anonimizados antes de mostrar este projeto?]".`;

  /* Ordem de tentativa.

     Primeiro o Claude, pago e barato: cerca de R$ 0,02 por organização, com
     limite por minuto que aguenta a turma clicando junto numa live. Depois o
     Groq gratuito, em três modelos, porque ali cada modelo tem o próprio balde
     de 8 mil tokens por minuto e um só aguenta duas ou três organizações.

     O Groq continua como reserva de propósito. Se o crédito do Claude acabar
     ou a API cair, a ferramenta segue funcionando, só mais devagar. É a mesma
     decisão da fila de fornecedores em lib/ia-provedor: nenhum fornecedor
     sozinho derruba a plataforma. */
  let texto_ = await chamarClaude({ sistema, usuario: texto, max_tokens: 1200 });
  if (!texto_) {
    const MODELOS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];
    for (const modelo of MODELOS) {
      const r = await chamarIA({
        messages: [
          { role: "system", content: sistema },
          { role: "user", content: texto },
        ],
        json: true,
        temperature: 0.2,
        max_tokens: 1400,
        raciocinio: "low",
        modelo,
        timeoutMs: 30000,
      });
      if (r) { texto_ = r.texto; break; }
    }
  }
  if (!texto_) return { ok: false as const, ocupado: true, erro: "Muita gente usando a IA agora. Tente de novo em um minuto." };

  /* Do primeiro "{" ao último "}". O Claude às vezes abre com uma frase antes
     do JSON, e o Groq às vezes cerca com ```json. Os dois casos saem daqui. */
  let j: any;
  try {
    const ini = texto_.indexOf("{");
    const fim = texto_.lastIndexOf("}");
    j = JSON.parse(texto_.slice(ini, fim + 1));
  } catch {
    return { ok: false as const, erro: "A resposta veio num formato que não consegui ler. Tente de novo." };
  }

  const semTravessao = (t: unknown, max: number) => limpar(String(t ?? "").replace(/\s*[—–]\s*/g, ", "), max);
  const campos = {
    titulo: semTravessao(j.titulo, LIMITES.titulo),
    resumo: semTravessao(j.resumo, LIMITES.resumo),
    problema: semTravessao(j.problema, 600),
    resultado: semTravessao(j.resultado, 600),
    descricao: semTravessao(j.descricao, LIMITES.descricao),
    ferramentas: citadasNoRelato(ferramentasValidas(Array.isArray(j.ferramentas) ? j.ferramentas : []), texto),
  };
  return { ok: true as const, campos, alerta: dadoPessoal(Object.values(campos).flat().join(" ")) };
}

/* Trava de ferramenta, que não depende da IA obedecer.

   Nos testes o modelo acrescentava Power Query e Excel a relatos que não
   citavam nenhum dos dois, por serem vizinhos comuns do Power BI. Ferramenta
   inventada é tão ruim quanto número inventado: o entrevistador pergunta
   justamente dela. Então só fica a que aparece escrita no relato, comparando
   sem espaço, acento ou maiúscula ("power bi", "PowerBI" e "Power BI" batem). */
function citadasNoRelato(sugeridas: string[], relato: string): string[] {
  /* Palavra inteira, nunca pedaço de texto. Comparando pedaço, "IA" casava
     com "diretoria" e "planilhas", e toda ferramenta de duas letras virava
     falso positivo. Aceita também o nome colado ("powerbi"). */
  const palavras = (t: string) =>
    t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
  const fonte = palavras(relato);
  const cita = (f: string) => {
    const alvo = palavras(f);
    if (!alvo.length) return false;
    if (fonte.includes(alvo.join(""))) return true;
    for (let i = 0; i + alvo.length <= fonte.length; i++) {
      if (alvo.every((w, k) => fonte[i + k] === w)) return true;
    }
    return false;
  };

  /* Duas fontes, e o código completa a outra: o que o modelo listou e está
     escrito no relato, mais qualquer ferramenta da lista conhecida que
     aparece no relato e o modelo esqueceu. Num teste ele devolveu a lista
     vazia para um relato que dizia "python" e "power bi". */
  const achadas = [...new Set([...sugeridas.filter(cita), ...FERRAMENTAS.filter(cita)])];

  // "SQL" some quando "SQL Server" também está: é a mesma coisa dita duas vezes.
  const semRepetir = achadas.filter(
    (f) => !achadas.some((outra) => outra !== f && palavras(outra).join(" ").startsWith(palavras(f).join(" ") + " ")),
  );
  return semRepetir.slice(0, LIMITES.ferramentas);
}

/* Trava de dado pessoal, pelo mesmo motivo da trava de ferramenta.

   Nos testes, com um relato que citava CPF e salário de funcionário, o modelo
   repetiu "CPF" em três campos mesmo instruído a não repetir. Reescrever o
   texto no código seria pior que o problema, então aqui não se corrige nada:
   se o termo sobrou, a tela avisa em vermelho e o aluno decide. O time ainda
   lê tudo antes de publicar, mas o aviso chega antes, na hora de escrever. */
const PESSOAL = /\b(cpf|rg|sal[aá]rios?|endere[cç]o residencial|data de nascimento|avalia[cç][aã]o de desempenho)\b/i;

function dadoPessoal(texto: string): string | null {
  const achado = texto.match(PESSOAL)?.[0];
  if (!achado) return null;
  return `O texto cita "${achado}". Portfólio é público: descreva o projeto sem dado pessoal e confirme que os dados foram anonimizados.`;
}
