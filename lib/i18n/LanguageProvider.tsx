"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { dict, DEFAULT_LANG, LANGS, type Lang } from "./dictionaries";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (typeof dict)[Lang];
};

const LanguageContext = createContext<Ctx>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: dict[DEFAULT_LANG],
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("lang") as Lang | null;
      if (saved && (LANGS as readonly string[]).includes(saved)) {
        setLangState(saved);
        document.documentElement.lang = saved === "pt" ? "pt-BR" : saved;
      }
    } catch {
      /* noop */
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("lang", l);
      document.cookie = `lang=${l};path=/;max-age=31536000`;
      document.documentElement.lang = l === "pt" ? "pt-BR" : l;
    } catch {
      /* noop */
    }
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: dict[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useI18n = () => useContext(LanguageContext);
export const useT = () => useContext(LanguageContext).t;
