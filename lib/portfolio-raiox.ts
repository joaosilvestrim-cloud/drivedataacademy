/* Raio-X do portfólio: o que falta para o site sair forte.

   O site que a IA externa monta é tão bom quanto os projetos que entram no
   prompt. Estilo bonito sobre projeto sem resultado continua fraco. Então,
   antes de gerar, a tela mostra o que corrigir em cada projeto, em ordem de
   peso, com um botão que abre o projeto para editar.

   Função pura, sem banco: roda no servidor com os projetos já carregados. */

import { LACUNA } from "@/lib/portfolio";

export type Nivel = "grave" | "ajuste";
export type Achado = { nivel: Nivel; texto: string };
export type ProjetoNoRaioX = { id: string; titulo: string; achados: Achado[] };
export type RaioX = { nota: number; fortes: string[]; gerais: Achado[]; projetos: ProjetoNoRaioX[] };

type ProjetoBruto = {
  id: string;
  titulo?: string | null;
  resumo?: string | null;
  problema?: string | null;
  resultado?: string | null;
  descricao?: string | null;
  ferramentas?: string[] | null;
  cover_url?: string | null;
  feito_em?: string | null;
  publico?: boolean | null;
  competencias?: { itens?: { id: string }[] } | null;
};

const norm = (t: string) => (t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/* Ferramenta genérica demais para exigir que o texto a cite. */
const GENERICAS = new Set(["ia", "gestao de projetos", "planejamento", "okrs", "kanban", "scrum"]);

export function raioXDoPortfolio(projetos: ProjetoBruto[], papeis: Record<string, string | null | undefined> = {}): RaioX {
  const lista: ProjetoNoRaioX[] = [];
  let desconto = 0;

  for (const p of projetos) {
    const achados: Achado[] = [];
    const texto = [p.titulo, p.resumo, p.problema, p.resultado, p.descricao].filter(Boolean).join(" ");
    const textoN = norm(texto);

    if (LACUNA.test(texto)) achados.push({ nivel: "grave", texto: "Tem pergunta entre colchetes. Responda ou apague: com lacuna ele fica fora do site." });
    if (!p.publico) achados.push({ nivel: "grave", texto: "Está só para a turma, então não entra no site. Marque como público se quiser mostrar." });
    if (!p.feito_em) achados.push({ nivel: "grave", texto: "Sem a data em que foi feito. No 4D ele aparece como se fosse de hoje." });
    if (!(p.resultado || "").trim()) achados.push({ nivel: "ajuste", texto: "Sem \"o que mudou\". É o trecho que o recrutador mais procura: o que ficou diferente depois do seu trabalho." });
    if (!(p.problema || "").trim()) achados.push({ nivel: "ajuste", texto: "Sem o problema. Uma frase sobre a dor de quem sofria com ele já dá contexto." });
    if (!p.cover_url) achados.push({ nivel: "ajuste", texto: "Sem imagem de capa. Um print do painel ou do resultado dá vida ao cartão." });
    if (!(p.competencias?.itens ?? []).length) {
      achados.push({ nivel: "ajuste", texto: "O texto ainda não prova nenhuma competência. Conte com mais detalhe o que você fez e como." });
    }
    const soltas = (p.ferramentas ?? []).filter((f) => !GENERICAS.has(norm(f)) && !textoN.includes(norm(f)));
    if (soltas.length) {
      achados.push({ nivel: "ajuste", texto: `Ferramentas que o texto não cita: ${soltas.join(", ")}. Conte onde usou no "Como você fez", ou tire da lista.` });
    }
    if (p.id in papeis && !(papeis[p.id] || "").trim()) {
      achados.push({ nivel: "ajuste", texto: "Sem o seu papel no projeto. É a primeira pergunta de qualquer entrevista." });
    }

    // Grave tira o projeto do site ou do 4D; "o que mudou" pesa mais que os outros ajustes.
    desconto += achados.reduce((s, a) => s + (a.nivel === "grave" ? 8 : a.texto.startsWith('Sem "o que mudou"') ? 3 : 1.5), 0);
    if (achados.length) lista.push({ id: p.id, titulo: p.titulo || "Projeto sem título", achados });
  }

  // Do portfólio como um todo.
  const gerais: Achado[] = [];
  const publicos = projetos.filter((p) => p.publico && !LACUNA.test([p.titulo, p.resumo, p.problema, p.resultado, p.descricao].join(" ")));
  const anos = new Set(publicos.map((p) => (p.feito_em || "").slice(0, 4)).filter(Boolean));
  const competencias = new Set(publicos.flatMap((p) => (p.competencias?.itens ?? []).map((c) => c.id)));

  if (publicos.length < 3) {
    gerais.push({ nivel: publicos.length ? "ajuste" : "grave", texto: `${publicos.length ? `Você tem ${publicos.length} ${publicos.length === 1 ? "projeto pronto" : "projetos prontos"}.` : "Nenhum projeto pronto ainda."} Com 3 ou mais o site ganha corpo.` });
    desconto += (3 - publicos.length) * 8;
  }
  if (publicos.length >= 2 && anos.size < 2) {
    gerais.push({ nivel: "ajuste", texto: "Todos os projetos são do mesmo ano. Projetos de anos diferentes mostram evolução no seu Universo 4D." });
    desconto += 5;
  }
  if (publicos.length && !publicos.some((p) => /\d/.test(p.resultado || ""))) {
    gerais.push({ nivel: "ajuste", texto: "Nenhum resultado traz um número. Se você mediu algo (tempo, volume, custo, erros), escreva. Se não mediu, não invente: o texto sem número segue valendo." });
    desconto += 3;
  }

  const fortes: string[] = [];
  if (publicos.length) fortes.push(`${publicos.length} ${publicos.length === 1 ? "projeto pronto" : "projetos prontos"} para o site`);
  if (competencias.size) fortes.push(`${competencias.size} ${competencias.size === 1 ? "competência provada" : "competências provadas"} por trecho de projeto`);
  if (anos.size >= 2) {
    const ord = [...anos].sort();
    fortes.push(`carreira de ${ord[0]} a ${ord[ord.length - 1]}`);
  }
  const comResultado = publicos.filter((p) => (p.resultado || "").trim()).length;
  if (comResultado) fortes.push(`${comResultado} com "o que mudou" escrito`);

  lista.sort((a, b) => b.achados.filter((x) => x.nivel === "grave").length - a.achados.filter((x) => x.nivel === "grave").length || b.achados.length - a.achados.length);
  return { nota: Math.round(Math.max(0, Math.min(100, 100 - desconto))), fortes, gerais, projetos: lista };
}
