"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";

import { Coroa, Escudo, Insignia } from "@/components/ranking/MedalAvatar";

/* Selo de quem é da casa, ao lado do nome. Anda junto com a moldura dourada
   do avatar: a moldura chama o olho, o selo diz o porquê. */
export default function SeloCasa({ label, className = "" }: { label?: string | null; className?: string }) {
  const tr = usarTraducao();
  if (!label) return null;
  if (label === "Oficial") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border border-sky-400/50 bg-gradient-to-r from-sky-500/20 to-violet-400/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-sky-300 ${className}`}
        title={tr("Conta oficial da DriveData Academy")}
      >
        <Escudo size={9} />
        {tr("Oficial")}
      </span>
    );
  }
  if (label === "Equipe") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border border-teal-300/50 bg-gradient-to-r from-brand-green/20 to-teal-300/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-teal-300 ${className}`}
        title={tr("Equipe da DriveData Academy")}
      >
        <Insignia size={9} />
        {tr("Equipe")}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-amber-300/45 bg-gradient-to-r from-amber-300/18 to-brand-green/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-amber-300 ${className}`}
      title={`${label} da DriveData Academy`}
    >
      <Coroa size={9} />
      {label}
    </span>
  );
}
