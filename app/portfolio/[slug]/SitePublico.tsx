"use client";

import { useCallback, useEffect, useState } from "react";
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
  // O site entra com um fade quando termina de carregar, em vez de piscar branco.
  const [carregou, setCarregou] = useState(false);
  /* Rede de segurança do fade-in: o srcdoc pode terminar de carregar antes de
     o React ligar o onLoad, e aí o evento se perde e o site ficava invisível
     para sempre. Depois de um instante ele aparece de qualquer jeito. */
  useEffect(() => {
    const t = setTimeout(() => setCarregou(true), 900);
    return () => clearTimeout(t);
  }, []);

  /* O site do aluno tem um botão "Explorar meu Universo 4D" que aponta para
     esta mesma página com #universo, em target="_top". Como só o fragmento
     muda, o navegador não recarrega: dispara hashchange, e é aqui que a
     constelação abre. Também abre quando alguém chega pelo link direto. */
  useEffect(() => {
    if (!mostrarUniverso) return;
    const conferir = () => { if (window.location.hash === "#universo") setUniverso(true); };
    conferir();
    window.addEventListener("hashchange", conferir);
    return () => window.removeEventListener("hashchange", conferir);
  }, [mostrarUniverso]);

  // Fechar limpa o #universo, senão o mesmo botão não dispararia de novo.
  const fechar = useCallback(() => {
    setUniverso(false);
    if (window.location.hash === "#universo") history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

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
        onLoad={() => setCarregou(true)}
        className={`min-h-0 w-full flex-1 border-0 transition-opacity duration-500 motion-reduce:transition-none ${carregou ? "opacity-100" : "opacity-0"}`}
      />

      {universo && <UniversoPublico slug={slug} nome={nome} aoFechar={fechar} />}
    </div>
  );
}
