"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";


import { useEffect, useMemo, useState } from "react";
import { sortearCaso } from "@/lib/conciliacao/gerador";
import { comparar, moeda, quebrar, registros, corrigir, type Filtro } from "@/lib/conciliacao/motor";
import { CAUSAS, DIMENSOES, type ClasseDefeito, type Dimensao, type Veredito } from "@/lib/conciliacao/tipos";
import TourConciliacao, { tourConciliacaoJaVisto } from "@/components/conciliacao/TourConciliacao";

/* A tela é o método.

   Não existe campo de busca nem SQL aqui de propósito. O que existe é o caminho
   que um sênior percorre: olhar o total, quebrar por uma dimensão, ver em qual
   grupo a diferença mora, entrar nele e só então abrir a linha. Quem usa a
   ferramenta três vezes sai com o método na cabeça, mesmo sem perceber.

   Tudo roda no navegador. O caso é gerado a partir do id do aluno, então o dele
   nunca é o do colega. */

const campo =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60";
const rotulo = "block text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400";

const SITUACAO: Record<string, { texto: string; cor: string }> = {
  igual: { texto: "igual", cor: "text-slate-500" },
  so_origem: { texto: "só na origem", cor: "text-red-300" },
  so_painel: { texto: "só no painel", cor: "text-amber-300" },
  valor: { texto: "valor diferente", cor: "text-amber-300" },
  repetido: { texto: "id repetido", cor: "text-red-300" },
};

export default function Conciliacao({ semente }: { semente: number }) {
  const tr = usarTraducao();
  const [rodada, setRodada] = useState(0);
  const [filtro, setFiltro] = useState<Filtro>({});
  const [dimensao, setDimensao] = useState<Dimensao>("mes");
  const [verRegistros, setVerRegistros] = useState(false);
  const [quebras, setQuebras] = useState(0);
  const [valor, setValor] = useState("");
  const [classe, setClasse] = useState<ClasseDefeito | "">("");
  const [veredito, setVeredito] = useState<Veredito | null>(null);

  const [tour, setTour] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => { if (!tourConciliacaoJaVisto()) setTour(true); }, 700);
    return () => clearTimeout(t);
  }, []);

  const caso = useMemo(() => sortearCaso(semente, rodada), [semente, rodada]);
  const total = useMemo(() => comparar(caso), [caso]);
  const recorte = useMemo(() => comparar(caso, filtro), [caso, filtro]);
  const linhas = useMemo(() => quebrar(caso, dimensao, filtro), [caso, dimensao, filtro]);
  const lista = useMemo(() => (verRegistros ? registros(caso, filtro) : []), [caso, filtro, verRegistros]);

  useEffect(() => {
    setFiltro({});
    setDimensao("mes");
    setVerRegistros(false);
    setQuebras(0);
    setValor("");
    setClasse("");
    setVeredito(null);
  }, [rodada]);

  const filtros = Object.entries(filtro) as [Dimensao, string][];
  const nomeDaDimensao = (d: Dimensao) => DIMENSOES.find((x) => x.chave === d)?.nome ?? d;

  function responder() {
    const numero = Number(String(valor).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
    setVeredito(corrigir(caso, { valor: numero, classe }));
  }

  const cor = (v: number) => (Math.abs(v) < 0.01 ? "text-slate-400" : v > 0 ? "text-amber-300" : "text-red-300");

  return (
    <div className="mt-8">
      {/* Caso */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-white/8 bg-white/[0.02] p-6">
        <div className="min-w-0 flex-1">
          <p className="text-[0.7rem] uppercase tracking-wider text-brand-green">{tr("Chamado do dia")}</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-white">{caso.titulo}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">{caso.contexto}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setTour(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-brand-green/50 hover:text-brand-green"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
            {tr("Tour guiado")}
          </button>
          <button
            type="button"
            onClick={() => setRodada((r) => r + 1)}
            className="rounded-xl border border-white/10 px-3.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-brand-teal/50 hover:text-brand-teal"
          >
            {tr("Outro chamado")}
          </button>
        </div>
      </div>

      {/* Passo 1: o total */}
      <div data-tour="conc-totais" className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          { nome: tr("Extrato do sistema"), valor: recorte.origem, linhas: recorte.linhasOrigem, tom: "text-white" },
          { nome: tr("O que o painel mostra"), valor: recorte.painel, linhas: recorte.linhasPainel, tom: "text-white" },
          { nome: tr("Diferença"), valor: recorte.diferenca, linhas: null, tom: cor(recorte.diferenca) },
        ].map((c) => (
          <div key={c.nome} className="rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-4">
            <p className="text-[0.65rem] uppercase tracking-wider text-slate-500">{c.nome}</p>
            <p className={`mt-1 font-display text-xl font-bold tabular-nums ${c.tom}`}>{moeda(c.valor)}</p>
            {c.linhas !== null && <p className="text-[0.7rem] text-slate-500">{c.linhas} {tr("lançamentos")}</p>}
          </div>
        ))}
      </div>

      {filtros.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500">Investigando:</span>
          {filtros.map(([d, v]) => (
            <button
              key={d}
              type="button"
              onClick={() => setFiltro((f) => { const novo = { ...f }; delete novo[d]; return novo; })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-teal/40 bg-brand-teal/10 px-2.5 py-1 text-brand-teal"
            >
              {nomeDaDimensao(d)}: {v}
              <span aria-hidden="true">✕</span>
            </button>
          ))}
          <span className="text-slate-600">
            (o total do caso é {moeda(total.diferenca)})
          </span>
        </div>
      )}

      {/* Passo 2: a quebra */}
      <div data-tour="conc-quebra" className="mt-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={rotulo}>{tr("Quebre por")}</span>
          {DIMENSOES.map((d) => (
            <button
              key={d.chave}
              type="button"
              onClick={() => { setDimensao(d.chave); setQuebras((q) => q + 1); }}
              className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors ${
                dimensao === d.chave ? "border-brand-green/50 bg-brand-green/[0.10] text-white" : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-white"
              }`}
            >
              {d.nome}
            </button>
          ))}
        </div>

        <div className="mt-3 overflow-hidden rounded-3xl border border-white/8 bg-[#070d14]">
          <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-2.5 text-[0.7rem] uppercase tracking-wide text-slate-400">{nomeDaDimensao(dimensao)}</th>
                <th className="px-4 py-2.5 text-right text-[0.7rem] uppercase tracking-wide text-slate-400">{tr("Sistema")}</th>
                <th className="px-4 py-2.5 text-right text-[0.7rem] uppercase tracking-wide text-slate-400">{tr("Painel")}</th>
                <th className="px-4 py-2.5 text-right text-[0.7rem] uppercase tracking-wide text-slate-400">{tr("Diferença")}</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.grupo} className={`border-b border-white/[0.04] ${Math.abs(l.diferenca) > 0.01 ? "bg-red-500/[0.04]" : ""}`}>
                  <td className="px-4 py-2 text-slate-200">{l.grupo}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-slate-300">{moeda(l.origem)}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-slate-300">{moeda(l.painel)}</td>
                  <td className={`px-4 py-2 text-right font-mono font-semibold tabular-nums ${cor(l.diferenca)}`}>
                    {Math.abs(l.diferenca) < 0.01 ? "—" : moeda(l.diferenca)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setFiltro((f) => ({ ...f, [dimensao]: l.grupo }))}
                      className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-400 transition-colors hover:border-brand-teal/50 hover:text-brand-teal"
                    >
                      {tr("isolar")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Passo 3: a linha */}
      <div data-tour="conc-registros" className="mt-4">
        <button
          type="button"
          onClick={() => setVerRegistros((v) => !v)}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-brand-green/50 hover:text-brand-green"
        >
          {verRegistros ? "Esconder os lançamentos" : "Abrir os lançamentos deste recorte"}
        </button>

        {verRegistros && (
          <div className="mt-3 overflow-hidden rounded-3xl border border-white/8 bg-[#070d14]">
            <div className="max-h-96 overflow-auto">
              <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                <thead className="sticky top-0 bg-[#070d14]">
                  <tr className="border-b border-white/10">
                    {["Lançamento", "Data", "Filial", "Status", "Sistema", "Painel", "Situação"].map((h) => (
                      <th key={h} className="px-3 py-2 text-[0.7rem] uppercase tracking-wide text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lista.slice(0, 80).map((r) => {
                    const ref = r.origem[0] ?? r.painel[0];
                    const s = SITUACAO[r.situacao];
                    return (
                      <tr key={r.id} className={`border-b border-white/[0.04] ${r.situacao === "igual" ? "" : "bg-white/[0.02]"}`}>
                        <td className="px-3 py-1.5 font-mono text-[0.8rem] text-slate-300">{r.id}{r.origem.length > 1 ? ` (${r.origem.length}x)` : ""}</td>
                        <td className="px-3 py-1.5 text-slate-400">{ref?.data}</td>
                        <td className="px-3 py-1.5 text-slate-400">{ref?.filial}</td>
                        <td className="px-3 py-1.5 text-slate-400">{(r.painel[0] ?? r.origem[0])?.status}</td>
                        <td className="px-3 py-1.5 font-mono tabular-nums text-slate-300">{r.origem.length ? moeda(r.origem.reduce((s, l) => s + l.valor, 0)) : "—"}</td>
                        <td className="px-3 py-1.5 font-mono tabular-nums text-slate-300">{r.painel.length ? moeda(r.painel.reduce((s, l) => s + l.valor, 0)) : "—"}</td>
                        <td className={`px-3 py-1.5 text-xs ${s.cor}`}>{tr(s.texto)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {lista.length > 80 && <p className="px-3 py-2 text-xs text-slate-500">{tr("Mostrando 80 de")} {lista.length}{tr(". Isole um grupo para reduzir a lista.")}</p>}
          </div>
        )}
      </div>

      {/* Resposta */}
      <div data-tour="conc-resposta" className="mt-6 rounded-3xl border border-white/8 bg-white/[0.02] p-6">
        <h3 className="font-display text-lg font-bold text-white">{tr("Seu laudo")}</h3>
        <p className="mt-1 text-sm text-slate-400">{caso.pergunta}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-[14rem_1fr_auto] sm:items-end">
          <label>
            <span className={rotulo}>{tr("Valor da divergência")}</span>
            <input className={`${campo} mt-1 font-mono`} value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" inputMode="decimal" />
          </label>
          <label>
            <span className={rotulo}>{tr("Causa")}</span>
            <select className={`${campo} mt-1 [&>option]:bg-ink-900`} value={classe} onChange={(e) => setClasse(e.target.value as ClasseDefeito | "")}>
              <option value="">{tr("Escolha a causa")}</option>
              {CAUSAS.map((c) => <option key={c.classe} value={c.classe}>{c.nome}</option>)}
            </select>
          </label>
          <button
            type="button"
            onClick={responder}
            className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-2.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]"
          >
            {tr("Entregar o laudo")}
          </button>
        </div>
        {classe && <p className="mt-2 text-xs text-slate-500">{CAUSAS.find((c) => c.classe === classe)?.descricao}</p>}

        {veredito && (
          <div className={`mt-5 rounded-2xl border p-5 ${veredito.acertouValor && veredito.acertouClasse ? "border-brand-green/40 bg-brand-green/[0.07]" : "border-amber-400/35 bg-amber-400/[0.06]"}`}>
            <p className={`font-display text-lg font-bold ${veredito.acertouValor && veredito.acertouClasse ? "text-brand-green" : "text-white"}`}>{veredito.titulo}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">{veredito.detalhe}</p>
            <p className="mt-3 border-t border-white/10 pt-3 text-sm leading-relaxed text-slate-400">
              <span className="font-semibold text-slate-200">{tr("Como reconhecer da próxima vez:")} </span>
              {veredito.metodo}
            </p>
            {veredito.acertouValor && veredito.acertouClasse && (
              <p className="mt-3 text-xs text-slate-500">
                {tr("Você chegou lá com")} {quebras} {quebras === 1 ? "quebra" : "quebras"} {tr("por dimensão. Sênior resolve em duas ou três: total, dimensão certa, linha.")}
              </p>
            )}
          </div>
        )}
      </div>

      <TourConciliacao aberto={tour} aoFechar={() => setTour(false)} />
    </div>
  );
}
