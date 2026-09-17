"use client";

import { useEffect, useMemo, useState } from "react";
import { CORPORA, COMECOS } from "@/lib/caixapreta/corpora";
import { codificar, estatisticas, textoDoToken, treinarTokenizador } from "@/lib/caixapreta/tokenizador";
import { candidatos, escolher, origemDaResposta, sorteador, treinarModelo, type Candidato } from "@/lib/caixapreta/modelo";
import TourCaixaPreta, { tourCaixaPretaJaVisto } from "@/components/caixapreta/TourCaixaPreta";

/* A Caixa-Preta roda inteira no navegador.

   Não existe chamada de API, não existe chave, não existe custo por uso. O
   tokenizador é treinado na hora, o modelo é treinado na hora, e a geração
   acontece token a token na frente do aluno, com a lista de candidatos e a
   probabilidade de cada um à vista.

   É pequeno perto de um GPT, e é de propósito: modelo grande convence e esconde
   o mecanismo. Aqui o mecanismo é o produto. */

const CORES = ["#34e8a0", "#3b9dff", "#a78bfa", "#fbbf24", "#2ee6d6", "#f6d68c", "#f0abfc"];

const campo =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60";
const rotulo = "block text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400";

/** Espaço vira ponto médio para o aluno ver que o espaço faz parte do token. */
const visivel = (t: string) => t.replace(/ /g, "·").replace(/\n/g, "↵");

/* Token que corta uma letra acentuada no meio não tem texto para mostrar: ele é
   meio caractere. Em vez de esconder, a ficha assume isso e vira aula, porque é
   literalmente o que acontece dentro dos modelos grandes. */
const METADE = "�";

function Ficha({ token, indice }: { token: string; indice: number }) {
  const texto = textoDoToken(token);
  const parcial = texto.includes(METADE);
  const cor = CORES[indice % CORES.length];
  return (
    <span
      title={parcial ? "Pedaço de uma letra acentuada: o modelo trabalha em bytes, não em letras" : `token ${indice + 1}`}
      className="rounded border px-1.5 py-0.5 font-mono text-[0.8rem]"
      style={
        parcial
          ? { borderColor: "#f59e0b55", backgroundColor: "#f59e0b18", color: "#fbbf24" }
          : { borderColor: `${cor}55`, backgroundColor: `${cor}18`, color: cor }
      }
    >
      {parcial ? "½ letra" : visivel(texto) || "·"}
    </span>
  );
}

function Fichas({ tokens }: { tokens: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {tokens.map((t, i) => <Ficha key={i} token={t} indice={i} />)}
    </div>
  );
}

function Numero({ valor, rotulo: r, tom }: { valor: string | number; rotulo: string; tom?: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3">
      <p className="text-[0.65rem] uppercase tracking-wider text-slate-500">{r}</p>
      <p className={`mt-0.5 font-display text-xl font-bold tabular-nums ${tom || "text-white"}`}>{valor}</p>
    </div>
  );
}

export default function CaixaPreta() {
  const [estacao, setEstacao] = useState<"tokenizar" | "gerar">("tokenizar");
  const [corpusId, setCorpusId] = useState(CORPORA[0].id);
  const [fusoes, setFusoes] = useState(250);
  const [texto, setTexto] = useState("A tabela de calendário do modelo. O CPF 12345678909 não é um número para a IA.");

  const [ordem, setOrdem] = useState(3);
  const [prompt, setPrompt] = useState(COMECOS[0]);
  const [temperatura, setTemperatura] = useState(0.8);
  const [semente, setSemente] = useState(42);
  const [gerados, setGerados] = useState<number[]>([]);

  const [tour, setTour] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => { if (!tourCaixaPretaJaVisto()) setTour(true); }, 700);
    return () => clearTimeout(t);
  }, []);

  const corpus = CORPORA.find((c) => c.id === corpusId) ?? CORPORA[0];
  const vocab = useMemo(() => treinarTokenizador(corpus.texto, fusoes), [corpus, fusoes]);
  const modelo = useMemo(() => treinarModelo(corpus.texto, vocab, ordem), [corpus, vocab, ordem]);

  const stats = useMemo(() => estatisticas(texto, vocab), [texto, vocab]);

  /* O vocabulário do outro corpus é caro de treinar e não depende do texto.
     Antes ele era refeito a cada tecla digitada, o que dava uns 60 ms de
     travada por caractere. Agora treina uma vez por corpus e por número de
     fusões, e digitar volta a ser instantâneo. */
  const outroCorpus = useMemo(() => CORPORA.find((c) => c.id !== corpusId) ?? CORPORA[1], [corpusId]);
  const vocabDoOutro = useMemo(() => treinarTokenizador(outroCorpus.texto, fusoes), [outroCorpus, fusoes]);
  const comparacao = useMemo(
    () => ({ nome: outroCorpus.nome, tokens: estatisticas(texto, vocabDoOutro).tokens }),
    [texto, outroCorpus, vocabDoOutro]
  );

  // Estado da geração: os ids do prompt mais o que já foi sorteado.
  const idsPrompt = useMemo(() => codificar(prompt, vocab), [prompt, vocab]);
  const ids = useMemo(() => [...idsPrompt, ...gerados], [idsPrompt, gerados]);
  const proximos = useMemo(() => candidatos(modelo, ids, temperatura, 8), [modelo, ids, temperatura]);
  const origem = useMemo(() => origemDaResposta(modelo, ids), [modelo, ids]);
  const textoGerado = useMemo(() => gerados.map((i) => textoDoToken(vocab.tokens[i] ?? "")).join(""), [gerados, vocab]);

  useEffect(() => { setGerados([]); }, [prompt, corpusId, ordem, fusoes]);

  function passo(quantos: number) {
    const sorteio = sorteador(semente + gerados.length * 31);
    const novos = [...gerados];
    for (let i = 0; i < quantos; i++) {
      const lista = candidatos(modelo, [...idsPrompt, ...novos], temperatura, 8);
      const escolhido: Candidato | null = escolher(lista, sorteio, temperatura);
      if (!escolhido) break;
      novos.push(escolhido.id);
    }
    setGerados(novos);
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div data-tour="cp-estacoes" className="flex flex-wrap gap-2">
          {[
            { id: "tokenizar", nome: "1 · Tokenizar" },
            { id: "gerar", nome: "2 · Treinar e gerar" },
          ].map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setEstacao(e.id as typeof estacao)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                estacao === e.id ? "border-brand-green/50 bg-brand-green/[0.10] text-white" : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-white"
              }`}
            >
              {e.nome}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setTour(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-brand-green/50 hover:text-brand-green"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          Tour guiado
        </button>
      </div>

      {/* Corpus, comum às duas estações */}
      <div data-tour="cp-corpus" className="mt-4 rounded-3xl border border-white/8 bg-white/[0.02] p-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
          <label>
            <span className={rotulo}>Corpus de treino</span>
            <select className={`${campo} mt-1 [&>option]:bg-ink-900`} value={corpusId} onChange={(e) => setCorpusId(e.target.value)}>
              {CORPORA.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <span className="mt-1 block text-[0.7rem] text-slate-500">{corpus.assunto} · {corpus.texto.length.toLocaleString("pt-BR")} caracteres</span>
          </label>
          <label>
            <span className={rotulo}>Fusões do tokenizador: {fusoes}</span>
            <input type="range" min={10} max={500} step={10} value={fusoes} onChange={(e) => setFusoes(Number(e.target.value))} className="mt-3 w-full accent-[#34e8a0]" />
            <span className="mt-1 block text-[0.7rem] text-slate-500">Cada fusão junta o par de pedaços mais comum. Menos fusões, tokens menores.</span>
          </label>
        </div>
      </div>

      {estacao === "tokenizar" ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_18rem] lg:items-start">
          <div>
            <div data-tour="cp-texto" className="rounded-3xl border border-white/8 bg-white/[0.02] p-5">
              <span className={rotulo}>Seu texto</span>
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={4}
                className={`${campo} mt-2 resize-y font-mono text-[0.85rem]`}
              />
              <p className="mt-4 text-[0.7rem] uppercase tracking-wider text-slate-500">Como o modelo enxerga</p>
              <div className="mt-2">
                <Fichas tokens={stats.lista} />
              </div>
              <p className="mt-3 text-xs text-slate-500">
                O ponto médio é espaço. Repare que o espaço vem grudado na palavra seguinte, e que cada dígito virou um token sozinho.
                A ficha em amarelo é <b className="text-amber-300/90">meia letra</b>: um acento partido ao meio, porque o modelo trabalha em bytes.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Numero rotulo="Tokens" valor={stats.tokens} tom="text-brand-green" />
              <Numero rotulo="Caracteres" valor={stats.caracteres} />
              <Numero rotulo="Palavras" valor={stats.palavras} />
              <Numero rotulo="Tokens por palavra" valor={stats.porPalavra.toFixed(2)} />
            </div>

            <div className="mt-4 rounded-3xl border border-brand-blue/25 bg-brand-blue/[0.06] p-5">
              <p className="font-display text-base font-bold text-white">O mesmo texto, outro corpus</p>
              <p className="mt-1 text-sm text-slate-300">
                Treinado em <b className="text-white">{corpus.nome}</b>, o seu texto custa <b className="text-brand-green">{stats.tokens} tokens</b>.
                Treinado em <b className="text-white">{comparacao.nome}</b>, custa <b className="text-amber-300">{comparacao.tokens}</b>.
              </p>
              <p className="mt-2 text-sm text-slate-400">
                O tokenizador não é neutro: ele é barato no assunto em que foi treinado e caro fora dele. É por isso que português custa mais token
                que inglês nos modelos grandes, e por que texto técnico do seu domínio consome mais contexto do que você espera.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/8 bg-white/[0.02] p-5">
            <p className="font-display text-base font-bold text-white">O que está acontecendo</p>
            <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-slate-400">
              <p><b className="text-slate-200">1. Pré-corte.</b> O texto é quebrado em palavras, pontuação e dígitos soltos, com o espaço colado na palavra seguinte.</p>
              <p><b className="text-slate-200">2. Bytes.</b> Cada pedaço vira bytes. Acento e emoji ocupam mais de um, e é aí que o português começa a ficar caro.</p>
              <p><b className="text-slate-200">3. Fusões.</b> O par de pedaços mais frequente é fundido, e isso se repete centenas de vezes. Sobem os pedaços do assunto do corpus.</p>
              <p className="rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-3 py-2 text-amber-200/90">
                Nenhum modelo vê letra. Ele vê esses pedaços, numerados. Quando você pede para ele somar um CPF, ele está manipulando onze pedaços sem noção de número.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-start">
          <div>
            <div data-tour="cp-prompt" className="rounded-3xl border border-white/8 bg-white/[0.02] p-5">
              <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
                <label>
                  <span className={rotulo}>Comece uma frase</span>
                  <input className={`${campo} mt-1`} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
                </label>
                <label>
                  <span className={rotulo}>Contexto</span>
                  <select className={`${campo} mt-1 [&>option]:bg-ink-900`} value={ordem} onChange={(e) => setOrdem(Number(e.target.value))}>
                    <option value={2}>1 token</option>
                    <option value={3}>2 tokens</option>
                    <option value={4}>3 tokens</option>
                  </select>
                </label>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {COMECOS.map((c) => (
                  <button key={c} type="button" onClick={() => setPrompt(c)} className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-400 transition-colors hover:border-brand-teal/40 hover:text-white">
                    {c}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_8rem]">
                <label>
                  <span className={rotulo}>Temperatura: {temperatura.toFixed(2)}</span>
                  <input type="range" min={0} max={2} step={0.05} value={temperatura} onChange={(e) => setTemperatura(Number(e.target.value))} className="mt-3 w-full accent-[#34e8a0]" />
                  <span className="mt-1 block text-[0.7rem] text-slate-500">
                    {temperatura <= 0.05 ? "Zero: sempre o campeão. Repetitivo e previsível." : temperatura < 0.9 ? "Baixa: escolhe o provável. Texto sem graça e mais seguro." : temperatura < 1.5 ? "Alta: começa a arriscar." : "Muito alta: escolhe o improvável e delira com confiança."}
                  </span>
                </label>
                <label>
                  <span className={rotulo}>Semente</span>
                  <input type="number" className={`${campo} mt-1`} value={semente} onChange={(e) => setSemente(Number(e.target.value) || 1)} />
                </label>
              </div>
            </div>

            <div data-tour="cp-saida" className="mt-4 overflow-hidden rounded-3xl border border-white/8 bg-[#070d14]">
              <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-2.5">
                <span className="font-mono text-xs text-slate-400">saída · {gerados.length} tokens gerados</span>
                <span className={`rounded-full border px-2 py-0.5 text-[0.65rem] ${origem.geral ? "border-red-500/40 bg-red-500/10 text-red-300" : "border-brand-green/40 bg-brand-green/10 text-brand-green"}`}>
                  {origem.geral ? "contexto desconhecido" : `contexto de ${origem.tamanho} token${origem.tamanho > 1 ? "s" : ""}`}
                </span>
              </div>
              <p className="px-4 py-4 text-[0.95rem] leading-relaxed">
                <span className="text-slate-500">{prompt}</span>
                <span className="text-brand-green">{textoGerado}</span>
                <span className="animate-pulse text-brand-green">▍</span>
              </p>
              <div className="flex flex-wrap items-center gap-2 border-t border-white/8 px-4 py-3">
                <button type="button" onClick={() => passo(1)} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-brand-green/50 hover:text-brand-green">
                  Gerar 1 token
                </button>
                <button type="button" onClick={() => passo(40)} className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
                  Gerar 40
                </button>
                <button type="button" onClick={() => setGerados([])} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 transition-colors hover:text-white">
                  Recomeçar
                </button>
              </div>
            </div>

            {origem.geral && (
              <p className="mt-3 rounded-2xl border border-red-500/25 bg-red-500/[0.07] px-4 py-3 text-sm text-red-200">
                O modelo não reconheceu nada do contexto atual e está respondendo pela frequência geral do corpus. Repare que ele não avisa,
                não hesita e não erra o tom: continua escrevendo com a mesma cara de certeza. É exatamente isso que acontece quando um modelo
                grande alucina.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-4 lg:sticky lg:top-6">
            <div data-tour="cp-candidatos" className="rounded-3xl border border-white/8 bg-white/[0.02] p-5">
              <p className="font-display text-base font-bold text-white">O próximo token</p>
              <p className="mt-1 text-[0.7rem] text-slate-500">O que o modelo considera agora, e com que chance.</p>
              <div className="mt-3 flex flex-col gap-2">
                {proximos.length === 0 && <p className="text-sm text-slate-500">Sem candidatos para este contexto.</p>}
                {proximos.map((c, i) => (
                  <div key={c.id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono text-sm text-slate-200">
                        {textoDoToken(c.token).includes(METADE) ? <span className="text-amber-300/90">½ letra</span> : visivel(textoDoToken(c.token)) || "·"}
                      </span>
                      <span className="font-mono text-[0.7rem] tabular-nums text-slate-500">
                        {(c.probabilidade * 100).toFixed(1)}% · {c.contagem}x
                      </span>
                    </div>
                    <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                      <span className="block h-full rounded-full" style={{ width: `${c.probabilidade * 100}%`, backgroundColor: i === 0 ? "#34e8a0" : CORES[i % CORES.length] }} />
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/8 bg-white/[0.02] p-5">
              <p className="font-display text-base font-bold text-white">O modelo</p>
              <div className="mt-3 flex flex-col gap-1.5 text-sm text-slate-400">
                <p>Vocabulário: <b className="text-slate-200">{vocab.tokens.length.toLocaleString("pt-BR")}</b> tokens</p>
                <p>Corpus: <b className="text-slate-200">{modelo.totalTokens.toLocaleString("pt-BR")}</b> tokens</p>
                <p>Contextos aprendidos: <b className="text-slate-200">{modelo.contextos.toLocaleString("pt-BR")}</b></p>
              </div>
              <p className="mt-3 text-[0.75rem] leading-relaxed text-slate-500">
                Um GPT tem bilhões de parâmetros e este tem uma tabela de contagem. A diferença de qualidade é abissal, e o mecanismo de escolher o
                próximo token pela probabilidade é o mesmo.
              </p>
            </div>
          </div>
        </div>
      )}

      <TourCaixaPreta aberto={tour} aoFechar={() => setTour(false)} />
    </div>
  );
}
