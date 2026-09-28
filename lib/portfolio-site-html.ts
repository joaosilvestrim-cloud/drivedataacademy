/* Parte do site de portfólio que roda nos dois lados: no servidor, para
   publicar, e no navegador do aluno, para a pré-visualização ter exatamente
   o mesmo isolamento da página pública. Nada aqui lê banco nem segredo.
   O resto está em lib/portfolio-site.ts. */

/** Tamanho máximo do HTML colado. Site de portfólio gerado por IA fica entre 20 e 80 KB. */
export const LIMITE_HTML = 800 * 1024;

/* Segunda camada de isolamento, dentro do próprio HTML.

   Proíbe qualquer chamada de rede feita por script (connect-src) e o envio
   de formulário (form-action). Sem isso, um site poderia imitar a tela de
   login da Academy e mandar a senha digitada para fora. Libera só o que um
   site estático precisa: fontes do Google e bibliotecas das CDNs públicas.

   Várias políticas no mesmo documento se somam, e cada uma só restringe.
   Então o aluno não consegue afrouxar esta colocando a dele. */
export const CSP_DO_SITE = [
  "default-src 'none'",
  "script-src 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com https://cdn.tailwindcss.com",
  "style-src 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com",
  "font-src https://fonts.gstatic.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net data:",
  "img-src https: data: blob:",
  "media-src https:",
  "connect-src 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  "base-uri 'none'",
].join("; ");

/* Navegação dentro do site isolado.

   O documento de um iframe srcdoc herda o endereço base da página que o
   contém. Então o "#sobre" do menu do aluno vira
   ".../portfolio/nome#sobre": o clique carrega a página inteira da Academy
   DENTRO do iframe, com uma segunda faixa em cima, e o menu nunca rola até a
   seção. Foi o que apareceu no site do João, e vale para qualquer site gerado
   por IA, porque todos usam menu com âncora.

   Este script intercepta o clique em âncora e rola até a seção. O link que
   aponta para o Universo 4D vira uma navegação da aba de cima, que abre a
   constelação por cima do site. E link externo sem aba nova passa a abrir
   em aba nova: dentro do iframe, o LinkedIn se recusa a carregar e o
   visitante veria uma área em branco. Roda antes do código do aluno, na
   fase de captura, então vale mesmo que o site trate os próprios cliques. */
function scriptDeNavegacao(linkUniverso?: string): string {
  const u = JSON.stringify(linkUniverso || "").replace(/</g, "\\u003c");
  return `<script>(function(){var U=${u};document.addEventListener("click",function(e){var a=e.target&&e.target.closest?e.target.closest("a[href]"):null;if(!a||a.hasAttribute("data-academy"))return;var h=a.getAttribute("href")||"";if(U&&h.indexOf("#universo")>-1){e.preventDefault();var l=document.createElement("a");l.href=U;l.target="_top";l.setAttribute("data-academy","1");document.body.appendChild(l);l.click();l.remove();return;}if(/^https?:/i.test(h)&&(!a.target||a.target==="_self")){e.preventDefault();window.open(h,"_blank","noopener");return;}if(h.charAt(0)!=="#")return;e.preventDefault();var id=decodeURIComponent(h.slice(1));var alvo=id?(document.getElementById(id)||document.getElementsByName(id)[0]):null;if(alvo){alvo.scrollIntoView({behavior:"smooth",block:"start"});}else if(!id){window.scrollTo({top:0,behavior:"smooth"});}},true);})();</script>`;
}

/* Coloca a política logo depois do <head>, e não antes do <!doctype>.
   Qualquer coisa antes do doctype joga o navegador em modo de
   compatibilidade antigo, e o site do aluno renderiza torto sem ele saber
   por quê. */
export function envelopar(html: string, opcoes: { linkUniverso?: string } = {}): string {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${CSP_DO_SITE}">` + scriptDeNavegacao(opcoes.linkUniverso);
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + meta);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => `${m}<head>${meta}</head>`);
  return `<!doctype html><html><head><meta charset="utf-8">${meta}</head><body>${html}</body></html>`;
}

/* Limpa o que o aluno colou. A IA costuma devolver o código cercado de
   ```html e com uma frase antes. O aluno cola tudo, e tudo bem. */
export function limparHtmlColado(bruto: string): { ok: true; html: string } | { ok: false; erro: string } {
  let html = (bruto || "").trim();
  const cerca = html.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (cerca) html = cerca[1].trim();
  const inicio = html.search(/<!doctype html|<html/i);
  if (inicio > 0) html = html.slice(inicio);

  if (!html) return { ok: false, erro: "Cole o HTML que a IA gerou." };
  if (!/<(html|body|main|section|div|h1)\b/i.test(html)) {
    return { ok: false, erro: "Isso não parece HTML. Cole o código inteiro que a IA devolveu, começando por <!doctype html>." };
  }
  if (new TextEncoder().encode(html).length > LIMITE_HTML) {
    return { ok: false, erro: "O site passou de 800 KB. Peça para a IA não embutir imagens no código e usar os links das imagens." };
  }
  return { ok: true, html };
}

/* Estilos para a direção de arte. São o momento de brincar da aula: cada
   aluno escolhe um, e o mesmo conteúdo sai com cara completamente diferente. */
export const ESTILOS = {
  painel: {
    nome: "Painel de dados",
    direcao:
      "O site é um painel de indicadores. Os números que estão escritos nos projetos viram KPIs grandes; projeto sem número mostra o antes e o depois em palavras, num cartão do mesmo tamanho. Nunca crie um KPI para preencher o grid. Números em fonte monoespaçada, grid de dashboard, cores sóbrias com uma cor de destaque para o que melhorou.",
  },
  editorial: {
    nome: "Revista de negócios",
    direcao:
      "O site é uma revista de negócios. Títulos grandes em fonte serifada, cada projeto contado como uma reportagem curta: o problema como manchete, o resultado como olho da matéria em destaque. Muito ritmo tipográfico, colunas, fios finos.",
  },
  terminal: {
    nome: "Terminal",
    direcao:
      "O site é uma interface de terminal. Fundo escuro, fonte monoespaçada, os projetos aparecem como saídas de consultas SQL formatadas em tabela, com o prompt de comando e um cursor piscando. Divertido, mas legível.",
  },
  minimalista: {
    nome: "Minimalismo suíço",
    direcao:
      "O site segue o minimalismo suíço. Muito espaço em branco, grid rígido, tipografia sem serifa precisa, uma única cor de destaque. Nenhum enfeite: a hierarquia faz todo o trabalho.",
  },
  surpresa: {
    nome: "Me surpreenda",
    direcao:
      "Escolha você um conceito visual ousado e ligado ao mundo de dados, que ninguém esperaria num portfólio. Defenda a escolha com coerência do começo ao fim.",
  },
} as const;

export type Estilo = keyof typeof ESTILOS;
