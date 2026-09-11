"use client";

import Link from "next/link";
import { useEffect } from "react";

// Fronteira de erro global. Antes qualquer falha caía na tela padrão do Next,
// sem marca e sem caminho de volta.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // O digest é o que permite localizar esta ocorrência no log do servidor.
    console.error("[academy] erro não tratado", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-6 py-20">
      <p className="font-mono text-meta uppercase text-ds-attention">Algo saiu do lugar</p>
      <h1 className="mt-3 font-display text-title font-semibold text-ds-text">
        Não conseguimos carregar esta página
      </h1>
      <p className="mt-3 text-body text-ds-text-2">
        A falha foi do nosso lado, não do seu. Tente de novo em alguns instantes.
        Nada do que você já fez foi perdido.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          onClick={reset}
          className="rounded-ctl bg-ds-accent px-5 py-2.5 text-label font-medium text-ds-accent-ink transition-colors duration-fast ease-ds hover:brightness-110"
        >
          Tentar novamente
        </button>
        <Link
          href="/conta"
          className="rounded-ctl border border-ds-line px-5 py-2.5 text-label font-medium text-ds-text-2 transition-colors duration-fast ease-ds hover:border-ds-text-3 hover:text-ds-text"
        >
          Voltar ao portal
        </Link>
      </div>
      {error.digest && (
        <p className="mt-8 font-mono text-caption text-ds-text-3">
          Se precisar falar com o suporte, informe este código: {error.digest}
        </p>
      )}
    </main>
  );
}
