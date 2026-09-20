import "server-only";
import { idiomaAtual } from "./idioma-servidor";
import { frase } from "./frases";

/* tr("texto em português") dentro de componente de servidor.

   O idioma vem do cookie da requisição, então a página já sai traduzida. Em
   português a função devolve o próprio texto, sem custo nenhum. */
export function tr(texto: string): string {
  return frase(texto, idiomaAtual());
}
