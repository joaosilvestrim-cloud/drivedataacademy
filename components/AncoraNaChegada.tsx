"use client";

import { useEffect } from "react";

/* Leva a página até a âncora quando ela chega pela URL.

   Vindo de /cursos, o link do cabeçalho agora aponta para /#metodo. O endereço
   troca, mas a rolagem ficava no topo: a home monta seções pesadas e o salto
   automático do navegador acontece antes do layout final, então ele mira numa
   posição que deixa de existir.

   Este efeito refaz o salto depois que a página assentou. Roda uma vez, só
   quando existe âncora, e respeita quem pediu menos movimento no sistema. */

export default function AncoraNaChegada() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.replace("#", "")).trim();
    if (!id) return;

    const menosMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let tentativas = 0;

    // Duas passadas bastam na prática: uma assim que o elemento aparece e outra
    // depois que fontes e imagens terminam de empurrar o conteúdo.
    const mirar = () => {
      const alvo = document.getElementById(id);
      if (alvo) {
        alvo.scrollIntoView({ behavior: menosMovimento ? "auto" : "smooth", block: "start" });
        return true;
      }
      return false;
    };

    const timer = window.setInterval(() => {
      tentativas += 1;
      if (mirar() || tentativas > 12) window.clearInterval(timer);
    }, 120);

    return () => window.clearInterval(timer);
  }, []);

  return null;
}
