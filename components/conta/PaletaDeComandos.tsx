"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { textos } from "@/lib/i18n/textos";
import { IDIOMA_PADRAO, type Idioma } from "@/lib/i18n/idioma";

/* Busca rápida do aluno: Ctrl+K (ou Cmd+K) abre, digita, Enter vai.

   Com quase vinte telas, procurar no menu com o mouse é o caminho lento.
   Aqui a pessoa digita "certificado", "protheus" ou "portfólio" e chega em uma
   tecla. A lista é a mesma do menu, mais alguns apelidos do dia a dia. */

export type Destino = { label: string; href: string; grupo: string; busca?: string };

const semAcento = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export default function PaletaDeComandos({ destinos, idioma = IDIOMA_PADRAO }: { destinos: Destino[]; idioma?: Idioma }) {
  const tr = usarTraducao();
  const t = textos(idioma);
  const [aberta, setAberta] = useState(false);
  const [busca, setBusca] = useState("");
  const [marcado, setMarcado] = useState(0);
  const campo = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const emCampo = ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setAberta((v) => !v); }
      if (e.key === "Escape") setAberta(false);
      // A barra abre a busca também, como no Gmail, mas nunca enquanto se digita.
      if (e.key === "/" && !emCampo && !aberta) { e.preventDefault(); setAberta(true); }
    };
    window.addEventListener("keydown", tecla);
    const abrirPorBotao = () => setAberta(true);
    window.addEventListener("abrir-paleta", abrirPorBotao);
    return () => { window.removeEventListener("keydown", tecla); window.removeEventListener("abrir-paleta", abrirPorBotao); };
  }, [aberta]);

  useEffect(() => {
    if (aberta) { setBusca(""); setMarcado(0); setTimeout(() => campo.current?.focus(), 30); }
    document.body.style.overflow = aberta ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [aberta]);

  const achados = useMemo(() => {
    const q = semAcento(busca.trim());
    if (!q) return destinos.slice(0, 8);
    return destinos.filter((d) => semAcento(`${d.label} ${d.grupo} ${d.busca ?? ""}`).includes(q)).slice(0, 10);
  }, [busca, destinos]);

  function ir(d: Destino) {
    setAberta(false);
    router.push(d.href);
  }

  if (!aberta) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/70 p-4 pt-[12vh] backdrop-blur-sm" onClick={() => setAberta(false)}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-2xl" role="dialog" aria-modal="true" aria-label={t.menu.buscarTela}>
        <div className="flex items-center gap-2 border-b border-white/8 px-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-slate-500">
            <path d="M21 21l-4.3-4.3M11 19a8 8 0 100-16 8 8 0 000 16z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            ref={campo}
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setMarcado(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setMarcado((m) => Math.min(achados.length - 1, m + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setMarcado((m) => Math.max(0, m - 1)); }
              if (e.key === "Enter" && achados[marcado]) ir(achados[marcado]);
            }}
            placeholder={t.menu.paleta.titulo}
            aria-label={t.menu.buscarTela}
            className="w-full bg-transparent py-3.5 text-sm text-white placeholder:text-slate-500 outline-none"
          />
          <kbd className="rounded border border-white/10 px-1.5 text-[0.65rem] text-slate-500">esc</kbd>
        </div>

        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {achados.map((d, i) => (
            <li key={d.href}>
              <button
                onMouseEnter={() => setMarcado(i)}
                onClick={() => ir(d)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${i === marcado ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"}`}
              >
                <span className="min-w-0 flex-1 truncate">{d.label}</span>
                <span className="shrink-0 text-[0.68rem] text-slate-500">{d.grupo}</span>
                {i === marcado && <span className="shrink-0 text-[0.65rem] text-slate-500">{tr("enter")}</span>}
              </button>
            </li>
          ))}
          {!achados.length && <li className="px-3 py-6 text-center text-sm text-slate-500">{t.menu.paleta.vazio}</li>}
        </ul>
      </div>
    </div>
  );
}
