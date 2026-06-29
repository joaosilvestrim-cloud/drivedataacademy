"use client";

import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LANGS, LANG_LABEL } from "@/lib/i18n/dictionaries";

export default function LangSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();

  return (
    <div
      className={`flex items-center gap-0.5 rounded-full border border-white/10 bg-white/5 p-0.5 ${className}`}
      role="group"
      aria-label="Idioma"
    >
      {LANGS.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
            lang === l
              ? "bg-gradient-to-r from-brand-green to-brand-blue text-ink-900"
              : "text-slate-400 hover:text-white"
          }`}
        >
          {LANG_LABEL[l]}
        </button>
      ))}
    </div>
  );
}
