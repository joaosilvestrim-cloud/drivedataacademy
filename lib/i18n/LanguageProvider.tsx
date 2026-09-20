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

export function LanguageProvider({ children, inicial }: { children: React.ReactNode; inicial?: Lang }) {
  // O servidor já leu o cookie e mandou o idioma: começar por ele evita a
  // tela nascer em português e trocar depois.
  const [lang, setLangState] = useState<Lang>(inicial ?? DEFAULT_LANG);

  // Depois de trocar o idioma, o servidor reenvia a página (router.refresh) e
  // este `inicial` chega diferente. Acertar o estado aqui, durante o render,
  // e não num efeito: assim os filhos já nascem no idioma novo, em vez de
  // aparecerem em português por um quadro.
  const [inicialAnterior, setInicialAnterior] = useState(inicial);
  if (inicial && inicial !== inicialAnterior) {
    setInicialAnterior(inicial);
    setLangState(inicial);
  }

  useEffect(() => {
    if (inicial) return; // veio do servidor, não precisa perguntar ao navegador
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
