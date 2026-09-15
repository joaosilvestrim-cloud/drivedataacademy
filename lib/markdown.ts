/* Markdown leve para os artigos do blog. Cobre o que os textos usam: títulos,
   parágrafos, listas, citações, negrito, itálico, código inline e links. O
   texto é escapado antes de virar HTML, então nada digitado no admin vira tag. */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inline(s: string): string {
  return esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

export function markdownParaHtml(md: string): string {
  const linhas = (md || "").replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let par: string[] = [];
  let lista: { tipo: "ul" | "ol"; itens: string[] } | null = null;
  let cita: string[] = [];

  const fechaPar = () => { if (par.length) { out.push(`<p>${inline(par.join(" "))}</p>`); par = []; } };
  const fechaLista = () => { if (lista) { out.push(`<${lista.tipo}>${lista.itens.map((i) => `<li>${inline(i)}</li>`).join("")}</${lista.tipo}>`); lista = null; } };
  const fechaCita = () => { if (cita.length) { out.push(`<blockquote><p>${inline(cita.join(" "))}</p></blockquote>`); cita = []; } };
  const fechaTudo = () => { fechaPar(); fechaLista(); fechaCita(); };

  for (const bruta of linhas) {
    const l = bruta.trimEnd();
    if (!l.trim()) { fechaTudo(); continue; }
    const h = l.match(/^(#{1,3})\s+(.*)$/);
    // O h1 é o título do post; dentro do texto, "#" e "##" viram h2 e "###" vira h3.
    if (h) { fechaTudo(); const n = Math.max(2, h[1].length); out.push(`<h${n}>${inline(h[2])}</h${n}>`); continue; }
    if (/^---+$/.test(l.trim())) { fechaTudo(); out.push("<hr />"); continue; }
    const q = l.match(/^>\s?(.*)$/);
    if (q) { fechaPar(); fechaLista(); cita.push(q[1]); continue; }
    const ul = l.match(/^\s*[-*]\s+(.*)$/);
    const ol = l.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      fechaPar(); fechaCita();
      const tipo = ul ? "ul" : "ol";
      if (!lista || lista.tipo !== tipo) { fechaLista(); lista = { tipo, itens: [] }; }
      lista.itens.push((ul || ol)![1]);
      continue;
    }
    if (lista && /^\s{2,}/.test(bruta)) { lista.itens[lista.itens.length - 1] += " " + l.trim(); continue; }
    fechaLista(); fechaCita();
    par.push(l.trim());
  }
  fechaTudo();
  return out.join("\n");
}

// Tempo de leitura estimado, a 200 palavras por minuto.
export function minutosDeLeitura(md: string): number {
  const palavras = (md || "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(palavras / 200));
}
