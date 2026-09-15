"use client";

import { useEffect, useState } from "react";

/* Diz se o item Assinatura do menu público está liberado. Começa como "em
   breve" para nunca aparecer clicável antes da resposta, e guarda o valor
   na sessão da aba para cabeçalho e rodapé não consultarem duas vezes. */

let cache: boolean | null = null;
let pendente: Promise<boolean> | null = null;

function buscar(): Promise<boolean> {
  if (cache !== null) return Promise.resolve(cache);
  if (!pendente) {
    pendente = fetch("/api/menu")
      .then((r) => (r.ok ? r.json() : { assinaturaAberta: false }))
      .then((j) => (cache = !!j.assinaturaAberta))
      .catch(() => false)
      .finally(() => { pendente = null; });
  }
  return pendente;
}

export function useAssinaturaAberta(): boolean {
  const [aberta, setAberta] = useState<boolean>(cache ?? false);
  useEffect(() => {
    let vivo = true;
    buscar().then((v) => { if (vivo) setAberta(v); });
    return () => { vivo = false; };
  }, []);
  return aberta;
}
