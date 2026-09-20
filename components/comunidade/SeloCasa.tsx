"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";

import { Coroa, Escudo } from "@/components/ranking/MedalAvatar";

/* Selo de quem é da casa, ao lado do nome. Anda junto com a moldura dourada
   do avatar: a moldura chama o olho, o selo diz o porquê. */
export default function SeloCasa({ label, className = "" }: { label?: string | null; className?: string }) {
  const tr = usarTraducao();
  if (!label) return null;
  if (label === "Oficial") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border border-[#7cc4ff]/50 bg-gradient-to-r from-[#3b9dff]/20 to-[#a78bfa]/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-[#9fd3ff] ${className}`}
        title={tr("Conta oficial da DriveData Academy")}
      >
        <Escudo size={9} />
        {tr("Oficial")}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-[#f6d68c]/45 bg-gradient-to-r from-[#f6d68c]/18 to-brand-green/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-[#f6d68c] ${className}`}
      title={`${label} da DriveData Academy`}
    >
      <Coroa size={9} />
      {label}
    </span>
  );
}
