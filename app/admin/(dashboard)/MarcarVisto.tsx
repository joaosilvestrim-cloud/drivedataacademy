"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

/* "Já vi isso aqui", no comando de quem lê.

   A primeira versão apagava o aviso sozinha quando alguém abria a tela. Ficou
   ruim: passar pela tela a caminho de outra coisa zerava o contador e a pessoa
   perdia o rastro sem ter olhado nada. Agora só some quando ela diz que viu.

   Aparece só quando aquela tela tem aviso, então não vira enfeite fixo no
   topo de 40 páginas. */
export default function MarcarVisto({ quantos }: { quantos: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const [indo, setIndo] = useState(false);

  if (!quantos) return null;

  async function marcar() {
    setIndo(true);
    try {
      await fetch("/api/admin/pendencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ em: pathname }),
      });
      router.refresh();
    } catch { /* sem rede: o aviso fica, que é o lado seguro */ }
    setIndo(false);
  }

  return (
    <button
      type="button"
      onClick={marcar}
      disabled={indo}
      className="inline-flex items-center gap-2 rounded-lg border border-white/12 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-brand-green/50 hover:text-white disabled:opacity-50"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {indo ? "Marcando..." : `Marcar ${quantos} como visto`}
    </button>
  );
}
