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
        className={`inline-flex items-center gap-1 rounded-full bg-marca-azul px-2 py-0.5 text-[0.65rem] font-semibold text-white ${className}`}
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
        className={`inline-flex items-center gap-1 rounded-full bg-marca-verde px-2 py-0.5 text-[0.65rem] font-semibold text-sobre-acento ${className}`}
        title={tr("Equipe da DriveData Academy")}
      >
        <Insignia size={9} />
        {tr("Equipe")}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-300 ${className}`}
      title={`${label} da DriveData Academy`}
    >
      <Coroa size={9} />
      {label}
    </span>
  );
}
