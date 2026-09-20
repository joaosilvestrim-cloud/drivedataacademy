"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";


import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DICIONARIO, gerarBase } from "@/lib/arena/gerador";
import { FAMILIAS, type Desafio } from "@/lib/arena/familias";
import { corrigir, rodar, type Banco, type Resultado, type Veredito } from "@/lib/arena/motor";
import TourArena, { tourArenaJaVisto } from "@/components/arena/TourArena";

/* A Arena roda inteira no navegador.

   O banco é um SQLite de verdade compilado para WebAssembly, o mesmo que o
   DataFlow Lab já usa. Isso muda o que dá para prometer: a consulta do aluno é
   executada de fato, o resultado é comparado com o da referência na mesma base,
   e o veredito sai em milissegundos. Sem servidor, sem custo por tentativa e
   sem ninguém corrigindo nada.

   A base é sorteada a partir de uma semente presa ao aluno. A dele não é a do
   colega, então resposta copiada não fecha. */

const NIVEL: Record<Desafio["nivel"], string> = {
  iniciante: "text-brand-green border-brand-green/40 bg-brand-green/10",
  "intermediário": "text-amber-300 border-amber-400/40 bg-amber-400/10",
  "avançado": "text-red-300 border-red-500/40 bg-red-500/10",
};

const CHAVE_PROGRESSO = "arena:acertos:v1";

async function carregarSqlJs(): Promise<any> {
  const janela = window as any;
  if (!janela.initSqlJs) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "/vendor/sqljs/sql-wasm.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Não consegui carregar o banco de dados do navegador."));
      document.head.appendChild(s);
    });
  }
  return janela.initSqlJs({ locateFile: (nome: string) => `/vendor/sqljs/${nome}` });
}

function Tabela({ dados, limite = 12 }: { dados: Resultado; limite?: number }) {
  const tr = usarTraducao();
  if (!dados.linhas.length) {
    return <p className="px-4 py-6 text-sm text-slate-500">{tr("A consulta rodou, mas não devolveu nenhuma linha.")}</p>;
  }
  return (
    <div className="overflow-auto">
      <table className="w-full min-w-[30rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-white/10">
            {dados.colunas.map((c, i) => (
              <th key={i} className="whitespace-nowrap px-3 py-2 font-mono text-[0.7rem] uppercase tracking-wide text-slate-400">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.linhas.slice(0, limite).map((linha, i) => (
            <tr key={i} className="border-b border-white/[0.04]">
              {linha.map((v, j) => (
                <td key={j} className={`whitespace-nowrap px-3 py-1.5 ${typeof v === "number" ? "font-mono tabular-nums text-slate-200" : "text-slate-300"}`}>
                  {v === null ? <span className="text-slate-600">{tr("vazio")}</span> : String(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {dados.linhas.length > limite && (
        <p className="px-3 py-2 text-xs text-slate-500">{tr("e mais")} {dados.linhas.length - limite} linhas</p>
      )}
    </div>
  );
}

export default function Arena({ semente }: { semente: number }) {
  const tr = usarTraducao();
  const [banco, setBanco] = useState<Banco | null>(null);
  const [erroBanco, setErroBanco] = useState<string | null>(null);
  const [rodada, setRodada] = useState(0);
  const [indice, setIndice] = useState(0);
  const [consulta, setConsulta] = useState("");
  const [veredito, setVeredito] = useState<Veredito | null>(null);
  const [dica, setDica] = useState(false);
  const [acertos, setAcertos] = useState<string[]>([]);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Tour guiado: abre sozinho na primeira visita e fica no botão do cabeçalho.
  const [tour, setTour] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => { if (!tourArenaJaVisto()) setTour(true); }, 700);
    return () => clearTimeout(t);
  }, []);

  const base = useMemo(() => gerarBase(semente + rodada * 977), [semente, rodada]);
  const desafio = useMemo(() => FAMILIAS[indice].montar(base), [indice, base]);

  // Progresso fica no navegador: a Arena não depende de tabela nova para funcionar.
  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_PROGRESSO) || "[]");
      if (Array.isArray(salvo)) setAcertos(salvo);
    } catch {
      /* sem progresso salvo, começa do zero */
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const SQL = await carregarSqlJs();
        if (!vivo) return;
        const db = new SQL.Database();
        db.run(base.sql);
        // Fecha o banco anterior antes de trocar: "nova base" várias vezes
        // deixaria um SQLite pendurado na memória a cada rodada.
        setBanco((antigo: any) => { try { antigo?.close?.(); } catch { /* já fechado */ } return db as Banco; });
      } catch (e: any) {
        setErroBanco(e?.message || tr("Não consegui abrir o banco no navegador."));
      }
    })();
    return () => { vivo = false; };
  }, [base]);

  useEffect(() => {
    setVeredito(null);
    setDica(false);
    setConsulta("");
  }, [indice, rodada]);

  const executar = useCallback(() => {
    if (!banco) return;
    const v = corrigir(banco, desafio, consulta);
    setVeredito(v);
    if (v.certo && !acertos.includes(desafio.id)) {
      const novo = [...acertos, desafio.id];
      setAcertos(novo);
      try { localStorage.setItem(CHAVE_PROGRESSO, JSON.stringify(novo)); } catch { /* sem drama */ }
    }
  }, [banco, desafio, consulta, acertos]);

  const espiar = () => {
    if (!banco) return;
    setVeredito({
      certo: false,
      titulo: "Resposta esperada",
      detalhe: tr("Olhar o gabarito não conta ponto. Feche, escreva do seu jeito e rode de novo: o que fixa é escrever."),
      diagnosticado: true,
      resultado: null,
      esperado: rodar(banco, desafio.referencia),
    });
  };

  const feitos = FAMILIAS.filter((f) => acertos.includes(f.id)).length;

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_20rem] xl:items-start">
      <div>
        {/* Desafios */}
        <div data-tour="arena-desafios" className="flex flex-wrap items-center gap-2">
          {FAMILIAS.map((f, i) => {
            const feito = acertos.includes(f.id);
            const atual = i === indice;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setIndice(i)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                  atual ? "border-brand-green/50 bg-brand-green/[0.10] text-white" : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-white"
                }`}
              >
                {feito ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="text-brand-green"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                ) : (
                  <span className="font-mono text-[0.7rem] text-slate-500">{i + 1}</span>
                )}
                {f.assunto}
              </button>
            );
          })}
        </div>

        {/* Enunciado */}
        <div data-tour="arena-enunciado" className="mt-4 rounded-3xl border border-white/8 bg-white/[0.02] p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide ${NIVEL[desafio.nivel]}`}>{desafio.nivel}</span>
            <span className="text-[0.7rem] uppercase tracking-wider text-slate-500">{desafio.assunto}</span>
          </div>
          <h2 className="mt-2 font-display text-xl font-bold text-white">{desafio.titulo}</h2>
          <p className="mt-3 whitespace-pre-line text-[0.95rem] leading-relaxed text-slate-300">{desafio.enunciado}</p>

          {dica ? (
            <p className="mt-4 rounded-2xl border border-brand-teal/25 bg-brand-teal/[0.07] px-4 py-3 text-sm text-slate-200">{desafio.dica}</p>
          ) : (
            <button type="button" onClick={() => setDica(true)} className="mt-4 text-sm font-medium text-brand-teal underline-offset-4 hover:underline">
              {tr("Travei, me dá uma pista")}
            </button>
          )}
        </div>

        {/* Editor */}
        <div data-tour="arena-editor" className="mt-4 overflow-hidden rounded-3xl border border-white/8 bg-[#070d14]">
          <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-2.5">
            <span className="font-mono text-xs text-slate-400">consulta.sql</span>
            <span className="text-[0.7rem] text-slate-500">{tr("Ctrl + Enter executa")}</span>
          </div>
          <textarea
            ref={editorRef}
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); executar(); } }}
            spellCheck={false}
            rows={10}
            placeholder={"SELECT ...\nFROM pedidos p\nJOIN itens i ON i.pedido_id = p.id"}
            className="w-full resize-y bg-transparent px-4 py-4 font-mono text-[0.85rem] leading-relaxed text-slate-100 outline-none placeholder:text-slate-700"
          />
          <div data-tour="arena-executar" className="flex flex-wrap items-center gap-2 border-t border-white/8 px-4 py-3">
            <button
              type="button"
              onClick={executar}
              disabled={!banco}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {banco ? "Executar e corrigir" : tr("Abrindo o banco...")}
            </button>
            <button type="button" onClick={() => setConsulta("")} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition-colors hover:border-white/30 hover:text-white">
              {tr("Limpar")}
            </button>
            <button type="button" onClick={espiar} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-400 transition-colors hover:border-white/30 hover:text-white">
              {tr("Ver a resposta esperada")}
            </button>
          </div>
        </div>

        {erroBanco && <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{erroBanco}</p>}

        {/* Veredito */}
        {veredito && (
          <div className={`mt-4 rounded-3xl border p-5 ${veredito.certo ? "border-brand-green/40 bg-brand-green/[0.07]" : veredito.diagnosticado ? "border-amber-400/35 bg-amber-400/[0.06]" : "border-white/10 bg-white/[0.02]"}`}>
            <p className={`font-display text-lg font-bold ${veredito.certo ? "text-brand-green" : "text-white"}`}>{veredito.titulo}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">{veredito.detalhe}</p>

            {veredito.resultado && (
              <div className="mt-4">
                <p className="text-[0.7rem] uppercase tracking-wider text-slate-500">{tr("O que a sua consulta devolveu")}</p>
                <div className="mt-2 overflow-hidden rounded-2xl border border-white/8 bg-[#070d14]">
                  <Tabela dados={veredito.resultado} />
                </div>
              </div>
            )}

            {!veredito.certo && veredito.esperado && (
              <details className="mt-4" open={veredito.titulo === "Resposta esperada"}>
                <summary className="cursor-pointer text-sm font-medium text-slate-400 hover:text-white">{tr("Comparar com o esperado")}</summary>
                <div className="mt-2 overflow-hidden rounded-2xl border border-white/8 bg-[#070d14]">
                  <Tabela dados={veredito.esperado} />
                </div>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Coluna de apoio */}
      <div className="flex flex-col gap-4 xl:sticky xl:top-6">
        <div data-tour="arena-progresso" className="rounded-3xl border border-white/8 bg-white/[0.02] p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[0.7rem] uppercase tracking-wider text-slate-500">{tr("Resolvidos")}</p>
              <p className="font-display text-2xl font-bold text-white">
                {feitos}<span className="text-base text-slate-500">/{FAMILIAS.length}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRodada((r) => r + 1)}
              title={tr("Gera uma base nova, com outros números")}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-brand-green/50 hover:text-brand-green"
            >
              {tr("Nova base")}
            </button>
          </div>
          <span className="mt-3 block h-1 w-full overflow-hidden rounded-full bg-white/8">
            <span className="block h-full rounded-full bg-gradient-to-r from-brand-green to-brand-teal" style={{ width: `${(feitos / FAMILIAS.length) * 100}%` }} />
          </span>
          <p className="mt-3 text-xs text-slate-500">
            {tr("A sua base tem")} {base.tabelas.reduce((s, t) => s + t.linhas.length, 0).toLocaleString("pt-BR")} {tr("linhas e foi sorteada só para você. A resposta do colega não fecha na sua.")}
          </p>
        </div>

        <div data-tour="arena-dicionario" className="rounded-3xl border border-white/8 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-base font-bold text-white">{tr("As tabelas")}</p>
        <button
          type="button"
          onClick={() => setTour(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-brand-green/50 hover:text-brand-green"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          {tr("Tour guiado")}
        </button>
          </div>
          <div className="mt-3 flex flex-col gap-4">
            {DICIONARIO.map((t) => (
              <div key={t.tabela}>
                <p className="font-mono text-sm text-brand-teal">{t.tabela}</p>
                <p className="text-[0.7rem] text-slate-500">{t.descricao}</p>
                <ul className="mt-1.5 flex flex-col gap-0.5">
                  {t.colunas.map((c) => (
                    <li key={c.nome} className="text-[0.75rem] leading-snug">
                      <span className="font-mono text-slate-300">{c.nome}</span>
                      <span className="text-slate-600"> · {c.tipo}</span>
                      {c.nota && <span className="block pl-2 text-[0.7rem] text-amber-300/70">{c.nota}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <TourArena aberto={tour} aoFechar={() => setTour(false)} />
    </div>
  );
}
