"use client";

import { useState } from "react";
import type { Carreira } from "@/lib/portfolio-carreira";
import type { ExperienciaLida } from "@/lib/portfolio-ia";
import {
  adicionarConquista,
  criarConviteRecomendacao,
  decidirRecomendacao,
  definirObjetivo,
  excluirConquista,
  excluirExperiencia,
  excluirRecomendacao,
  lerTrajetoria,
  removerObjetivo,
  salvarExperiencias,
  testarVaga,
} from "./actions";

/* A carreira além dos projetos. Cada bloco vira um objeto no Universo 4D
   público: o objetivo é a estrela-guia, a trajetória é a rota da nave, as
   conquistas são cometas e as recomendações são sinais. O texto de cada
   bloco diz isso, para o aluno entender o que está construindo. */

const campo =
  "w-full rounded-xl border border-tinta/10 bg-tinta/[0.04] px-3 py-2 text-sm text-tinta placeholder:text-slate-500 outline-none transition-colors focus:border-acento/60";
const botao = "rounded-full bg-marca-verde px-4 py-2 text-sm font-semibold text-sobre-acento disabled:opacity-40";
const botaoLeve = "rounded-lg border border-tinta/15 px-3 py-1.5 text-sm text-tinta disabled:opacity-40";

const mesAno = (d: string | null) =>
  d ? new Date(`${d.slice(0, 7)}-15T12:00:00Z`).toLocaleDateString("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" }).replace(/\./g, "") : "";

function Bloco({ titulo, espaco, children, aberto = false }: { titulo: string; espaco: string; children: React.ReactNode; aberto?: boolean }) {
  return (
    <details open={aberto} className="group rounded-[20px] border border-tinta/10 bg-papel p-4">
      <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold text-tinta">{titulo}</span>
        <span className="text-xs text-slate-400">no seu 4D: {espaco}</span>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

export default function CarreiraDoAluno({
  carreira,
  projetos,
  nomes,
  provadas,
  cursos,
}: {
  carreira: Carreira;
  projetos: { id: string; titulo: string }[];
  nomes: Record<string, string>;
  provadas: string[];
  cursos: Record<string, { titulo: string; slug: string }[]>;
}) {
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState("");
  const copiar = async (t: string, r: string) => {
    try { await navigator.clipboard.writeText(t); setCopiado(r); setTimeout(() => setCopiado(""), 2000); } catch {}
  };

  // Objetivo
  const [objetivo, setObjetivo] = useState(carreira.objetivo?.titulo ?? "");
  const [requeridas, setRequeridas] = useState(carreira.objetivo?.requeridas ?? null);
  const [definindo, setDefinindo] = useState(false);

  // Trajetória
  const [colado, setColado] = useState("");
  const [lidas, setLidas] = useState<ExperienciaLida[] | null>(null);
  const [lendo, setLendo] = useState(false);

  // Conquista
  const [conquista, setConquista] = useState({ titulo: "", data: "", descricao: "", link_prova: "" });

  // Recomendação
  const [projetoRec, setProjetoRec] = useState("");
  const [convite, setConvite] = useState("");

  // Vaga
  const [vagaTexto, setVagaTexto] = useState("");
  const [vagaLendo, setVagaLendo] = useState(false);
  const [vaga, setVaga] = useState<Awaited<ReturnType<typeof testarVaga>> | null>(null);

  if (!carreira.pronta) return null;

  const provadasSet = new Set(provadas);
  const recsPendentes = carreira.recomendacoes.filter((r) => r.status === "aguardando_aprovacao");
  const recsAprovadas = carreira.recomendacoes.filter((r) => r.status === "aprovada");
  const convitesAbertos = carreira.recomendacoes.filter((r) => r.status === "convite" || r.status === "aguardando_email");
  const siteBase = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <section className="mt-8 rounded-[20px] border border-tinta/10 bg-papel p-5 sm:p-7">
      <h2 className="font-display text-2xl font-bold text-tinta">Sua carreira no universo</h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-400">
        Os projetos acendem as estrelas. Estes blocos contam o resto da história: para onde você vai, por onde passou, o que conquistou e quem confirma o seu trabalho.
      </p>
      {erro && <p className="mt-3 text-sm text-red-300">{erro}</p>}

      <div className="mt-5 flex flex-col gap-3">
        <Bloco titulo="Seu objetivo" espaco="a estrela-guia" aberto={!carreira.objetivo}>
          <div className="flex flex-wrap gap-2">
            <input value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder="Ex: Head de Dados" className={`${campo} max-w-sm`} />
            <button
              disabled={definindo || objetivo.trim().length < 3}
              onClick={async () => {
                setDefinindo(true); setErro("");
                const r = await definirObjetivo(objetivo);
                setDefinindo(false);
                if (!r.ok) return setErro(r.erro);
                setRequeridas(r.requeridas);
              }}
              className={botao}
            >
              {definindo ? "Lendo o cargo..." : carreira.objetivo ? "Atualizar" : "Definir objetivo"}
            </button>
            {carreira.objetivo && <button onClick={async () => { await removerObjetivo(); setObjetivo(""); setRequeridas(null); }} className="text-xs text-slate-500 hover:text-slate-300">remover</button>}
          </div>
          {requeridas && requeridas.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-slate-400">
                O que esse cargo costuma pedir, segundo a IA. Você tem {requeridas.filter((r) => provadasSet.has(r.id)).length} de {requeridas.length} comprovadas por projeto.
              </p>
              <ul className="mt-2 flex flex-col gap-2">
                {requeridas.map((r) => {
                  const tem = provadasSet.has(r.id);
                  return (
                    <li key={r.id} className="text-sm">
                      <span className={tem ? "font-semibold text-acento" : "font-semibold text-slate-200"}>{tem ? "✓ " : "○ "}{nomes[r.id] ?? r.id}</span>
                      <span className="text-slate-400"> · {r.motivo}</span>
                      {!tem && (cursos[r.id] ?? []).length > 0 && (
                        <span className="block text-xs text-slate-400">
                          Para acender: {(cursos[r.id] ?? []).map((c, i) => (
                            <a key={c.slug} href={`/cursos/${c.slug}`} className="text-brand-teal hover:underline">{i > 0 ? ", " : ""}{c.titulo}</a>
                          ))}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </Bloco>

        <Bloco titulo="Sua trajetória" espaco="a rota da nave" aberto={!carreira.experiencias.length}>
          {carreira.experiencias.length > 0 && (
            <ul className="mb-4 flex flex-col gap-2">
              {carreira.experiencias.map((e) => (
                <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="min-w-0">
                    <span className="font-semibold text-tinta">{e.cargo}</span>
                    {e.organizacao && <span className="text-slate-300"> · {e.organizacao}</span>}
                    <span className="block text-xs text-slate-400">{mesAno(e.inicio)}{e.inicio ? " a " : ""}{e.fim ? mesAno(e.fim) : e.inicio ? "hoje" : ""}{e.setor ? ` · ${e.setor}` : ""}</span>
                  </span>
                  <button onClick={() => excluirExperiencia(e.id)} className="text-xs text-slate-500 hover:text-slate-300">excluir</button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-slate-400">Cole a seção de experiências do seu LinkedIn ou do currículo. A IA separa cargo, organização e datas, só com o que está escrito.</p>
          <textarea value={colado} onChange={(e) => setColado(e.target.value)} rows={5} placeholder="Gerente de Projetos · Empresa · fev. de 2021 - o momento ..." className={`${campo} mt-2 resize-y`} />
          <button
            disabled={lendo || colado.trim().length < 60}
            onClick={async () => {
              setLendo(true); setErro("");
              const r = await lerTrajetoria(colado);
              setLendo(false);
              if (!r.ok) return setErro(r.erro);
              setLidas(r.itens);
            }}
            className={`${botaoLeve} mt-2`}
          >
            {lendo ? "Lendo..." : "Organizar com IA"}
          </button>
          {lidas && (
            <div className="mt-3 rounded-xl border border-tinta/10 p-3">
              {lidas.length === 0 ? (
                <p className="text-sm text-slate-400">Não encontrei experiências com cargo e datas no texto.</p>
              ) : (
                <>
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {lidas.map((e, i) => (
                      <li key={i}>
                        <span className="text-tinta">{e.cargo}</span>{e.organizacao && <span className="text-slate-300"> · {e.organizacao}</span>}
                        <span className="text-xs text-slate-400"> · {e.inicio ?? "?"} a {e.fim ?? "hoje"}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={async () => {
                      const r = await salvarExperiencias(lidas);
                      if (!r.ok) return setErro(r.erro);
                      setLidas(null); setColado("");
                    }}
                    className={`${botao} mt-3`}
                  >
                    Salvar {lidas.length} {lidas.length === 1 ? "experiência" : "experiências"}
                  </button>
                </>
              )}
            </div>
          )}
        </Bloco>

        <Bloco titulo="Conquistas" espaco="cometas">
          {carreira.conquistas.length > 0 && (
            <ul className="mb-4 flex flex-col gap-2">
              {carreira.conquistas.map((c) => (
                <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span>
                    <span className="font-semibold text-tinta">{c.titulo}</span>
                    <span className="text-xs text-slate-400"> {mesAno(c.data)}</span>
                    {c.link_prova && <a href={c.link_prova} target="_blank" rel="noopener" className="ml-2 text-xs text-brand-teal hover:underline">prova</a>}
                  </span>
                  <button onClick={() => excluirConquista(c.id)} className="text-xs text-slate-500 hover:text-slate-300">excluir</button>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-2 sm:grid-cols-[1fr_10rem]">
            <input value={conquista.titulo} onChange={(e) => setConquista((c) => ({ ...c, titulo: e.target.value }))} placeholder="Ex: Voluntário do Ano, PMI São Paulo" className={campo} />
            <input type="month" value={conquista.data} onChange={(e) => setConquista((c) => ({ ...c, data: e.target.value }))} className={`${campo} [color-scheme:dark]`} />
          </div>
          <input value={conquista.link_prova} onChange={(e) => setConquista((c) => ({ ...c, link_prova: e.target.value }))} placeholder="Link que prova (post, certificado, notícia)" className={`${campo} mt-2`} />
          <input value={conquista.descricao} onChange={(e) => setConquista((c) => ({ ...c, descricao: e.target.value }))} placeholder="Uma frase sobre a conquista (opcional)" className={`${campo} mt-2`} />
          <button
            disabled={conquista.titulo.trim().length < 3}
            onClick={async () => {
              const r = await adicionarConquista(conquista);
              if (!r.ok) return setErro(r.erro);
              setConquista({ titulo: "", data: "", descricao: "", link_prova: "" });
            }}
            className={`${botaoLeve} mt-2`}
          >
            Adicionar conquista
          </button>
        </Bloco>

        <Bloco titulo="Recomendações" espaco="sinais" aberto={recsPendentes.length > 0}>
          <p className="text-xs text-slate-400">
            Quem escreve é o colega, por um link, e confirma o próprio e-mail. Você só decide se aparece. É isso que faz a recomendação valer.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <select value={projetoRec} onChange={(e) => setProjetoRec(e.target.value)} className={`${campo} max-w-xs [&>option]:bg-ink-900`}>
              <option value="">Sobre o meu trabalho em geral</option>
              {projetos.map((p) => <option key={p.id} value={p.id}>Sobre: {p.titulo}</option>)}
            </select>
            <button
              onClick={async () => {
                const r = await criarConviteRecomendacao(projetoRec || null);
                if (!r.ok) return setErro(r.erro);
                setConvite(r.url);
              }}
              className={botaoLeve}
            >
              Gerar link de convite
            </button>
          </div>
          {convite && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-acento/30 bg-brand-green/[0.06] p-3">
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-acento">{convite}</span>
              <button onClick={() => copiar(convite, "convite")} className={botaoLeve}>{copiado === "convite" ? "Copiado" : "Copiar"}</button>
              <a href={`https://wa.me/?text=${encodeURIComponent(`Oi! Estou montando meu portfólio. Você escreveria uma recomendação sobre o nosso trabalho juntos? É rapidinho: ${convite}`)}`} target="_blank" rel="noopener" className={botaoLeve}>Mandar no WhatsApp</a>
            </div>
          )}

          {recsPendentes.length > 0 && (
            <div className="mt-4 flex flex-col gap-3">
              <p className="text-sm font-semibold text-tinta">Esperando você aprovar</p>
              {recsPendentes.map((r) => (
                <div key={r.id} className="rounded-xl border border-tinta/10 p-3">
                  <p className="text-sm text-slate-200">&ldquo;{r.texto}&rdquo;</p>
                  <p className="mt-1 text-xs text-slate-400">{r.autor_nome}{r.autor_cargo ? `, ${r.autor_cargo}` : ""}{r.relacao ? ` · ${r.relacao}` : ""} · e-mail confirmado</p>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => decidirRecomendacao(r.id, true)} className={botao}>Aprovar</button>
                    <button onClick={() => decidirRecomendacao(r.id, false)} className={botaoLeve}>Não mostrar</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {recsAprovadas.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              <p className="text-sm font-semibold text-tinta">No seu portfólio</p>
              {recsAprovadas.map((r) => (
                <div key={r.id} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-slate-300">{r.autor_nome}{r.autor_cargo ? `, ${r.autor_cargo}` : ""}</span>
                  <button onClick={() => excluirRecomendacao(r.id)} className="text-xs text-slate-500 hover:text-slate-300">remover</button>
                </div>
              ))}
            </div>
          )}

          {convitesAbertos.length > 0 && (
            <div className="mt-4 flex flex-col gap-1.5">
              <p className="text-xs text-slate-400">Convites em aberto</p>
              {convitesAbertos.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <span>{r.status === "aguardando_email" ? `${r.autor_nome ?? "Alguém"} escreveu, falta confirmar o e-mail` : "Ninguém escreveu ainda"}</span>
                  <span className="flex gap-3">
                    {r.status === "convite" && <button onClick={() => copiar(`${siteBase}/recomendar/${r.token}`, r.id)} className="text-brand-teal hover:underline">{copiado === r.id ? "copiado" : "copiar link"}</button>}
                    <button onClick={() => excluirRecomendacao(r.id)} className="hover:text-slate-200">cancelar</button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Bloco>

        <Bloco titulo="Testar com uma vaga" espaco="anéis no que você já prova">
          <p className="text-sm text-slate-400">
            Cole a descrição de uma vaga. A IA lê o que ela pede, com o trecho, e cruza com o que seus projetos provam. Quem abrir o seu Universo 4D pode fazer o mesmo.
          </p>
          <textarea value={vagaTexto} onChange={(e) => setVagaTexto(e.target.value)} rows={6} maxLength={9000} placeholder="Responsabilidades, requisitos, ferramentas..." className={`${campo} mt-3 resize-y`} />
          <button
            disabled={vagaLendo || vagaTexto.trim().length < 80}
            onClick={async () => {
              setVagaLendo(true); setErro("");
              const r = await testarVaga(vagaTexto);
              setVagaLendo(false);
              if (!r.ok) return setErro(r.erro);
              setVaga(r);
            }}
            className={`${botao} mt-3`}
          >
            {vagaLendo ? "Lendo a vaga..." : "Comparar com meus projetos"}
          </button>
          {vaga?.ok && (
            <div className="mt-4">
              <p className="text-sm text-tinta">
                <span className="font-display text-2xl font-bold">{vaga.tem}</span> de {vaga.total} competências pedidas já provadas por projeto.
              </p>
              <ul className="mt-2 flex flex-col gap-2">
                {vaga.itens.map((i) => (
                  <li key={i.id} className="text-sm">
                    <span className={i.tem ? "font-semibold text-acento" : "font-semibold text-slate-200"}>{i.tem ? "✓ " : "○ "}{i.nome}</span>
                    <span className="block text-xs text-slate-400">A vaga: &ldquo;{i.trecho}&rdquo;</span>
                    {i.tem && (
                      <span className="block text-xs text-slate-300">
                        Provada em {i.projetos.map((p) => p.titulo + (p.publico ? "" : " (privado, não aparece na página pública)")).join(", ")}
                      </span>
                    )}
                    {!i.tem && i.cursos.length > 0 && (
                      <span className="block text-xs text-slate-400">
                        Para acender: {i.cursos.map((c, k) => (
                          <a key={c.slug} href={`/cursos/${c.slug}`} className="text-brand-teal hover:underline">{k > 0 ? ", " : ""}{c.titulo}</a>
                        ))}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-500">Leitura feita por IA. O que falta vira projeto: é o próximo que vale a pena publicar.</p>
            </div>
          )}
        </Bloco>
      </div>
    </section>
  );
}
