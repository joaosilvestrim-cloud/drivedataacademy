import "server-only";
import { frase } from "./frases";
import { idiomaPorEmail } from "./idioma-usuario";

/* O tradutor de um e-mail, escolhido pelo idioma de quem vai receber.

   Quem não tem perfil, ou nunca escolheu idioma, recebe em português: é o
   idioma de quase toda a turma, e errar para o lado do português é melhor do
   que mandar inglês para quem não pediu.

   Frase sem tradução sai em português, como em qualquer outra tela. Um e-mail
   com uma linha em português no meio ainda é legível; um e-mail com um buraco
   no lugar da frase, não. */
export async function tradutorDoEmail(destinatario: string) {
  const idioma = await idiomaPorEmail(destinatario);
  return (texto: string) => frase(texto, idioma);
}
