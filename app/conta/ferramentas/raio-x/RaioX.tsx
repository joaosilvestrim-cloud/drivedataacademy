"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { extrairRelatorio } from "@/lib/raiox/extrair";
import { auditar } from "@/lib/raiox/regras";
import { NOME_DIMENSAO, type Achado, type Laudo, type Severidade } from "@/lib/raiox/tipos";
import { salvarLaudo } from "./actions";
import TourRaioX, { tourRaioXJaVisto } from "@/components/raiox/TourRaioX";

/* O Raio-X roda inteiro no navegador.

   Isso não é detalhe técnico, é a promessa da ferramenta: o arquivo do aluno,
   que muitas vezes tem dado de cliente dentro, não sobe para servidor nenhum.
   O que viaja é o laudo. Como efeito colateral, um .pbix de 100 MB é analisado
   em menos de um segundo, sem upload e sem custo por análise. */

const COR: Record<Severidade, { texto: string; fundo: string; borda: string; rotulo: string }> = {
  alta: { texto: "text-red-300", fundo: "bg-red-500/10", borda: "border-red-500/30", rotulo: "Grave" },
  media: { texto: "text-amber-300", fundo: "bg-amber-400/10", borda: "border-amber-400/30", rotulo: "Atenção" },
  baixa: { texto: "text-slate-300", fundo: "bg-white/[0.04]", borda: "border-white/10", rotulo: "Ajuste" },
};

const corDaNota = (n: number) => (n >= 85 ? "text-brand-green" : n >= 65 ? "text-amber-300" : "text-red-300");
const traçoDaNota = (n: number) => (n >= 85 ? "bg-brand-green" : n >= 65 ? "bg-amber-400" : "bg-red-400");

function Anel({ nota }: { nota: number }) {
  const r = 52;
  const volta = 2 * Math.PI * r;
  return (
    <span className="relative grid h-32 w-32 shrink-0 place-items-center">
      <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        <circle
          cx="64" cy="64" r={r} fill="none" strokeWidth="10" strokeLinecap="round"
          stroke={nota >= 85 ? "#34e8a0" : nota >= 65 ? "#fbbf24" : "#f87171"}
          strokeDasharray={volta}
          strokeDashoffset={volta * (1 - nota / 100)}
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute text-center">
        <span className={`block font-display text-3xl font-bold tabular-nums ${corDaNota(nota)}`}>{nota}</span>
        <span className="block text-[0.6rem] uppercase tracking-wider text-slate-500">de 100</span>
      </span>
    </span>
  );
}

function CartaoAchado({ a }: { a: Achado }) {
  const c = COR[a.severidade];
  return (
    <li className={`rounded-2xl border ${c.borda} ${c.fundo} p-4`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border ${c.borda} px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide ${c.texto}`}>{c.rotulo}</span>
        <span className="text-[0.65rem] uppercase tracking-wider text-slate-500">{NOME_DIMENSAO[a.dimensao]}</span>
      </div>
      <p className="mt-2 font-display text-base font-bold text-white">{a.titulo}</p>
      <p className="mt-0.5 font-mono text-[0.75rem] text-slate-400">{a.onde}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">{a.porque}</p>
      <p className="mt-2 flex gap-2 text-sm leading-relaxed text-brand-green">
        <span aria-hidden="true">→</span>
        <span>{a.comoArrumar}</span>
      </p>
    </li>
  );
}

export default function RaioX({ ultimaNota }: { ultimaNota: number | null }) {
  const [laudo, setLaudo] = useState<Laudo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);
  const [guardado, setGuardado] = useState<"salvando" | "ok" | "erro" | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Tour guiado: abre sozinho na primeira visita e fica no botão do canto.
  const [tour, setTour] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => { if (!tourRaioXJaVisto()) setTour(true); }, 700);
    return () => clearTimeout(t);
  }, []);

  async function analisar(file: File) {
    setErro(null);
    setLaudo(null);
    setGuardado(null);
    setLendo(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const relatorio = extrairRelatorio(file.name, bytes);
      const resultado = auditar(relatorio);
      setLaudo(resultado);
      setGuardado("salvando");
      const r = await salvarLaudo(resultado);
      setGuardado(r.ok ? "ok" : "erro");
    } catch (e: any) {
      setErro(e?.message || "Não consegui ler este arquivo.");
    } finally {
      setLendo(false);
    }
  }

  function aoSoltar(e: React.DragEvent) {
    e.preventDefault();
    setArrastando(false);
    const f = e.dataTransfer.files?.[0];
    if (f) analisar(f);
  }

  const evolucao = laudo && ultimaNota != null ? laudo.nota - ultimaNota : null;

  return (
    <div className="mt-8">
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setTour(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-brand-green/50 hover:text-brand-green"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          Tour guiado
        </button>
      </div>

      {/* Entrada */}
      <div
        data-tour="raiox-upload"
        onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
        onDragLeave={() => setArrastando(false)}
        onDrop={aoSoltar}
        className={`rounded-3xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          arrastando ? "border-brand-green/60 bg-brand-green/[0.06]" : "border-white/12 bg-white/[0.02]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pbix,.pbit"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) analisar(f); e.currentTarget.value = ""; }}
        />
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-green to-brand-blue text-ink-900">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <p className="mt-4 font-display text-lg font-bold text-white">
          {lendo ? "Lendo seu relatório..." : "Arraste seu .pbix ou .pbit aqui"}
        </p>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
          O arquivo é lido dentro do seu navegador e não sobe para lugar nenhum. O que fica guardado é só o laudo.
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={lendo}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02] disabled:opacity-50"
        >
          {lendo ? "Analisando..." : "Escolher arquivo"}
        </button>
        <p data-tour="raiox-pbit" className="mt-3 text-xs text-slate-500">
          Quer o laudo do modelo e do DAX também? No Power BI: Arquivo, Exportar, Modelo do Power BI (.pbit). O template vai sem dados.
        </p>
      </div>

      {erro && (
        <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{erro}</p>
      )}

      {laudo && (
        <div className="mt-8">
          {/* Nota */}
          <div data-tour="raiox-nota" className="flex flex-col gap-6 rounded-3xl border border-white/8 bg-white/[0.02] p-6 sm:flex-row sm:items-center">
            <Anel nota={laudo.nota} />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs text-slate-400">{laudo.arquivo}</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-white">
                {laudo.nota >= 85 ? "Relatório bem resolvido" : laudo.nota >= 65 ? "Tem base, falta acabamento" : "Dá para ganhar muito aqui"}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {laudo.resumo.paginas} páginas · {laudo.resumo.visuais} visuais
                {laudo.resumo.tabelas > 0 && ` · ${laudo.resumo.tabelas} tabelas`}
                {laudo.resumo.medidas > 0 && ` · ${laudo.resumo.medidas} medidas`}
                {" · "}{laudo.achados.length} {laudo.achados.length === 1 ? "achado" : "achados"}
              </p>
              {evolucao != null && evolucao !== 0 && (
                <p className={`mt-2 text-sm font-semibold ${evolucao > 0 ? "text-brand-green" : "text-amber-300"}`}>
                  {evolucao > 0 ? `+${evolucao} pontos` : `${evolucao} pontos`} em relação ao seu último laudo.
                </p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                {guardado === "salvando" && "Guardando no seu histórico..."}
                {guardado === "ok" && "Guardado no seu histórico e registrado no seu universo."}
                {guardado === "erro" && "O laudo está aqui, mas não consegui guardar no histórico."}
              </p>
            </div>
          </div>

          {/* Notas por dimensão */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {laudo.notas.map((n) => (
              <div key={n.dimensao} className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <p className="text-[0.65rem] uppercase tracking-wider text-slate-500">{NOME_DIMENSAO[n.dimensao]}</p>
                {/* Sem matéria-prima não existe nota: mostrar 100 no modelo de um
                    .pbix seria elogiar o que nem foi olhado. */}
                <p className={`mt-1 font-display text-2xl font-bold tabular-nums ${n.completa ? corDaNota(n.nota) : "text-slate-600"}`}>
                  {n.completa ? n.nota : "—"}
                </p>
                <span className="mt-2 block h-1 w-full overflow-hidden rounded-full bg-white/8">
                  <span className={`block h-full rounded-full ${n.completa ? traçoDaNota(n.nota) : "bg-white/10"}`} style={{ width: `${n.completa ? n.nota : 0}%` }} />
                </span>
                <p className="mt-2 text-[0.7rem] text-slate-500">
                  {n.completa ? `${n.achados} ${n.achados === 1 ? "achado" : "achados"}` : "parcial, precisa do .pbit"}
                </p>
              </div>
            ))}
          </div>

          {laudo.parcial && (
            <p className="mt-4 rounded-2xl border border-brand-blue/25 bg-brand-blue/[0.07] px-4 py-3 text-sm text-slate-300">
              Este laudo olhou o relatório: páginas, visuais e organização. O modelo e o DAX moram em uma parte do
              <span className="font-mono"> .pbix </span> que vem compactada e não dá para ler. Exporte o mesmo arquivo como
              <b className="text-white"> .pbit</b> e o Raio-X passa a auditar relacionamentos, colunas calculadas e cada medida.
            </p>
          )}

          {/* Achados */}
          {laudo.achados.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-brand-green/25 bg-brand-green/[0.06] px-5 py-8 text-center text-sm text-slate-200">
              Nenhum achado. O relatório passou por todas as regras do Raio-X.
            </p>
          ) : (
            <>
              <h3 className="mt-8 font-display text-lg font-bold text-white">O que encontrei</h3>
              <ul data-tour="raiox-achados" className="mt-3 grid gap-3 lg:grid-cols-2">
                {laudo.achados.map((a, i) => <CartaoAchado key={`${a.regra}-${i}`} a={a} />)}
              </ul>
            </>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-brand-green/50 hover:text-brand-green"
            >
              Analisar outro arquivo
            </button>
            <Link
              href="/conta/comunidade/power-bi"
              className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-brand-teal/50 hover:text-brand-teal"
            >
              Levar uma dúvida para a comunidade
            </Link>
          </div>
        </div>
      )}

      <TourRaioX aberto={tour} aoFechar={() => setTour(false)} />
    </div>
  );
}
