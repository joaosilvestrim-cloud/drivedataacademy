import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LACUNA } from "@/lib/portfolio";
import { tabelaAusente } from "@/lib/portfolio-carreira";
import { cursosPorCompetencia, identificarCompetencias, nomesDasCompetencias } from "@/lib/portfolio-competencias";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Aderência a uma vaga, na página pública do portfólio.

   O recrutador cola a descrição de uma vaga e vê, na constelação do aluno, o
   que a vaga pede e o que já está provado por projeto. A leitura da vaga usa
   a mesma IA que lê os projetos, no modo "vaga": cada competência volta com o
   trecho da vaga que a pede, então nada aparece sem origem.

   Cada consulta custa uma chamada de IA, e a rota é pública. Por isso o
   limite: poucas consultas por visitante por hora, e um teto diário por
   portfólio. Sem a tabela de consultas (migration do universo da carreira),
   a rota não responde, em vez de responder sem limite. */

const POR_VISITANTE_HORA = 6;
const POR_PORTFOLIO_DIA = 80;

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const admin = createAdminClient();
  const { data: site } = await admin
    .from("portfolio_sites")
    .select("user_id, publicado, bloqueado, mostrar_universo")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!site || !site.publicado || site.bloqueado || !site.mostrar_universo) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let texto = "";
  try {
    texto = String((await req.json())?.texto ?? "").trim();
  } catch {
    /* corpo inválido cai na validação abaixo */
  }
  if (texto.length < 80) {
    return NextResponse.json({ error: "Cole a descrição completa da vaga, com as responsabilidades e os requisitos." }, { status: 400 });
  }
  texto = texto.slice(0, 9000);

  // O visitante vira um hash curto do IP: dá para limitar sem guardar o IP.
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "sem-ip";
  const origem = createHash("sha256").update(`${ip}|${params.slug}`).digest("hex").slice(0, 24);
  const agora = Date.now();
  const [porVisitante, porPortfolio] = await Promise.all([
    admin
      .from("portfolio_consultas")
      .select("id", { count: "exact", head: true })
      .eq("slug", params.slug)
      .eq("origem", origem)
      .gte("criado_em", new Date(agora - 3600_000).toISOString()),
    admin
      .from("portfolio_consultas")
      .select("id", { count: "exact", head: true })
      .eq("slug", params.slug)
      .gte("criado_em", new Date(agora - 86400_000).toISOString()),
  ]);
  if (tabelaAusente(porVisitante.error)) {
    return NextResponse.json({ error: "A comparação com vagas ainda não está disponível." }, { status: 503 });
  }
  if ((porVisitante.count ?? 0) >= POR_VISITANTE_HORA || (porPortfolio.count ?? 0) >= POR_PORTFOLIO_DIA) {
    return NextResponse.json({ error: "Muitas comparações seguidas. Tente de novo mais tarde." }, { status: 429 });
  }
  await admin.from("portfolio_consultas").insert({ slug: params.slug, origem });

  const pedidas = await identificarCompetencias(texto, "vaga");
  if (pedidas === null) {
    return NextResponse.json({ error: "Não consegui ler a vaga agora. Tente de novo em instantes." }, { status: 502 });
  }
  if (!pedidas.length) {
    return NextResponse.json({ error: "Não encontrei na vaga competências do catálogo de dados. Confira se colou a descrição inteira." }, { status: 422 });
  }

  // O que o aluno prova: só projeto público, sem lacuna, com a leitura salva.
  const [{ data: projetos }, nomes, cursos] = await Promise.all([
    admin.from("portfolio_projects").select("titulo, resumo, problema, resultado, descricao, publico, competencias").eq("user_id", site.user_id).eq("publico", true),
    nomesDasCompetencias(),
    cursosPorCompetencia(admin),
  ]);
  const provas = new Map<string, string[]>();
  for (const p of (projetos ?? []) as any[]) {
    if (LACUNA.test([p.titulo, p.resumo, p.problema, p.resultado, p.descricao].join(" "))) continue;
    for (const c of Array.isArray(p.competencias?.itens) ? p.competencias.itens : []) {
      provas.set(c.id, [...(provas.get(c.id) ?? []), p.titulo]);
    }
  }

  const itens = pedidas
    .filter((c) => nomes[c.id])
    .map((c) => ({
      id: c.id,
      nome: nomes[c.id],
      trecho: c.trecho,
      tem: provas.has(c.id),
      projetos: provas.get(c.id) ?? [],
      cursos: provas.has(c.id) ? [] : (cursos[c.id] ?? []).slice(0, 2),
    }))
    .sort((a, b) => Number(b.tem) - Number(a.tem));

  return NextResponse.json({ itens, tem: itens.filter((i) => i.tem).length, total: itens.length });
}
