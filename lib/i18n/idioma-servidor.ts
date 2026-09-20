import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { IDIOMA_PADRAO, idiomaValido, type Idioma } from "./idioma";

/** Idioma da requisição. Memorizado: layout e página leem o mesmo valor. */
export const idiomaAtual = cache((): Idioma => {
  try {
    return idiomaValido(cookies().get("lang")?.value);
  } catch {
    return IDIOMA_PADRAO;
  }
});

/* Se a escolha já foi feita neste navegador.

   Serve para a área do aluno saber quando pode usar o perfil como palpite:
   com cookie, quem manda é a escolha desta sessão; sem cookie, vale o que a
   pessoa escolheu da última vez, em qualquer aparelho. */
export const temCookieDeIdioma = cache((): boolean => {
  try {
    return !!idiomaValido(cookies().get("lang")?.value ?? null) && !!cookies().get("lang")?.value;
  } catch {
    return false;
  }
});
