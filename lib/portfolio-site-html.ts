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
   aluno escolhe um, e o mesmo conteúdo sai com cara completamente diferente.

   Cada estilo é uma direção completa, não um adjetivo: a IA externa recebe
   paleta com hexadecimais, par de fontes do Google Fonts, estrutura da
   página, um elemento de assinatura (a coisa que só este estilo tem) e o que
   evitar. Direção vaga produz o mesmo site genérico em qualquer estilo; foi o
   que aconteceu com a primeira versão, de uma frase cada. `resumo` é o que a
   tela mostra; `direcao` é o que vai no prompt. */
export type DirecaoDeArte = { nome: string; resumo: string; direcao: string };

export const ESTILOS = {
  painel: {
    nome: "Painel de dados",
    resumo: "O site é um dashboard: indicadores grandes, grid de cartões e números em fonte mono.",
    direcao: `Conceito: o site é um painel de indicadores, como um relatório de BI bem desenhado.
Paleta: fundo #0B1220, superfícies #111A2E, linhas #1F2A44, texto #E6EDF7, texto secundário #8A9BB8, destaque #22C55E para o que melhorou.
Fontes: títulos em "Space Grotesk" 600, texto em "Inter" 400, números em "JetBrains Mono".
Estrutura: faixa de KPIs no topo (os números reais da carreira), depois um grid de cartões de projeto do mesmo tamanho, cada um com o antes e o depois.
Assinatura: cada projeto tem um mini gráfico em barras feito em CSS mostrando quantas competências ele prova. Os números usam tabular-nums.
Evite: gráfico com dado inventado, KPI para preencher espaço, gradiente colorido de fundo.`,
  },
  editorial: {
    nome: "Revista de negócios",
    resumo: "Cada projeto vira uma reportagem curta: manchete, olho e colunas.",
    direcao: `Conceito: o site é uma edição de revista de negócios dedicada a esta pessoa.
Paleta: papel #F4F1EA, tinta #1C1A17, cinza #6B665E, fios #D8D2C6, destaque #B3261E.
Fontes: títulos em "Fraunces" 700 com itálico nas palavras-chave, texto em "Source Serif 4", legendas em "IBM Plex Sans".
Estrutura: capa com o nome como título de revista, sumário numerado, cada projeto como reportagem: manchete (o problema), olho em destaque (o resultado), texto em duas colunas no desktop.
Assinatura: capitular grande na primeira letra de cada reportagem e fios finos separando as matérias.
Evite: cartões com sombra, ícones, qualquer coisa que pareça aplicativo.`,
  },
  terminal: {
    nome: "Terminal",
    resumo: "Interface de linha de comando: projetos como saídas de consulta SQL.",
    direcao: `Conceito: o site é um terminal. Quem visita "roda comandos" e lê as respostas.
Paleta: fundo #050805, texto #39FF88, texto apagado #1F8F50, destaque #FFD166 para comandos.
Fontes: tudo em "JetBrains Mono" ou "IBM Plex Mono".
Estrutura: um prompt de comando no topo com o nome, e cada seção começa com um comando digitado (ex.: SELECT * FROM projetos ORDER BY data;) seguido da saída formatada em tabela ASCII legível.
Assinatura: o primeiro comando se digita sozinho na abertura, com cursor piscando. Os links do menu também parecem comandos.
Evite: texto ilegível, efeito de chuva de caracteres, animação que atrase a leitura. Respeite prefers-reduced-motion desligando a digitação.`,
  },
  minimalista: {
    nome: "Minimalismo suíço",
    resumo: "Grid rígido, muito branco, tipografia precisa e uma cor só.",
    direcao: `Conceito: design suíço internacional. A hierarquia faz todo o trabalho.
Paleta: branco #FFFFFF, preto #111111, cinza #767676, uma única cor de destaque #E3262B usada no máximo em três lugares.
Fontes: "Inter Tight" 800 para títulos muito grandes, "Inter" 400 para texto.
Estrutura: grid de 12 colunas visível no alinhamento, títulos enormes à esquerda, conteúdo em colunas estreitas à direita, numeração das seções em fonte pequena.
Assinatura: o nome em tamanho gigante cortado pela borda da tela na abertura.
Evite: sombra, cantos arredondados, ícones, gradiente, qualquer enfeite.`,
  },
  estudio: {
    nome: "Estúdio noturno",
    resumo: "Escuro e cinematográfico: foto grande, luz quente e ritmo de filme.",
    direcao: `Conceito: a abertura de um filme sobre a carreira da pessoa.
Paleta: fundo #0A0A0C, superfície #141417, texto #F2EFE9, secundário #9A968E, luz #F5B85A.
Fontes: títulos em "Syne" 700, texto em "Manrope".
Estrutura: abertura em tela cheia com a foto (se houver) em preto e branco e o nome sobreposto; cada projeto é uma "cena" com número grande, título e texto; créditos no final com ferramentas e certificados.
Assinatura: um feixe de luz quente (gradiente radial suave em #F5B85A) que acompanha a rolagem de uma cena para a outra.
Evite: roxo e azul neon, vidro fosco em tudo, texto sobre imagem sem contraste.`,
  },
  metro: {
    nome: "Mapa de metrô",
    resumo: "A carreira como mapa de metrô: áreas são linhas, projetos são estações.",
    direcao: `Conceito: a carreira desenhada como um mapa de transporte.
Paleta: fundo #FAFAF7, linhas em cores por área (#E4002B, #0072CE, #00A650, #FFB81C, #8E44AD), texto #1A1A1A.
Fontes: "Barlow" 600 para títulos e placas, "Barlow" 400 para texto.
Estrutura: no topo, um mapa em SVG com uma linha por área de competência e uma estação por projeto, em ordem de data; clicar numa estação rola até o projeto. Abaixo, cada projeto como uma placa de estação com nome, data e as linhas (competências) que passam por ele.
Assinatura: o mapa em SVG, com baldeações onde um projeto prova competências de duas áreas. No celular o mapa fica vertical.
Evite: mapa com estação que não é projeto real, linhas sem legenda.`,
  },
  blueprint: {
    nome: "Planta de engenharia",
    resumo: "Papel azul de projeto, cotas técnicas e anotações em mono.",
    direcao: `Conceito: o portfólio é a planta técnica de um projeto de engenharia.
Paleta: azul planta #0B3D91, linhas #7FA7E8, texto #EAF2FF, anotações #FFFFFF, destaque #FFCC00.
Fontes: títulos em "Space Mono" 700, texto em "IBM Plex Sans".
Estrutura: fundo com grade milimetrada em CSS, cada projeto num "quadro" com carimbo técnico no canto (título, data, responsável, ferramentas), setas de cota ligando problema e resultado.
Assinatura: o carimbo técnico de cada projeto e linhas de cota em SVG.
Evite: textura em imagem, grade que atrapalhe a leitura do texto (deixe a grade bem sutil).`,
  },
  relatorio: {
    nome: "Relatório anual",
    resumo: "Sóbrio e corporativo, como o relatório anual de uma empresa listada.",
    direcao: `Conceito: o relatório anual da carreira desta pessoa.
Paleta: fundo #FFFFFF, azul institucional #0A2540, cinza #5A6B7D, fios #E3E8EE, destaque #00A3A3.
Fontes: títulos em "Libre Franklin" 700, texto em "Source Sans 3".
Estrutura: carta de abertura (o texto de apresentação), destaques do ano com os números reais da carreira, capítulos por projeto com "Contexto", "O que fizemos" e "Resultado", índice de competências no fim.
Assinatura: barras horizontais em CSS mostrando quantos projetos provam cada competência, como gráfico de relatório.
Evite: número inventado, foto de banco de imagem, linguagem de marketing.`,
  },
  bento: {
    nome: "Grade bento",
    resumo: "Cartões de tamanhos variados, cada um um fato, como uma caixa bento.",
    direcao: `Conceito: tudo sobre a pessoa numa grade bento, legível num relance.
Paleta: fundo #F2F2F0, cartões #FFFFFF, texto #16181D, secundário #6B7280, destaque #3B5BFD.
Fontes: "Plus Jakarta Sans" 700 para títulos, "Plus Jakarta Sans" 400 para texto.
Estrutura: primeira dobra em grade bento com cartões de tamanhos diferentes: foto e nome, título, número de projetos, principal competência, projeto em destaque, link do LinkedIn. Abaixo, cada projeto como um cartão que expande ao clicar.
Assinatura: a grade responsiva que se reorganiza no celular sem perder a hierarquia.
Evite: cartões todos iguais, sombra pesada, ícone em todo cartão.`,
  },
  brutalista: {
    nome: "Brutalista",
    resumo: "Cru e ousado: preto, branco, tipografia enorme e bordas grossas.",
    direcao: `Conceito: web brutalista, honesta e barulhenta.
Paleta: branco #FFFFFF, preto #000000, amarelo #FFE600 como marca-texto.
Fontes: "Archivo Black" para títulos gigantes, "Archivo" para texto.
Estrutura: blocos com borda preta de 3px, títulos em caixa alta enormes, projetos numa lista grande com número, título e resultado marcado em amarelo.
Assinatura: palavras-chave do resultado de cada projeto destacadas como marca-texto amarelo.
Evite: cantos arredondados, sombra suave, gradiente, cor além das três da paleta.`,
  },
  caderno: {
    nome: "Caderno de campo",
    resumo: "Um caderno de anotações: papel pautado, notas à mão e post-its.",
    direcao: `Conceito: o caderno de campo de quem resolve problemas com dados.
Paleta: papel #FBF8F1, pauta #D9E4F2, tinta #1E2A3A, caneta #1F5FBF, post-it #FFE58A.
Fontes: títulos em "Fraunces", texto em "Literata", anotações à mão em "Caveat".
Estrutura: páginas pautadas em CSS, cada projeto como uma página de caderno com data no canto, anotações à mão nas margens (só textos que já estão nos fatos) e as competências em post-its.
Assinatura: os post-its das competências, levemente girados, e setas desenhadas à mão em SVG.
Evite: textura em imagem, fonte manuscrita em textos longos.`,
  },
  museu: {
    nome: "Exposição de museu",
    resumo: "Cada projeto é uma obra exposta, com placa de museu ao lado.",
    direcao: `Conceito: uma exposição individual sobre o trabalho desta pessoa.
Paleta: parede #F7F6F3, texto #222222, cinza #8C8A85, moldura #1B1B1B, destaque #9C6B30.
Fontes: títulos em "Cormorant Garamond" 600, placas em "Work Sans".
Estrutura: entrada da exposição com o nome e o texto de apresentação como texto de curadoria; cada projeto como uma obra com a imagem emoldurada e uma placa ao lado (título, ano, "técnica" = ferramentas, descrição curta); sala final com certificados.
Assinatura: as placas de museu com a ficha técnica de cada projeto.
Evite: excesso de efeitos; o silêncio visual é o ponto.`,
  },
  surpresa: {
    nome: "Me surpreenda",
    resumo: "A IA escolhe um conceito ousado, ligado ao mundo de dados.",
    direcao: `Escolha você um conceito visual ousado e ligado ao mundo de dados, que ninguém esperaria num portfólio. Antes do código, decida e aplique com coerência: uma paleta de 4 a 6 cores com hexadecimais, um par de fontes do Google Fonts, uma estrutura de página e um elemento de assinatura que só este conceito teria.
Evite: gradiente roxo e azul, vidro fosco genérico, visual de template.`,
  },
} as const satisfies Record<string, DirecaoDeArte>;

export type Estilo = keyof typeof ESTILOS;

/* Personalização por cima do estilo. Cada opção vira uma instrução curta no
   prompt; "auto" deixa a decisão com o estilo. */
export type Personalizacao = {
  cor: string; // "auto" ou hexadecimal
  tema: "auto" | "escuro" | "claro";
  idioma: "pt" | "en" | "bilingue";
  tom: "direto" | "tecnico" | "caloroso";
};

export const PERSONALIZACAO_PADRAO: Personalizacao = { cor: "auto", tema: "auto", idioma: "pt", tom: "direto" };

export const CORES_DE_DESTAQUE = [
  { nome: "Do estilo", hex: "auto" },
  { nome: "Verde", hex: "#15C47E" },
  { nome: "Azul", hex: "#2F6BFF" },
  { nome: "Coral", hex: "#FF5A4E" },
  { nome: "Âmbar", hex: "#F5B400" },
  { nome: "Violeta", hex: "#7C5CFF" },
  { nome: "Rosa", hex: "#E6488A" },
  { nome: "Petróleo", hex: "#0E8C8C" },
];

/* Pedidos de refinamento, para colar na MESMA conversa da IA depois do
   primeiro site. Todos terminam pedindo o arquivo inteiro, porque a IA
   costuma devolver só o trecho alterado, e trecho não se publica. */
export const REFINAMENTOS = [
  { rotulo: "Mais ousado", texto: "Deixe o site mais ousado: aumente o contraste, a escala dos títulos e dê mais força ao elemento de assinatura do estilo. Não mude nenhum texto e não invente conteúdo. Devolva o arquivo HTML inteiro." },
  { rotulo: "Primeira dobra mais forte", texto: "Deixe a primeira dobra mais forte: nome, título profissional e o botão do Universo 4D visíveis sem rolar, com o projeto principal em destaque logo abaixo. Não invente conteúdo. Devolva o arquivo HTML inteiro." },
  { rotulo: "Competências em gráfico", texto: "Transforme a seção de competências num gráfico de barras horizontais, feito em CSS ou SVG sem biblioteca, mostrando quantos projetos provam cada competência. Use só os dados que já estão no site. Devolva o arquivo HTML inteiro." },
  { rotulo: "Linha do tempo", texto: "Adicione uma linha do tempo visual da carreira, com projetos e cargos em ordem de data, usando só as datas que já estão no site. No celular ela fica vertical. Devolva o arquivo HTML inteiro." },
  { rotulo: "Versão em inglês", texto: "Crie a versão em inglês do site com um botão para alternar entre português e inglês, guardando a escolha. Traduza fielmente, sem acrescentar nada. Devolva o arquivo HTML inteiro." },
  { rotulo: "Modo claro e escuro", texto: "Faça o site ter modo claro e modo escuro, seguindo prefers-color-scheme, com contraste AA nos dois e a mesma identidade visual. Devolva o arquivo HTML inteiro." },
  { rotulo: "Animações de entrada", texto: "Adicione animações de entrada discretas nas seções, respeitando prefers-reduced-motion e sem esconder conteúdo se o JavaScript falhar. Devolva o arquivo HTML inteiro." },
  { rotulo: "Revisão no celular", texto: "Revise o site para celular a partir de 360px: nada pode vazar para o lado, botões com pelo menos 44px de altura, menu compacto e textos com no mínimo 16px. Devolva o arquivo HTML inteiro." },
];

/* Como pedir em cada IA. É onde o aluno mais trava: a resposta vem cortada,
   vem só um trecho, ou o código abre num painel e ele não acha o botão de
   copiar. Dicas curtas, uma IA por aba. */
export const GUIA_IAS = [
  {
    nome: "Claude",
    url: "https://claude.ai/new",
    passos: [
      "Abra uma conversa nova e cole o prompt inteiro.",
      "O código costuma abrir num painel ao lado. Copie pelo botão de copiar do próprio painel, não selecionando com o mouse.",
      "Se a resposta parar no meio, escreva: continue. Depois peça: junte tudo e devolva o arquivo HTML inteiro.",
    ],
  },
  {
    nome: "ChatGPT",
    url: "https://chatgpt.com/",
    passos: [
      "Abra uma conversa nova e cole o prompt inteiro.",
      "Se o código abrir no Canvas, copie pelo botão de copiar do Canvas.",
      "Se ele devolver só um trecho, peça: devolva o arquivo HTML completo, do <!doctype html> ao </html>, sem cortar nada.",
    ],
  },
  {
    nome: "Gemini",
    url: "https://gemini.google.com/app",
    passos: [
      "Abra uma conversa nova e cole o prompt inteiro.",
      "Copie pelo botão de copiar do bloco de código.",
      "Se a resposta vier cortada, peça: enxugue o CSS e devolva o arquivo HTML inteiro de novo.",
    ],
  },
] as const;
