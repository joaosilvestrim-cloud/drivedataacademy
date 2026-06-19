// Extrai o ID de um vídeo do YouTube a partir de várias formas de link.
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const u = url.trim();
  if (/^[\w-]{11}$/.test(u)) return u; // já é um ID
  const patterns = [
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/watch\?v=([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
    /[?&]v=([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = u.match(p);
    if (m) return m[1];
  }
  return null;
}
