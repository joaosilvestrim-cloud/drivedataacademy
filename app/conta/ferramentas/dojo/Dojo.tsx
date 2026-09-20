"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";


import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { COLUNAS, gerarBase, linhas } from "@/lib/dojo/dados";
import { DESAFIOS_DA_TRILHA, type Trilha } from "@/lib/dojo/desafios";
import { corrigir, formatar } from "@/lib/dojo/correcao";
import TourDojo, { tourDojoJaVisto } from "@/components/dojo/TourDojo";

/* Treino de DAX e Excel.

   A base fica na tela o tempo todo, porque o exercício é ler dado de verdade,
   não decorar função. A correção cobra duas coisas separadas: o número, que
   prova o entendimento, e a fórmula, que prova a execução. Acertar o número
   com a fórmula errada é o caso que mais aparece no trabalho, então ele
   aparece aqui também, com o alerta do que vai quebrar depois.

   Tudo roda no navegador, com a base gerada a partir do id do aluno: a do
   colega é outra. O que você já resolveu fica guardado neste navegador. */

const TRILHAS: { chave: Trilha; nome: string; sub: string }[] = [
  { chave: "dax", nome: "DAX", sub: "Power BI" },
  { chave: "excel", nome: "Excel", sub: "planilha" },
];

const campo =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60";

const chave = (t: Trilha) => `dojo:${t}:resolvidos`;

export default function Dojo({ semente }: { semente: number }) {
  const tr = usarTraducao();
  const [trilha, setTrilha] = useState<Trilha>("dax");
  const [indice, setIndice] = useState(0);
  const [valor, setValor] = useState("");
  const [formula, setFormula] = useState("");
  const [veredito, setVeredito] = useState<ReturnType<typeof corrigir> | null>(null);
  const [verGabarito, setVerGabarito] = useState(false);
  const [verDica, setVerDica] = useState(false);
  const [resolvidos, setResolvidos] = useState<Record<Trilha, string[]>>({ dax: [], excel: [] });
  const [tour, setTour] = useState(false);
  const [acendeRecorte, setAcendeRecorte] = useState(false);
  const [copiou, setCopiou] = useState(false);

  const base = useMemo(() => gerarBase(semente), [semente]);
  const tabela = useMemo(() => linhas(base), [base]);
  const desafios = useMemo(() => DESAFIOS_DA_TRILHA(trilha), [trilha]);
  const desafio = desafios[Math.min(indice, desafios.length - 1)];

  useEffect(() => {
    const t = setTimeout(() => { if (!tourDojoJaVisto()) setTour(true); }, 700);
    try {
      setResolvidos({
        dax: JSON.parse(localStorage.getItem(chave("dax")) || "[]"),
        excel: JSON.parse(localStorage.getItem(chave("excel")) || "[]"),
      });
    } catch { /* navegador sem storage: só não guarda o progresso */ }
    return () => clearTimeout(t);
  }, []);

  function limpar() {
    setAcendeRecorte(false);
    setValor("");
    setFormula("");
    setVeredito(null);
    setVerGabarito(false);
    setVerDica(false);
  }

  function conferir() {
    const r = corrigir(desafio, base, { valor, formula }, tr);
    setVeredito(r);
    if (r.acertou) {
      setResolvidos((antes) => {
        if (antes[trilha].includes(desafio.id)) return antes;
        const novo = { ...antes, [trilha]: [...antes[trilha], desafio.id] };
        try { localStorage.setItem(chave(trilha), JSON.stringify(novo[trilha])); } catch {}
        return novo;
      });
    }
  }

  /* A base copiada sai em TSV: colar no Excel ou no Sheets já cai em colunas.
     Para a trilha de Excel isso muda o exercício de lugar, porque a pessoa
     resolve na ferramenta de verdade e volta só com a resposta. */
  async function copiarBase() {
    const cabecalho = COLUNAS.join("\t");
    const corpo = tabela.map((l) => l.join("\t")).join("\n");
    try {
      await navigator.clipboard.writeText(`${cabecalho}\n${corpo}`);
      setCopiou(true);
      setTimeout(() => setCopiou(false), 2200);
    } catch {
      setCopiou(false);
    }
  }

  const feitos = resolvidos[trilha].length;

  return (
    <div className="mt-8">
      {/* Trilhas */}
      <div className="flex flex-wrap items-center gap-2" data-tour="dojo-trilhas">
        {TRILHAS.map((t) => (
          <button
            key={t.chave}
            onClick={() => { setTrilha(t.chave); setIndice(0); limpar(); }}
            className={`rounded-xl px-4 py-2 text-sm transition-colors ${trilha === t.chave ? "bg-brand-green/20 font-semibold text-brand-green" : "bg-white/5 text-slate-400 hover:text-white"}`}
          >
            {t.nome} <span className="text-[0.7rem] opacity-70">{t.sub}</span>
            <span className="ml-2 font-mono text-[0.7rem] tabular-nums opacity-70">
              {resolvidos[t.chave].length}/{DESAFIOS_DA_TRILHA(t.chave).length}
            </span>
          </button>
        ))}
        <Link
          href="/conta/ferramentas/arena"
          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-brand-green/50 hover:text-white"
        >
          SQL <span className="text-[0.7rem] opacity-70">{tr("na Arena ↗")}</span>
        </Link>
        <button onClick={() => setTour(true)} className="ml-auto rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:border-brand-green/50 hover:text-white">
          {tr("Como funciona")}
        </button>
      </div>

      {/* Mapa da trilha: dá para ir direto no desafio que interessa e ver o que já caiu. */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-white/8">
          <span className="block h-full rounded-full bg-gradient-to-r from-brand-green to-brand-blue transition-all duration-500" style={{ width: `${(feitos / desafios.length) * 100}%` }} />
        </span>
        <span className="font-mono text-xs tabular-nums text-slate-400">{feitos}/{desafios.length}</span>
        <span className="flex flex-wrap gap-1.5">
          {desafios.map((d, i) => {
            const feito = resolvidos[trilha].includes(d.id);
            const atual = i === indice;
            return (
              <button
                key={d.id}
                onClick={() => { setIndice(i); limpar(); }}
                title={`${i + 1}. ${d.titulo}${feito ? " (resolvido)" : ""}`}
                aria-label={`Desafio ${i + 1}: ${d.titulo}`}
                aria-current={atual ? "step" : undefined}
                className={`grid h-7 w-7 place-items-center rounded-lg text-[0.7rem] font-semibold tabular-nums transition-colors ${
                  atual ? "bg-brand-green text-ink-900" : feito ? "bg-brand-green/20 text-brand-green" : "bg-white/[0.06] text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {feito && !atual ? "✓" : i + 1}
              </button>
            );
          })}
        </span>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        {/* Base */}
        <div data-tour="dojo-base" className="min-w-0 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[0.7rem] uppercase tracking-wider text-brand-green">{tr("Sua base · tabela Vendas")}</p>
            <div className="flex flex-wrap items-center gap-2">
              {desafio.recorte && (
                <button
                  onClick={() => setAcendeRecorte((v) => !v)}
                  className={`rounded-lg border px-2.5 py-1 text-[0.7rem] transition-colors ${acendeRecorte ? "border-brand-green/50 text-brand-green" : "border-white/10 text-slate-400 hover:text-white"}`}
                >
                  {acendeRecorte ? tr("Apagar destaque") : `${tr("Acender")} ${tr(desafio.recorte.rotulo)}`}
                </button>
              )}
              <button onClick={copiarBase} className="rounded-lg border border-white/10 px-2.5 py-1 text-[0.7rem] text-slate-300 transition-colors hover:border-brand-green/50 hover:text-white">
                {copiou ? "Copiado" : tr("Copiar para a planilha")}
              </button>
              <span className="text-xs text-slate-500">{base.vendas.length} linhas</span>
            </div>
          </div>
          <div className="mt-3 max-h-[26rem] overflow-auto rounded-xl border border-white/8">
            <table className="w-full min-w-[640px] text-[0.8rem]">
              <thead className="sticky top-0 bg-ink-900/95 backdrop-blur">
                <tr className="text-left text-[0.68rem] uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2 font-medium">#</th>
                  {COLUNAS.map((c, i) => (
                    <th key={c} className="px-2 py-2 font-medium">
                      {c}
                      <span className="ml-1 font-mono text-[0.6rem] text-slate-600">{String.fromCharCode(65 + i)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabela.map((l, i) => {
                  const dentro = !!desafio.recorte?.linha(base.vendas[i]);
                  const acesa = acendeRecorte && dentro;
                  return (
                  <tr key={i} className={`border-t border-white/5 transition-colors ${acesa ? "bg-brand-green/10 text-white" : acendeRecorte ? "text-slate-500 opacity-60" : "text-slate-300"}`}>
                    <td className="px-2 py-1.5 font-mono text-[0.68rem] tabular-nums text-slate-600">{i + 2}</td>
                    {l.map((c, j) => (
                      <td key={j} className={`px-2 py-1.5 ${typeof c === "number" ? "font-mono tabular-nums" : ""}`}>
                        {typeof c === "number" && j === 7 ? `${Math.round(c * 100)}%` : c}
                      </td>
                    ))}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {tr("A letra ao lado do cabeçalho é a coluna no Excel; a linha 1 é o cabeçalho, então os dados começam na 2.")}
            {desafio.recorte && acendeRecorte && (
              <span className="text-brand-green">
                {" "}
                {tr("Aceso:")} {tr(desafio.recorte.rotulo)}, {base.vendas.filter(desafio.recorte.linha).length} {tr("linhas.")}
              </span>
            )}
          </p>
        </div>

        {/* Desafio */}
        <div className="flex min-w-0 flex-col gap-4">
          <div data-tour="dojo-desafio" className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-slate-400">
                {indice + 1} de {desafios.length}
              </span>
              <span className="text-[0.65rem] uppercase tracking-wide text-slate-500">
                {desafio.nivel === 1 ? "básico" : desafio.nivel === 2 ? "intermediário" : "avançado"}
              </span>
              {resolvidos[trilha].includes(desafio.id) && <span className="text-[0.65rem] font-semibold text-brand-green">{tr("resolvido")}</span>}
            </div>

            <h2 className="mt-2 font-display text-xl font-bold text-white">{tr(desafio.titulo)}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{tr(desafio.enunciado)}</p>

            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label className="block text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400" htmlFor="dojo-valor">
                  {tr("O número")}
                </label>
                <input
                  id="dojo-valor"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") conferir(); }}
                  placeholder={desafio.formato === "percentual" ? "23,5" : "12.345,67"}
                  inputMode="decimal"
                  className={`${campo} mt-1`}
                />
              </div>
              <div>
                <label className="block text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400" htmlFor="dojo-formula">
                  {tr("A fórmula")} {trilha === "dax" ? "(DAX)" : "(Excel)"}
                </label>
                <textarea
                  id="dojo-formula"
                  value={formula}
                  onChange={(e) => setFormula(e.target.value)}
                  rows={4}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) conferir(); }}
                  placeholder={trilha === "dax" ? "Minha Medida = ..." : "=SOMASES(...)"}
                  className={`${campo} mt-1 resize-y font-mono text-[0.8rem]`}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button onClick={conferir} title={tr("Ctrl + Enter")} className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
                {tr("Conferir")}
              </button>
              <button onClick={() => setVerDica((v) => !v)} className="rounded-xl border border-white/10 px-3 py-2.5 text-sm text-slate-300 hover:border-brand-green/50 hover:text-white">
                {verDica ? tr("Esconder a dica") : "Dica"}
              </button>
              <button
                onClick={() => { setIndice((i) => (i + 1) % desafios.length); limpar(); }}
                className="ml-auto rounded-xl border border-white/10 px-3 py-2.5 text-sm text-slate-300 hover:border-brand-green/50 hover:text-white"
              >
                {tr("Próximo →")}
              </button>
            </div>

            {verDica && <p className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">{tr(desafio.dica)}</p>}
          </div>

          {veredito && (
            <div data-tour="dojo-correcao" className={`rounded-2xl border p-5 ${veredito.acertou ? "border-brand-green/40 bg-brand-green/[0.06]" : "border-amber-300/30 bg-amber-300/[0.05]"}`}>
              <p className={`text-sm font-semibold ${veredito.acertou ? "text-brand-green" : "text-amber-200"}`}>{veredito.recado}</p>

              <div className="mt-3 flex flex-wrap gap-4 text-xs">
                <span className={veredito.valorOk ? "text-brand-green" : "text-red-300"}>
                  {veredito.valorOk ? "✓" : "✕"} {tr("número")}
                </span>
                <span className={veredito.formulaOk ? "text-brand-green" : "text-red-300"}>
                  {veredito.formulaOk ? "✓" : "✕"} {tr("fórmula")}
                </span>
              </div>

              {veredito.alertas.map((a) => (
                <p key={a} className="mt-2 text-sm text-amber-100">{a}</p>
              ))}

              {!veredito.valorOk && veredito.formulaOk && (
                <p className="mt-2 text-sm text-slate-300">{tr("Com a fórmula certa, o número da sua base é")} {formatar(veredito.esperado, desafio.formato)}.</p>
              )}

              {veredito.acertou ? (
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{tr(desafio.porque)}</p>
              ) : (
                <button onClick={() => setVerGabarito(true)} className="mt-3 text-sm text-slate-400 underline underline-offset-4 hover:text-white">
                  {tr("Ver a resposta e a explicação")}
                </button>
              )}

              {(verGabarito || veredito.acertou) && (
                <div className="mt-3">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">{tr("Um jeito certo de escrever")}</p>
                  <pre className="mt-1 overflow-x-auto rounded-xl border border-white/10 bg-[#0b1020] p-3 text-[0.78rem] leading-relaxed text-slate-200"><code>{desafio.gabarito}</code></pre>
                  {!veredito.acertou && <p className="mt-2 text-sm leading-relaxed text-slate-300">{tr(desafio.porque)}</p>}
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-slate-500">
            {feitos === desafios.length
              ? `Você fechou a trilha de ${trilha === "dax" ? "DAX" : "Excel"}. Troque de trilha ou volte em outro dia: a base muda a cada conta.`
              : `${feitos} de ${desafios.length} resolvidos nesta trilha. O progresso fica neste navegador.`}
          </p>
        </div>
      </div>

      <TourDojo aberto={tour} aoFechar={() => setTour(false)} />
    </div>
  );
}
