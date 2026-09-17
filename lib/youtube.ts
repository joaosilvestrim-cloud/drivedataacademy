/* Extrai o ID de um vídeo do YouTube a partir de várias formas de link.

   set/2026: o padrão genérico `?v=` era aplicado a qualquer texto, e o endereço
   do Panda também tem `?v=`. Resultado: a gravação da live do Figma virava
   "https://www.youtube.com/embed/38410d39-af", que são os onze primeiros
   caracteres do uuid do Panda. O player abria vazio e parecia que o link nem
   tinha sido salvo.

   Agora só link do YouTube é lido como YouTube. */

const HOSTS_DO_YOUTUBE = /(?:^|\/\/|\.)(?:youtube\.com|youtu\.be|youtube-nocookie\.com)(?:\/|$|:)/i;

export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const u = url.trim();
  if (/^[\w-]{11}$/.test(u)) return u; // já é um ID
  if (!HOSTS_DO_YOUTUBE.test(u)) return null; // endereço de outro provedor não é problema nosso
  const patterns = [
    /youtu\.be\/([\w-]{11})/,
    /youtube(?:-nocookie)?\.com\/watch\?(?:[^"'\s]*&)?v=([\w-]{11})/,
    /youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = u.match(p);
    if (m) return m[1];
  }
  return null;
}
