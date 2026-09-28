/* Auditoria do site que o aluno colou, antes de publicar.

   O João pediu garantia de que o site do aluno fique bom, mesmo gerado fora
   da Academy. Beleza não se mede por código, mas quase tudo que faz um site
   gerado por IA dar errado é previsível e dá para medir:

   - sai cortado, quando o modelo bate no limite de resposta (aconteceu no
     primeiro site do João);
   - sai abreviado, com "restante do código igual";
   - sai com texto de exemplo, "Seu nome", "Lorem ipsum";
   - esquece um projeto;
   - usa recurso de endereço que o isolamento bloqueia, e quebra no ar;
   - não se adapta ao celular, de onde vem o tráfego do LinkedIn;
   - inventa imagem.

   Erro bloqueia a publicação. Aviso não bloqueia, mas aparece. E toda
   auditoria gera o pedido de correção pronto: o aluno cola na mesma conversa
   da IA e recebe o site consertado. Nada aqui chama IA: são regras. */

export type Achado = { nivel: "erro" | "aviso"; texto: string; correcao: string };
export type Auditoria = { nota: number; achados: Achado[]; pedidoDeCorrecao: string };

const HOSTS_PERMITIDOS = ["fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com", "cdn.jsdelivr.net", "unpkg.com", "cdn.tailwindcss.com"];

const norm = (t: string) =>
  (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function visivel(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

function host(url: string): string {
  try {
    return new URL(url, "https://x.invalid").hostname;
  } catch {
    return "";
  }
}

export function auditarSite(
  html: string,
  contexto: { titulosDosProjetos: string[]; imagensPermitidas: string[]; numerosSemOrigem?: string[]; linkUniverso?: string },
): Auditoria {
  const achados: Achado[] = [];
  const erro = (texto: string, correcao: string) => achados.push({ nivel: "erro", texto, correcao });
  const aviso = (texto: string, correcao: string) => achados.push({ nivel: "aviso", texto, correcao });
  const conta = (re: RegExp) => (html.match(re) || []).length;

  // Cortado: a resposta parou antes de fechar o documento.
  if (!/<\/html>\s*$/i.test(html.trim()) || !/<\/body>/i.test(html) || conta(/<script\b/gi) !== conta(/<\/script>/gi) || conta(/<style\b/gi) !== conta(/<\/style>/gi)) {
    erro("O site está cortado: a resposta da IA parou antes de terminar o arquivo.", "O arquivo veio cortado no meio. Gere o arquivo inteiro de novo, do <!doctype html> ao </html>. Se ficar longo demais, simplifique o CSS em vez de cortar conteúdo.");
  }

  // Abreviado: a IA pulou um pedaço e deixou um comentário no lugar.
  if (/<!--[^>]*?(restante|resto do|rest of|same as|igual ao|mesmo c[oó]digo|continua|continue|\.\.\.)[^>]*?-->|\/\/\s*\.\.\.|\/\*\s*\.\.\.\s*\*\//i.test(html)) {
    erro("A IA abreviou parte do código, com um comentário como \"restante do código\" no lugar.", "Você abreviou partes do código com comentários como \"restante do código\" ou \"...\". Escreva o arquivo inteiro, sem abreviar nenhuma parte.");
  }

  // Texto de exemplo esquecido.
  const texto = visivel(html);
  const exemplo = texto.match(/lorem ipsum|seu nome|your name|nome sobrenome|example\.com|exemplo\.com|seu@email|seuemail|email@|\(00\)|00000-0000|\[inserir|\[insira|\[seu|\bTODO\b/i);
  if (exemplo) {
    erro(`O site tem texto de exemplo esquecido: "${exemplo[0]}".`, `Remova todo texto de exemplo, como "${exemplo[0]}". Use só os fatos que eu passei; o que não existe deve ficar de fora.`);
  }

  // Projeto que a IA esqueceu.
  const t = ` ${norm(texto)} `;
  const faltando = contexto.titulosDosProjetos.filter((titulo) => {
    const chave = norm(titulo).split(" ").slice(0, 5).join(" ");
    return chave && !t.includes(` ${chave}`);
  });
  if (faltando.length) {
    erro(`Ficou de fora: ${faltando.join(", ")}.`, `Faltou no site: ${faltando.join(", ")}. Todos os projetos que eu passei precisam aparecer, cada um com o título exato.`);
  }

  // Celular.
  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) {
    erro("O site não está preparado para celular: falta a meta viewport.", "Inclua <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> e garanta que o layout funcione a partir de 360px de largura.");
  } else if (!/@media/i.test(html) && !/cdn\.tailwindcss\.com/i.test(html)) {
    aviso("O site não tem nenhuma regra para telas pequenas. Pode ficar ruim no celular.", "Adicione regras @media para o layout se adaptar ao celular, a partir de 360px de largura.");
  }

  // Recurso que o isolamento bloqueia: some no ar sem aviso.
  const externos = [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["'](https?:\/\/[^"']+)["'][^>]*>/gi)]
    .map((m) => ({ tag: m[0], url: m[1] }))
    .filter((r) => !/rel=["'](?:preconnect|dns-prefetch|icon|canonical)["']/i.test(r.tag))
    .map((r) => r.url)
    .filter((u) => !HOSTS_PERMITIDOS.includes(host(u)));
  if (externos.length) {
    erro(`O site carrega arquivos de um endereço que não funciona aqui: ${[...new Set(externos.map(host))].join(", ")}.`, `Não use arquivos de ${[...new Set(externos.map(host))].join(", ")}. Coloque o CSS e o JavaScript dentro do próprio arquivo; bibliotecas, só de cdnjs.cloudflare.com ou cdn.jsdelivr.net; fontes, só do Google Fonts.`);
  }

  // Formulário e rede não funcionam no isolamento.
  if (/<form\b/i.test(html)) {
    aviso("O site tem um formulário, que não envia nada aqui.", "Remova o formulário. O contato é pelo link do LinkedIn.");
  }
  if (/\bfetch\s*\(|XMLHttpRequest/.test(html)) {
    aviso("O site tenta buscar dados na internet, o que não funciona aqui.", "Não use fetch nem chamadas de rede. Todo o conteúdo fica dentro do arquivo.");
  }

  // Imagem que não veio do aluno.
  const permitidas = new Set(contexto.imagensPermitidas);
  const inventadas = [...html.matchAll(/<img\b[^>]*src=["']([^"']+)["']/gi)].map((m) => m[1]).filter((src) => /^https?:/i.test(src) && !permitidas.has(src));
  if (inventadas.length) {
    aviso(`O site usa ${inventadas.length === 1 ? "uma imagem" : `${inventadas.length} imagens`} que não ${inventadas.length === 1 ? "é sua" : "são suas"}.`, "Use só as imagens que eu passei. Tire qualquer imagem de banco de imagens ou inventada.");
  }

  if (contexto.numerosSemOrigem?.length) {
    aviso(`Números que não estão nos seus projetos: ${contexto.numerosSemOrigem.join(", ")}.`, `Remova estes números, que não estão nos fatos que eu passei: ${contexto.numerosSemOrigem.join(", ")}.`);
  }

  if (contexto.linkUniverso && !html.includes("#universo")) {
    aviso("O site não tem o botão para o seu Universo 4D.", `Inclua um botão "Explorar meu Universo 4D" apontando para ${contexto.linkUniverso} com target="_top".`);
  }
  if (!/<title>[^<]{2,}<\/title>/i.test(html)) {
    aviso("O site não tem título de página.", "Inclua um <title> com o meu nome e a palavra Portfólio.");
  }

  const erros = achados.filter((a) => a.nivel === "erro").length;
  const avisos = achados.length - erros;
  const nota = Math.max(0, 100 - erros * 25 - avisos * 7);

  const pedidoDeCorrecao = achados.length
    ? `O HTML que você gerou para o meu portfólio tem estes problemas. Corrija todos e devolva o arquivo completo, do <!doctype html> ao </html>, sem abreviar nenhuma parte:\n\n${achados.map((a, i) => `${i + 1}. ${a.correcao}`).join("\n")}\n\nMantenha o mesmo visual e o mesmo conteúdo; mude só o necessário para resolver esses pontos.`
    : "";

  return { nota, achados, pedidoDeCorrecao };
}
