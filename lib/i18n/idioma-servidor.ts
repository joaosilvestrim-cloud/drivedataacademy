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
