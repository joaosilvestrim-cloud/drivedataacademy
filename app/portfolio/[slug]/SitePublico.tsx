"use client";

import { useCallback, useState } from "react";
import UniversoPublico from "@/components/knowledge/UniversoPublico";

/* A página pública do portfólio: a faixa da Academy em cima, o site do aluno
   embaixo.

   O site roda num iframe com sandbox e SEM allow-same-origin. É isso que o
   isola: ele ganha uma origem opaca e não enxerga cookie, localStorage nem a
   sessão de quem visita. Tirar essa proteção para "consertar" algum site que
   não funcionou reabre a porta para sequestro de conta de qualquer visitante
   logado na Academy.

   O que o sandbox libera, e por quê:
   - allow-scripts: animação e interação do site;
   - allow-popups e allow-popups-to-escape-sandbox: link para o LinkedIn abre
     numa aba normal, fora do isolamento;
   - allow-top-navigation-by-user-activation: link sem target="_blank" leva a
     aba inteira, mas só depois de um clique de verdade, nunca sozinho.
   Não libera allow-forms: formulário no site do aluno não envia nada. */
export default function SitePublico({
  html,
  nome,
  slug,
  mostrarUniverso,
}: {
  html: string;
  nome: string;
  slug: string;
  mostrarUniverso: boolean;
}) {
  const [universo, setUniverso] = useState(false);
  const fechar = useCallback(() => setUniverso(false), []);

  return (
    <div className="flex h-[100dvh] flex-col bg-[#050b18]">
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 text-white">
        <a href="/" className="flex min-w-0 items-center gap-2.5" title="DriveData Academy">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="DriveData Academy" className="h-6 w-auto shrink-0" />
          <span className="hidden truncate text-xs text-slate-400 sm:inline">Portfólio de {nome}</span>
        </a>
        {mostrarUniverso && (
          <button
            onClick={() => setUniverso(true)}
            className="shrink-0 rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-3 py-1.5 text-xs font-semibold text-ink-900 sm:text-sm"
          >
            Ver universo de competências 4D
          </button>
        )}
      </div>

      <iframe
        title={`Portfólio de ${nome}`}
        srcDoc={html}
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
        referrerPolicy="no-referrer"
        className="min-h-0 w-full flex-1 border-0 bg-white"
      />

      {universo && <UniversoPublico slug={slug} nome={nome} aoFechar={fechar} />}
    </div>
  );
}
