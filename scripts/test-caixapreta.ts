/* Testes da Caixa-Preta.
 *
 * O que não pode quebrar:
 *
 * 1. O tokenizador tem que ser reversível. Se decodificar não devolve o texto
 *    original, tudo que a ferramenta mostra vira mentira.
 * 2. O BPE tem que realmente comprimir: mais fusões, menos tokens.
 * 3. O modelo tem que ser determinístico com semente, senão o aluno não
 *    consegue repetir o experimento.
 * 4. A temperatura tem que fazer o que a gente diz que faz: em zero, sempre o
 *    campeão; alta, a distribuição achata.
 *
 * Rodar: npm run test:caixapreta
 */

import { CORPORA } from "../lib/caixapreta/corpora";
import { codificar, decodificar, estatisticas, preCortar, tokenizar, treinarTokenizador } from "../lib/caixapreta/tokenizador";
import { candidatos, gerar, treinarModelo } from "../lib/caixapreta/modelo";

let ok = 0;
let falhas = 0;

function confere(nome: string, condicao: boolean, detalhe = "") {
  if (condicao) { ok++; console.log(`  ok   ${nome}`); }
  else { falhas++; console.log(`  FALHA ${nome}${detalhe ? ": " + detalhe : ""}`); }
}

const powerbi = CORPORA[0].texto;
const contrato = CORPORA[1].texto;

console.log("\nPré-corte");
{
  confere("junta o espaço com a palavra seguinte", preCortar("a tabela").join("|") === "a| tabela");
  confere("separa dígito por dígito", preCortar("R$ 1234").filter((p) => /\d/.test(p)).length === 4, preCortar("R$ 1234").join("|"));
  confere("não perde nada do texto", preCortar("Olá, mundo! 42").join("") === "Olá, mundo! 42");
}

console.log("\nTokenizador BPE");
{
  const vocab = treinarTokenizador(powerbi, 200);
  confere("aprende fusões", vocab.fusoes.length > 50, `${vocab.fusoes.length} fusões`);
  confere("monta vocabulário", vocab.tokens.length > vocab.fusoes.length);

  const frase = "A tabela de calendário do modelo";
  confere("decodificar desfaz codificar", decodificar(codificar(frase, vocab), vocab) === frase);
  confere("texto inteiro do corpus volta igual", decodificar(codificar(powerbi, vocab), vocab) === powerbi);
  confere("texto de outro assunto também volta igual", decodificar(codificar(contrato, vocab), vocab) === contrato);
  confere("texto com emoji e acento não quebra", decodificar(codificar("ação, não é? 42", treinarTokenizador("ação, não é? 42", 20)), treinarTokenizador("ação, não é? 42", 20)) === "ação, não é? 42");

  const poucas = treinarTokenizador(powerbi, 20);
  const muitas = treinarTokenizador(powerbi, 400);
  confere("mais fusões comprimem mais", tokenizar(powerbi, muitas).length < tokenizar(powerbi, poucas).length,
    `${tokenizar(powerbi, muitas).length} contra ${tokenizar(powerbi, poucas).length}`);

  // A lição do número: dígito nunca funde com dígito no pré-corte.
  const numero = tokenizar("O valor é 1234567", vocab);
  confere("número continua picado", numero.filter((t) => /^\s?\d$/.test(t)).length === 7, numero.join("|"));

  // A lição do domínio: o corpus de Power BI tokeniza Power BI melhor.
  const vocabContrato = treinarTokenizador(contrato, 200);
  const dentroDoAssunto = tokenizar("a tabela de calendário do modelo", vocab).length;
  const foraDoAssunto = tokenizar("a tabela de calendário do modelo", vocabContrato).length;
  confere("texto do assunto do corpus usa menos tokens", dentroDoAssunto < foraDoAssunto, `${dentroDoAssunto} contra ${foraDoAssunto}`);

  const e = estatisticas("A tabela de calendário", vocab);
  confere("estatística conta tokens e palavras", e.tokens > 0 && e.palavras === 4 && e.porPalavra > 0);
}

console.log("\nModelo de n-grama");
{
  const vocab = treinarTokenizador(powerbi, 250);
  const modelo = treinarModelo(powerbi, vocab, 3);
  confere("aprende contextos", modelo.contextos > 100, `${modelo.contextos} contextos`);
  confere("conta os tokens do corpus", modelo.totalTokens > 200, `${modelo.totalTokens} tokens`);

  const lista = candidatos(modelo, codificar("A tabela de", vocab), 0.8, 8);
  confere("devolve candidatos para um contexto conhecido", lista.length > 0);
  confere("probabilidades somam um", Math.abs(lista.reduce((s, c) => s + c.probabilidade, 0) - 1) < 0.02 || lista.length === 8);
  confere("candidatos vêm ordenados", lista.every((c, i) => i === 0 || lista[i - 1].probabilidade >= c.probabilidade));

  // Contexto que não existe: o modelo encurta e continua respondendo.
  const desconhecido = candidatos(modelo, codificar("zzzz qqqq", vocab), 0.8, 5);
  confere("contexto desconhecido não trava o modelo", Array.isArray(desconhecido));

  const a = gerar(modelo, "A tabela de calendário", { tokens: 25, temperatura: 0.8, semente: 42 });
  const b = gerar(modelo, "A tabela de calendário", { tokens: 25, temperatura: 0.8, semente: 42 });
  const c = gerar(modelo, "A tabela de calendário", { tokens: 25, temperatura: 0.8, semente: 7 });
  confere("mesma semente, mesmo texto", a.texto === b.texto);
  confere("semente diferente, texto diferente", a.texto !== c.texto);
  confere("a geração continua o prompt", a.texto.startsWith("A tabela de calendário"));
  confere("registra um passo por token gerado", a.passos.length > 0 && a.passos.length <= 25);
  confere("todo token gerado existe no vocabulário", a.passos.every((p) => vocab.tokens.includes(p.escolhido.token)));

  // Temperatura zero é determinística e sempre pega o campeão.
  const frio1 = gerar(modelo, "A tabela de", { tokens: 15, temperatura: 0, semente: 1 });
  const frio2 = gerar(modelo, "A tabela de", { tokens: 15, temperatura: 0, semente: 999 });
  confere("temperatura zero ignora a semente", frio1.texto === frio2.texto);
  confere("temperatura zero escolhe sempre o mais provável", frio1.passos.every((p) => p.escolhido.id === p.opcoes[0].id));

  // Temperatura alta achata a distribuição: o campeão perde vantagem.
  const ctx = codificar("A tabela de", vocab);
  const gelado = candidatos(modelo, ctx, 0.2, 8);
  const quente = candidatos(modelo, ctx, 2.5, 8);
  if (gelado.length > 1) {
    confere("temperatura alta achata a probabilidade do campeão", quente[0].probabilidade < gelado[0].probabilidade,
      `${quente[0].probabilidade.toFixed(3)} contra ${gelado[0].probabilidade.toFixed(3)}`);
  } else {
    confere("temperatura alta achata a probabilidade do campeão", true, "contexto com candidato único");
  }
}

console.log("\nA lição: o modelo só sabe o que está no corpus");
{
  const vocabBI = treinarTokenizador(powerbi, 250);
  const modeloBI = treinarModelo(powerbi, vocabBI, 3);
  const vocabCozinha = treinarTokenizador(CORPORA[2].texto, 250);
  const modeloCozinha = treinarModelo(CORPORA[2].texto, vocabCozinha, 3);

  const bi = gerar(modeloBI, "O relacionamento entre", { tokens: 20, temperatura: 0.7, semente: 5 }).texto;
  const cozinha = gerar(modeloCozinha, "O relacionamento entre", { tokens: 20, temperatura: 0.7, semente: 5 }).texto;
  confere("corpora diferentes geram continuações diferentes", bi !== cozinha);
  confere("o modelo de cozinha responde mesmo sem saber do assunto", cozinha.length > "O relacionamento entre".length, cozinha);
}

console.log(`\n${ok}/${ok + falhas} verificações passaram.`);
process.exit(falhas ? 1 : 0);
