"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";
import { NOME_DO_IDIOMA } from "@/lib/i18n/idioma";
import Bandeira from "@/components/i18n/Bandeira";
import type { Idioma } from "@/lib/i18n/idioma";

/* Dica de legenda, logo abaixo do player.

   O seletor de idioma do Panda mora dentro da engrenagem, e ninguém acha
   sozinho: o João precisou caçar. Em vez de esperar o aluno descobrir, a aula
   diz onde fica e em que idiomas existe.

   Some quando a aula não tem legenda, então nunca promete o que não tem. */
export default function AvisoLegendas({ idiomas }: { idiomas?: string[] | null }) {
  const tr = usarTraducao();
  const lista = (idiomas ?? []).filter((i) => i in NOME_DO_IDIOMA) as Idioma[];
  if (lista.length === 0) return null;

  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-l-2 border-brand-green/50 py-1 pl-4 text-xs leading-relaxed text-slate-400">
      <span
        aria-hidden="true"
        className="grid h-[1.15rem] w-7 shrink-0 place-items-center rounded-[3px] border border-slate-500 font-mono text-[0.58rem] font-bold tracking-tight text-slate-300"
      >
        CC
      </span>
      <span className="min-w-0">
        {tr("Esta aula tem legenda. No player, clique na engrenagem, abra Legendas e escolha o idioma.")}
      </span>
      <span className="flex items-center gap-3">
        {lista.map((i) => (
          <span key={i} className="inline-flex items-center gap-1.5 whitespace-nowrap text-slate-300">
            <Bandeira idioma={i} tamanho={14} />
            {NOME_DO_IDIOMA[i]}
          </span>
        ))}
      </span>
    </p>
  );
}
