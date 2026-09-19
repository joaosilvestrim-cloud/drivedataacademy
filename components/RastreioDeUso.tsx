"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { acessoDoEndereco, ehAreaLogada } from "@/lib/uso";

/* Avisa o servidor quando o aluno abre uma ferramenta ou um curso.

   Fica no layout raiz para cobrir as ferramentas que vivem fora da área do
   aluno (DataFlow Lab, Decision Lab, visuais, universo). O filtro roda aqui
   antes, então página que não conta não gera requisição nenhuma. */
export default function RastreioDeUso() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || (!acessoDoEndereco(pathname) && !ehAreaLogada(pathname))) return;
    const corpo = JSON.stringify({ pathname });
    try {
      if (navigator.sendBeacon) navigator.sendBeacon("/api/acesso", new Blob([corpo], { type: "application/json" }));
      else fetch("/api/acesso", { method: "POST", body: corpo, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    } catch {
      // Contar uso nunca pode atrapalhar a navegação.
    }
  }, [pathname]);

  return null;
}
