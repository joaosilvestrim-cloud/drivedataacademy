"use client";

import { useCallback } from "react";
import { useI18n } from "./LanguageProvider";
import { frase } from "./frases";

/* O mesmo tr() das telas de servidor, para componente de navegador.

   Uso: const tr = usarTraducao(); ... {tr("Buscar")}

   Por que um hook e não um valor de módulo: o componente de navegador também
   é renderizado no servidor, e lá o módulo é compartilhado entre todas as
   requisições. Duas pessoas em idiomas diferentes no mesmo instante
   receberiam o texto uma da outra. O hook lê do contexto, que é por render. */
export function usarTraducao() {
  const { lang } = useI18n();
  // Estável enquanto o idioma não muda: a função entra em dependência de
  // useMemo em algumas telas, e uma função nova por render refaria a conta.
  return useCallback((texto: string) => frase(texto, lang), [lang]);
}
