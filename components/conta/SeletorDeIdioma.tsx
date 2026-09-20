"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { IDIOMAS, NOME_DO_IDIOMA, TAG_HTML, type Idioma } from "@/lib/i18n/idioma";

/* Troca de idioma.

   A escolha vai para um cookie, porque o servidor precisa dela antes de
   renderizar: assim a próxima tela já nasce traduzida, sem piscar. Depois de
   gravar, `router.refresh()` manda o servidor reenviar a página atual no
   idioma novo, sem recarregar o navegador inteiro. */

export default function SeletorDeIdioma({ atual, compacto }: { atual: Idioma; compacto?: boolean }) {
  const tr = usarTraducao();
  const [idioma, setIdioma] = useState<Idioma>(atual);
  const [pendente, comecar] = useTransition();
  const router = useRouter();

  /* O servidor pode ter usado o perfil porque este navegador ainda não tinha
     cookie. Gravar aqui faz a próxima tela já nascer no idioma certo, sem
     nova ida ao banco. */
  useEffect(() => {
    try {
      if (document.cookie.includes("lang=")) return;
      document.cookie = `lang=${atual};path=/;max-age=31536000;samesite=lax`;
      document.documentElement.lang = TAG_HTML[atual];
    } catch {
      /* sem cookie: segue no idioma que o servidor mandou */
    }
  }, [atual]);

  function trocar(novo: Idioma) {
    if (novo === idioma) return;
    setIdioma(novo);
    try {
      document.cookie = `lang=${novo};path=/;max-age=31536000;samesite=lax`;
      localStorage.setItem("lang", novo);
      document.documentElement.lang = TAG_HTML[novo];
    } catch {
      /* navegador sem cookie: a troca vale só para esta tela */
    }
    /* O cookie resolve a tela; o perfil resolve o e-mail, que chega quando
       não existe navegador nenhum. Se a gravação falhar, a troca continua
       valendo aqui: não vale travar a interface por causa disso. */
    fetch("/api/idioma", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idioma: novo }),
    }).catch(() => {});
    comecar(() => router.refresh());
  }

  return (
    <div className={`flex items-center gap-1 ${compacto ? "" : "rounded-lg bg-white/[0.04] p-1"}`} role="group" aria-label={tr("Idioma")}>
      {IDIOMAS.map((l) => (
        <button
          key={l}
          onClick={() => trocar(l)}
          aria-pressed={idioma === l}
          aria-label={NOME_DO_IDIOMA[l]}
          title={NOME_DO_IDIOMA[l]}
          className={`rounded-md px-2 py-1 text-[0.68rem] font-semibold uppercase transition-colors ${
            idioma === l ? "bg-white/10 text-white" : "text-slate-500 hover:text-white"
          } ${pendente && idioma === l ? "opacity-60" : ""}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
