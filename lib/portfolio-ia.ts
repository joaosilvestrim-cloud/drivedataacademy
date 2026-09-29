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

  /* A IA às vezes passa do limite, e cortar no caractere deixava "moeda v" e
     "otimizaram a" no fim. Corta no fim da última frase que cabe; sem frase,
     na última palavra, sem deixar preposição ou vírgula pendurada. */
  const caber = (t: string, max: number) => {
    if (t.length <= max) return t;
    const frase = t.slice(0, max + 1).match(/^[\s\S]*[.!?](?=\s|$)/)?.[0];
    if (frase && frase.length >= max * 0.5) return frase.trim();
    // Resumo é frase: sem ponto que caiba, fecha na última vírgula.
    const virgula = t.slice(0, max).lastIndexOf(",");
    if (max > 100 && virgula >= max * 0.5) return `${t.slice(0, virgula).trim()}.`;
    const palavras = t.slice(0, max + 1).split(/\s+/).slice(0, -1);
    while (palavras.length > 3 && /^(a|o|as|os|e|de|da|do|das|dos|em|na|no|com|para|por|que|um|uma|ao|à|sem|entre)$/i.test(palavras[palavras.length - 1])) palavras.pop();
    return palavras.join(" ").replace(/[,;:\s]+$/, "");
  };
  const semTravessao = (t: unknown, max: number) => limpar(caber(String(t ?? "").replace(/\s*[—–]\s*/g, ", ").trim(), max), max);
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

/* Trajetória a partir do texto do LinkedIn ou do currículo colado.

   Mesma regra do resto: a IA organiza, não acrescenta. E aqui a conferência
   é toda de texto:
   - o cargo tem que estar escrito no que o aluno colou;
   - a organização, se vier, também;
   - o ano de início e o de fim têm que aparecer no texto;
   - a descrição é um trecho literal, não um resumo.
   Experiência que não passa é descartada, e o aluno completa à mão. */
export type ExperienciaLida = { cargo: string; organizacao: string | null; setor: string | null; inicio: string | null; fim: string | null; descricao: string | null };

export async function organizarExperiencias(texto: string): Promise<{ ok: true; itens: ExperienciaLida[] } | { ok: false; erro: string }> {
  const fonte = (texto || "").trim().slice(0, 12000);
  if (fonte.length < 60) return { ok: false, erro: "Cole o trecho de experiências do seu LinkedIn ou currículo." };

  const sistema = `Você lê o texto de experiências profissionais de uma pessoa (LinkedIn ou currículo) e lista cada experiência.

Devolva APENAS um JSON: {"experiencias": [{"cargo": "...", "organizacao": "...", "setor": "...", "inicio": "AAAA-MM", "fim": "AAAA-MM", "descricao": "..."}]}

Regras:
- "cargo": copiado exatamente como está no texto.
- "organizacao": o nome da empresa ou instituição exatamente como está no texto, ou null.
- "setor": o setor de negócio em uma ou duas palavras, só se o texto disser (ex: "logística", "saúde"); senão null.
- "inicio" e "fim": no formato AAAA-MM, só com as datas escritas no texto. Posição atual ("o momento", "atual", "presente") tem "fim": null. Sem data no texto, null.
- "descricao": um TRECHO LITERAL do texto, de até 40 palavras, que resume a experiência. Copie, não reescreva. Sem trecho adequado, null.
- Não invente nada. Uma entrada por experiência, da mais antiga para a mais recente.`;

  let resposta = await chamarClaude({ sistema, usuario: fonte, max_tokens: 3000 });
  if (!resposta) {
    const r = await chamarIA({
      messages: [{ role: "system", content: sistema }, { role: "user", content: fonte }],
      json: true, temperature: 0.1, max_tokens: 3500, raciocinio: "low", modelo: "openai/gpt-oss-120b", timeoutMs: 45000,
    });
    resposta = r?.texto ?? null;
  }
  if (!resposta) return { ok: false, erro: "A IA não respondeu agora. Tente de novo em um minuto." };

  let j: any;
  try {
    j = JSON.parse(resposta.slice(resposta.indexOf("{"), resposta.lastIndexOf("}") + 1));
  } catch {
    return { ok: false, erro: "A resposta veio num formato que não consegui ler. Tente de novo." };
  }

  const n = (t: string) => ` ${(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
  const base = n(fonte);
  const anoNoTexto = (d: unknown) => {
    const m = String(d || "").match(/^(\d{4})-(\d{2})$/);
    return m && fonte.includes(m[1]) ? `${m[1]}-${m[2]}` : null;
  };
  const itens: ExperienciaLida[] = [];
  for (const e of Array.isArray(j?.experiencias) ? j.experiencias : []) {
    const cargo = limpar(String(e?.cargo || ""), 120);
    if (cargo.length < 3 || !base.includes(n(cargo))) continue;
    const org = e?.organizacao ? limpar(String(e.organizacao), 120) : "";
    const setor = e?.setor ? limpar(String(e.setor), 40) : "";
    const desc = e?.descricao ? limpar(String(e.descricao), 400) : "";
    itens.push({
      cargo,
      organizacao: org && base.includes(n(org)) ? org : null,
      setor: setor && base.includes(n(setor)) ? setor : null,
      inicio: anoNoTexto(e?.inicio),
      fim: e?.fim === null ? null : anoNoTexto(e?.fim),
      descricao: desc && base.includes(n(desc)) ? desc : null,
    });
  }
  return { ok: true, itens: itens.slice(0, 20) };
}
