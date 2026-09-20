"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";


import { useEffect, useMemo, useState } from "react";
import {
  PADROES,
  calendarioDAX,
  calendarioM,
  feriadosDAX,
  medidasDAX,
  passoAPasso,
  type OpcoesCalendario,
} from "@/lib/forja/gerar";
import TourForja, { tourForjaJaVisto } from "@/components/forja/TourForja";

/* Forja DAX.

   Tudo é gerado no navegador enquanto a pessoa digita: o código muda junto com
   a escolha, então dá para ver o efeito de mudar o ano fiscal ou de ligar os
   feriados sem apertar nada. Nenhum dado sai daqui, e não existe "gerar" para
   clicar. */

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const campo =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60";
const rotulo = "block text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400";

function Copiar({ texto }: { texto: string }) {
  const tr = usarTraducao();
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1800);
        } catch {
          setCopiado(false);
        }
      }}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
        copiado ? "border-brand-green/50 bg-brand-green/10 text-brand-green" : "border-white/10 text-slate-300 hover:border-white/30 hover:text-white"
      }`}
    >
      {copiado ? (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {tr("Copiado")}
        </>
      ) : (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M9 9h10v10H9zM5 15V5h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {tr("Copiar")}
        </>
      )}
    </button>
  );
}

export default function Forja() {
  const tr = usarTraducao();
  const anoAtual = new Date().getFullYear();

  const [cal, setCal] = useState<OpcoesCalendario>({
    tabela: "dCalendario",
    coluna: tr("Data"),
    origem: "fato",
    fatoTabela: "fVendas",
    fatoColuna: tr("Data"),
    de: anoAtual - 2,
    ate: anoAtual + 1,
    inicioAnoFiscal: 1,
    idioma: "pt",
    feriados: true,
    tabelaFeriados: "dFeriados",
  });

  const [medidaBase, setMedidaBase] = useState("Receita");
  const [expressaoBase, setExpressaoBase] = useState("SUM ( fVendas[Valor] )");
  const [formato, setFormato] = useState(tr("moeda com duas casas"));
  const [escolhas, setEscolhas] = useState<string[]>(["ytd", "ano_anterior", "yoy", "media_movel"]);
  const [aba, setAba] = useState("calendario");

  // Tour guiado: abre sozinho na primeira visita e fica no botão do cabeçalho.
  const [tour, setTour] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => { if (!tourForjaJaVisto()) setTour(true); }, 700);
    return () => clearTimeout(t);
  }, []);

  const muda = (parte: Partial<OpcoesCalendario>) => setCal((c) => ({ ...c, ...parte }));

  const blocos = useMemo(() => {
    const medidas = medidasDAX({
      base: medidaBase.trim() || "Medida",
      expressaoBase,
      tabelaCalendario: cal.tabela,
      colunaData: cal.coluna,
      inicioAnoFiscal: cal.inicioAnoFiscal,
      escolhas,
      formato,
    });
    return [
      ...(cal.feriados ? [{ chave: "feriados", nome: "Feriados", linguagem: "DAX", codigo: feriadosDAX(cal) }] : []),
      { chave: "calendario", nome: "Calendário", linguagem: "DAX", codigo: calendarioDAX(cal) },
      { chave: "calendarioM", nome: "Calendário", linguagem: "Power Query", codigo: calendarioM(cal) },
      ...(medidas ? [{ chave: "medidas", nome: tr("Medidas de tempo"), linguagem: "DAX", codigo: medidas }] : []),
    ];
  }, [cal, medidaBase, expressaoBase, escolhas, formato]);

  const atual = blocos.find((b) => b.chave === aba) ?? blocos[0];
  const passos = passoAPasso(cal);

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[22rem_1fr] lg:items-start">
      {/* Escolhas */}
      <div className="flex flex-col gap-6 rounded-3xl border border-white/8 bg-white/[0.02] p-5">
        <div data-tour="forja-modelo">
          <h2 className="font-display text-base font-bold text-white">{tr("O seu modelo")}</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="col-span-2">
              <span className={rotulo}>{tr("Nome da tabela de calendário")}</span>
              <input className={`${campo} mt-1`} value={cal.tabela} onChange={(e) => muda({ tabela: e.target.value })} />
            </label>
            <label>
              <span className={rotulo}>{tr("Coluna de data")}</span>
              <input className={`${campo} mt-1`} value={cal.coluna} onChange={(e) => muda({ coluna: e.target.value })} />
            </label>
            <label>
              <span className={rotulo}>{tr("Idioma")}</span>
              <select className={`${campo} mt-1 [&>option]:bg-ink-900`} value={cal.idioma} onChange={(e) => muda({ idioma: e.target.value as "pt" | "en" })}>
                <option value="pt">{tr("Português")}</option>
                <option value="en">{tr("Inglês")}</option>
              </select>
            </label>
          </div>
        </div>

        <div data-tour="forja-intervalo">
          <span className={rotulo}>{tr("Intervalo de datas")}</span>
          <div className="mt-2 flex gap-2">
            {[
              { chave: "fato", texto: tr("Pela tabela de fatos") },
              { chave: "anos", texto: tr("Por anos fixos") },
            ].map((o) => (
              <button
                key={o.chave}
                type="button"
                onClick={() => muda({ origem: o.chave as "fato" | "anos" })}
                className={`flex-1 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                  cal.origem === o.chave ? "border-brand-green/50 bg-brand-green/10 text-white" : "border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                {o.texto}
              </button>
            ))}
          </div>

          {cal.origem === "fato" ? (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label>
                <span className={rotulo}>{tr("Tabela de fatos")}</span>
                <input className={`${campo} mt-1`} value={cal.fatoTabela} onChange={(e) => muda({ fatoTabela: e.target.value })} />
              </label>
              <label>
                <span className={rotulo}>{tr("Coluna de data dela")}</span>
                <input className={`${campo} mt-1`} value={cal.fatoColuna} onChange={(e) => muda({ fatoColuna: e.target.value })} />
              </label>
            </div>
          ) : null}

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label>
              <span className={rotulo}>{tr("De")}</span>
              <input type="number" className={`${campo} mt-1`} value={cal.de} onChange={(e) => muda({ de: Number(e.target.value) || anoAtual })} />
            </label>
            <label>
              <span className={rotulo}>{tr("Até")}</span>
              <input type="number" className={`${campo} mt-1`} value={cal.ate} onChange={(e) => muda({ ate: Number(e.target.value) || anoAtual })} />
            </label>
          </div>
          <p className="mt-1.5 text-[0.7rem] text-slate-500">
            {cal.origem === "fato"
              ? tr("O calendário acompanha a sua tabela de fatos. Os anos acima valem para a lista de feriados.")
              : tr("O calendário vai de 1º de janeiro do primeiro ano a 31 de dezembro do último.")}
          </p>
        </div>

        <div data-tour="forja-fiscal">
          <label>
            <span className={rotulo}>{tr("Ano fiscal começa em")}</span>
            <select
              className={`${campo} mt-1 [&>option]:bg-ink-900`}
              value={cal.inicioAnoFiscal}
              onChange={(e) => muda({ inicioAnoFiscal: Number(e.target.value) })}
            >
              {MESES.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </label>
          {cal.inicioAnoFiscal !== 1 && (
            <p className="mt-1.5 text-[0.7rem] text-brand-teal">
              {tr("Entram as colunas de ano e mês fiscal, e o YTD passa a fechar no mês certo.")}
            </p>
          )}
        </div>

        <div data-tour="forja-feriados">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={cal.feriados}
              onChange={(e) => muda({ feriados: e.target.checked })}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#34e8a0]"
            />
            <span>
              <span className="block text-sm font-medium text-white">{tr("Feriados nacionais")}</span>
              <span className="block text-[0.7rem] text-slate-500">
                {tr("Gera a tabela de feriados com Carnaval, Sexta-feira Santa e Corpus Christi calculados pela Páscoa de cada ano, e uma coluna de dia útil que leva isso em conta.")}
              </span>
            </span>
          </label>
          {cal.feriados && (
            <label className="mt-3 block">
              <span className={rotulo}>{tr("Nome da tabela de feriados")}</span>
              <input className={`${campo} mt-1`} value={cal.tabelaFeriados} onChange={(e) => muda({ tabelaFeriados: e.target.value })} />
            </label>
          )}
        </div>

        <div data-tour="forja-medidas" className="border-t border-white/8 pt-5">
          <h2 className="font-display text-base font-bold text-white">{tr("Medidas de tempo")}</h2>
          <div className="mt-3 grid gap-3">
            <label>
              <span className={rotulo}>{tr("Nome da medida base")}</span>
              <input className={`${campo} mt-1`} value={medidaBase} onChange={(e) => setMedidaBase(e.target.value)} placeholder={tr("Receita")} />
            </label>
            <label>
              <span className={rotulo}>{tr("Expressão dela")} <span className="normal-case tracking-normal text-slate-500">(opcional)</span></span>
              <input className={`${campo} mt-1 font-mono text-[0.8rem]`} value={expressaoBase} onChange={(e) => setExpressaoBase(e.target.value)} placeholder="SUM ( fVendas[Valor] )" />
            </label>
            <label>
              <span className={rotulo}>{tr("Formato sugerido")}</span>
              <input className={`${campo} mt-1`} value={formato} onChange={(e) => setFormato(e.target.value)} />
            </label>
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            {PADROES.map((p) => {
              const marcado = escolhas.includes(p.chave);
              return (
                <button
                  key={p.chave}
                  type="button"
                  onClick={() => setEscolhas((e) => (marcado ? e.filter((x) => x !== p.chave) : [...e, p.chave]))}
                  aria-pressed={marcado}
                  className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                    marcado ? "border-brand-green/45 bg-brand-green/[0.08]" : "border-white/10 hover:border-white/25"
                  }`}
                >
                  <span className={`block text-sm font-medium ${marcado ? "text-white" : "text-slate-300"}`}>{p.nome}</span>
                  <span className="block text-[0.7rem] text-slate-500">{p.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Código */}
      {/* min-w-0 é obrigatório aqui: item de grid nasce com largura mínima
          automática, e sem isso o bloco de código empurra a coluna e faz a
          página inteira rolar de lado no celular. */}
      <div className="min-w-0 lg:sticky lg:top-6">
        <div data-tour="forja-codigo" className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTour(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-brand-green/50 hover:text-brand-green"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          {tr("Tour guiado")}
        </button>
          {blocos.map((b) => (
            <button
              key={b.chave}
              type="button"
              onClick={() => setAba(b.chave)}
              className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
                atual?.chave === b.chave ? "border-brand-green/50 bg-brand-green/[0.10] text-white" : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-white"
              }`}
            >
              {b.nome}
              <span className="ml-2 font-mono text-[0.65rem] text-slate-500">{b.linguagem}</span>
            </button>
          ))}
        </div>

        {atual && (
          <div className="mt-4 overflow-hidden rounded-3xl border border-white/8 bg-[#070d14]">
            <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-2.5">
              <span className="font-mono text-xs text-slate-400">
                {atual.linguagem === "DAX" ? "Modelagem, Nova tabela" : tr("Transformar dados, Editor avançado")}
              </span>
              <Copiar texto={atual.codigo} />
            </div>
            <pre className="max-h-[32rem] overflow-auto px-4 py-4 text-[0.8rem] leading-relaxed">
              <code className="font-mono text-slate-200">{atual.codigo}</code>
            </pre>
          </div>
        )}

        <div className="mt-5 rounded-3xl border border-white/8 bg-white/[0.02] p-5">
          <h2 className="font-display text-base font-bold text-white">{tr("Onde colar, na ordem")}</h2>
          <ol className="mt-3 flex flex-col gap-3">
            {passos.map((p, i) => (
              <li key={i} className="grid grid-cols-[1.5rem_1fr] gap-3">
                <span className="font-mono text-sm tabular-nums text-brand-teal">{i + 1}</span>
                <span className="text-sm leading-relaxed text-slate-300">{p}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <TourForja aberto={tour} aoFechar={() => setTour(false)} />
    </div>
  );
}
