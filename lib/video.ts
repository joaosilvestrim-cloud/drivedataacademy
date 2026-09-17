import { youtubeId } from "./youtube";

/* Um lugar só para entender o que foi colado no campo de vídeo.

   Antes disso existiam três leitores quase iguais: um no admin das lives, um na
   prévia do currículo e um na página que o aluno assiste. Quando eles discordam
   por uma letra, o resultado é o pior possível: o admin salva, não mostra nada,
   e ninguém sabe se o problema foi o link ou o sistema.

   O campo aceita o que a pessoa tem na mão: o <iframe> do Panda copiado
   inteiro, o endereço de embed, um link do YouTube em qualquer formato ou só o
   identificador do vídeo. */

/** Tira o src de dentro de um <iframe> colado. Fora isso, devolve o texto limpo. */
export function srcColado(bruto: string | null | undefined): string {
  const v = (bruto || "").trim();
  if (!v) return "";
  const iframe = v.match(/src=["']([^"']+)["']/i);
  return (iframe ? iframe[1] : v).trim();
}

/** O identificador do Panda é um uuid, venha ele na URL ou sozinho. */
export function pandaId(bruto: string | null | undefined): string | null {
  const v = srcColado(bruto);
  const m = v.match(/[?&]v=([0-9a-f-]{36})/i) || v.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  return m ? m[1] : null;
}

export type Video = { src: string; provedor: "youtube" | "panda" };

/* Resolve o que colar no iframe do player.

   `host` é o domínio do player do Panda (NEXT_PUBLIC_PANDA_PLAYER_HOST) e só
   faz falta quando a pessoa colou o id solto: com a URL inteira ele é
   dispensável, e é por isso que o embed continua funcionando mesmo se a
   variável não estiver configurada. */
export function resolverVideo(bruto: string | null | undefined, host?: string | null): Video | null {
  const v = srcColado(bruto);
  if (!v) return null;

  // Panda primeiro: o endereço dele carrega um `?v=` que já foi confundido com
  // o do YouTube uma vez, e uma vez basta.
  if (/^https?:\/\/[^ ]*pandavideo[^ ]*\/embed/i.test(v)) return { src: v, provedor: "panda" };

  const yt = youtubeId(v);
  if (yt) return { src: `https://www.youtube.com/embed/${yt}?rel=0&modestbranding=1`, provedor: "youtube" };

  const id = pandaId(v);
  if (id && host) return { src: `https://${host}/embed/?v=${id}`, provedor: "panda" };

  return null;
}
