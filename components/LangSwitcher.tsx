"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";

import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LANGS, LANG_LABEL } from "@/lib/i18n/dictionaries";
import Bandeira from "@/components/i18n/Bandeira";

export default function LangSwitcher({ className = "" }: { className?: string }) {
  const tr = usarTraducao();
  const { lang, setLang } = useI18n();

  return (
    <div
      className={`flex items-center gap-0.5 rounded-full border border-white/10 bg-white/5 p-0.5 ${className}`}
      role="group"
      aria-label={tr("Idioma")}
    >
      {LANGS.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          aria-label={LANG_LABEL[l]}
          title={LANG_LABEL[l]}
          className={`rounded-full p-1 transition-all ${
            lang === l ? "bg-white/15 ring-1 ring-white/30" : "opacity-55 hover:opacity-100"
          }`}
        >
          <Bandeira idioma={l} tamanho={20} />
        </button>
      ))}
    </div>
  );
}
