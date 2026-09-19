/* O que conta como uso da plataforma.

   Um lugar só decide que endereço é qual ferramenta, para o rastreio e o painel
   do admin nunca discordarem sobre o nome das coisas. Ferramenta nova só aparece
   no painel depois de entrar aqui.

   Só é contado o que tem dono logado. Página pública e demonstração ficam de fora:
   a pergunta do painel é o que o aluno usa, não o que o visitante espia. */

export type TipoAcesso = "ferramenta" | "curso" | "sessao";

export const FERRAMENTAS: { chave: string; nome: string; prefixos: string[] }[] = [
  { chave: "raio-x", nome: "Raio-X do Dashboard", prefixos: ["/conta/ferramentas/raio-x"] },
  { chave: "conciliacao", nome: "O número não bate", prefixos: ["/conta/ferramentas/conciliacao"] },
  { chave: "caixa-preta", nome: "Caixa-Preta", prefixos: ["/conta/ferramentas/caixa-preta"] },
  { chave: "arena", nome: "Arena SQL", prefixos: ["/conta/ferramentas/arena"] },
  { chave: "forja", nome: "Forja DAX", prefixos: ["/conta/ferramentas/forja"] },
  { chave: "biblioteca", nome: "Biblioteca de referência", prefixos: ["/conta/biblioteca"] },
  { chave: "dataflow-lab", nome: "DataFlow Lab", prefixos: ["/dataflow-lab"] },
  { chave: "decision-lab", nome: "Decision Lab", prefixos: ["/decision-lab"] },
  { chave: "visuais", nome: "Ferramenta de visuais", prefixos: ["/ferramenta"] },
  { chave: "universo", nome: "Knowledge Universe 4D", prefixos: ["/universo", "/conta/universo"] },
];

// Rotas que começam com o prefixo de uma ferramenta mas não são uso dela.
const FORA = [/\/demo(\/|$)/, /^\/ferramenta\/assinar/, /^\/ferramenta-visuais/];

/** Descobre o que um endereço representa. Devolve null para o que não se conta. */
export function acessoDoEndereco(pathname: string): { tipo: TipoAcesso; chave: string } | null {
  const p = (pathname || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (FORA.some((r) => r.test(p))) return null;

  const curso = p.match(/^\/aprender\/([a-z0-9-]+)$/i);
  if (curso) return { tipo: "curso", chave: curso[1].toLowerCase() };

  const f = FERRAMENTAS.find((x) => x.prefixos.some((pre) => p === pre || p.startsWith(pre + "/")));
  return f ? { tipo: "ferramenta", chave: f.chave } : null;
}

export const CHAVE_VALIDA = /^[a-z0-9-]{1,80}$/;

/* Área logada: qualquer tela aqui conta como "o aluno esteve na plataforma".
   É o que alimenta dias de acesso, sessões e horário de uso no analytics. */
const AREA_LOGADA = [/^\/conta(\/|$)/, /^\/aprender\//, /^\/ferramenta(\/|$)/, /^\/universo(\/|$)/, /^\/dataflow-lab(\/|$)/, /^\/decision-lab(\/|$)/];

export function ehAreaLogada(pathname: string): boolean {
  const p = (pathname || "").split("?")[0];
  if (FORA.some((r) => r.test(p))) return false;
  return AREA_LOGADA.some((r) => r.test(p));
}
