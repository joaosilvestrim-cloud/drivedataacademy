import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { descontoAnual } from "@/lib/subscription";
import { idsDaEquipe } from "@/lib/community";

/* Contexto do assistente de IA, montado do banco a cada pergunta. Tudo o que
   muda com o tempo (preços, cursos, lives, estado da conta) vem daqui, nunca
   do texto fixo em lib/ai.ts. Mudou no admin, muda a resposta. */

const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataHora = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
const data = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(new Date(iso));

const KIND: Record<string, string> = { mentoria: "mentoria", live: "live", workshop: "workshop" };
const PONTOS: Record<string, string> = { solution: "soluções na comunidade", challenge: "desafios corrigidos pelo time", ku_milestone: "marcos do Knowledge Universe" };
const PRODUTO: Record<string, string> = { subscription_annual: "assinatura anual", subscription: "assinatura mensal", full_access: "acesso full", workshop: "workshop avulso", curso: "treinamento" };
const SELOS: Record<string, string> = { fundador: "Fundador", top: "Top do ranking" };

/* O que vale para todo mundo: preços, cursos, agenda. */
export async function contextoPlataforma(admin: SupabaseClient): Promise<string> {
  const agora = new Date().toISOString();
  const [{ data: cfg }, { data: cursos }, { data: proximas }, { data: gravacoes }] = await Promise.all([
    admin.from("site_settings").select("key, value").in("key", ["sub_price", "sub_price_annual", "sales_open"]),
    admin.from("courses").select("title, subtitle, coming_soon, subscriber_price, price, workload").eq("published", true).order("position"),
    admin.from("live_events").select("title, kind, starts_at, duration_min, price").eq("published", true).gte("starts_at", agora).order("starts_at").limit(5),
    admin.from("live_events").select("title, starts_at").eq("published", true).lt("starts_at", agora).not("recording_url", "is", null).order("starts_at", { ascending: false }).limit(8),
  ]);

  const m = Object.fromEntries((cfg ?? []).map((r: any) => [r.key, r.value]));
  const mensal = Number(m.sub_price || 0);
  const anual = Number(m.sub_price_annual || 0);
  const pct = descontoAnual(mensal, anual);
  const linhas: string[] = ["=== DADOS ATUAIS DA PLATAFORMA (fonte da verdade) ==="];

  linhas.push(m.sales_open === "1" ? "Assinaturas: abertas, na página /matricula." : "Assinaturas: fechadas no momento (há lista de espera).");
  if (mensal > 0) linhas.push(`- Plano mensal: ${brl(mensal)} por mês, só no cartão de crédito, renova todo mês, cancela quando quiser.`);
  if (anual > 0) linhas.push(`- Plano anual: ${brl(anual)} à vista, no Pix ou cartão, vale 12 meses${pct > 0 ? ` (${pct}% de desconto sobre 12 mensalidades)` : ""}.`);

  if ((cursos ?? []).length) {
    linhas.push("", "Treinamentos (aparecem em Cursos, no menu do aluno):");
    for (const c of cursos ?? []) {
      const sp = c.subscriber_price == null ? null : Number(c.subscriber_price);
      const preco = sp == null ? "venda ainda não aberta" : sp === 0 ? "incluso na assinatura" : `${brl(sp)} para assinantes, no Pix à vista ou em até 12x no cartão`;
      linhas.push(`- ${c.title}${c.coming_soon ? " [EM BREVE, ainda sem aulas]" : ""}: ${preco}${c.workload ? `, ${c.workload}` : ""}.`);
    }
  } else {
    linhas.push("", "Treinamentos: nenhum publicado no momento.");
  }

  linhas.push("", (proximas ?? []).length ? "Próximos encontros ao vivo (Agenda):" : "Próximos encontros ao vivo: nenhum agendado no momento.");
  for (const l of proximas ?? []) {
    linhas.push(`- ${l.title} (${KIND[l.kind] || "live"}): ${dataHora(l.starts_at)}${l.duration_min ? `, ${l.duration_min} min` : ""}${Number(l.price) > 0 ? `, ingresso avulso ${brl(Number(l.price))} para quem não assina` : ""}.`);
  }

  linhas.push("", (gravacoes ?? []).length ? "Gravações disponíveis na Agenda:" : "Gravações: nenhuma publicada ainda.");
  for (const g of gravacoes ?? []) linhas.push(`- ${g.title} (${data(g.starts_at)})`);

  return linhas.join("\n");
}

/* O que é da pessoa que está perguntando. */
export async function contextoAluno(admin: SupabaseClient, user: { id: string; email?: string | null }): Promise<string> {
  const [{ data: perfil }, { data: matriculas }, { data: assinaturas }, { data: meusPontos }, { data: todosPontos }, { data: selos }, { count: certs }, { data: pedido }] = await Promise.all([
    admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    admin.from("enrollments").select("course_id, source").eq("user_id", user.id).neq("source", "free"),
    admin.from("memberships").select("status, source, expires_at").eq("user_id", user.id),
    admin.from("point_events").select("kind, points").eq("user_id", user.id),
    admin.from("point_events").select("user_id, points"),
    admin.from("user_badges").select("badge").eq("user_id", user.id),
    admin.from("certificates").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    admin.from("orders").select("product, status, amount, created_at").eq("email", (user.email || "").toLowerCase()).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const agora = Date.now();
  const ativa = (assinaturas ?? []).find((a: any) => a.status === "active" && (!a.expires_at || Date.parse(a.expires_at) > agora));
  const vencida = !ativa && (assinaturas ?? []).find((a: any) => a.expires_at && Date.parse(a.expires_at) <= agora);

  const totais: Record<string, number> = {};
  for (const e of todosPontos ?? []) totais[e.user_id] = (totais[e.user_id] || 0) + (e.points || 0);
  const pontos = totais[user.id] || 0;
  // Mesma regra do ranking: a equipe não ocupa posição de aluno.
  const equipe = await idsDaEquipe(admin);
  const posicao = equipe.has(user.id) ? -1 : Object.entries(totais).filter(([id]) => !equipe.has(id)).sort((a, b) => b[1] - a[1]).findIndex(([id]) => id === user.id);
  const porTipo: Record<string, number> = {};
  for (const e of meusPontos ?? []) porTipo[e.kind] = (porTipo[e.kind] || 0) + (e.points || 0);

  const linhas = ["=== DADOS DO ALUNO QUE ESTÁ PERGUNTANDO (use só quando ele perguntar sobre a própria conta) ==="];
  linhas.push(`- Primeiro nome: ${(perfil?.full_name || "").split(" ")[0] || "não informado"}`);
  linhas.push(
    ativa
      ? `- Assinatura: ATIVA${ativa.expires_at ? `, válida até ${data(ativa.expires_at)}` : ", sem data de fim"} (${ativa.source === "annual" ? "plano anual" : ativa.source === "admin" ? "liberada pelo time" : "assinatura"}). Essa data não aparece em nenhuma tela da plataforma: informe a data e não indique onde conferir.`
      : vencida
      ? `- Assinatura: VENCIDA em ${data(vencida.expires_at)}. Pode renovar em /matricula.`
      : "- Assinatura: não tem assinatura ativa."
  );
  if (pedido) linhas.push(`- Último pedido: ${PRODUTO[pedido.product] || pedido.product}, ${brl(Number(pedido.amount || 0))}, ${pedido.status === "paid" ? "pago" : pedido.status === "pending" ? "aguardando pagamento" : pedido.status}, feito em ${data(pedido.created_at)}.`);

  const ids = (matriculas ?? []).map((m: any) => m.course_id);
  if (ids.length) {
    const [{ data: cs }, { data: ls }, { data: pr }] = await Promise.all([
      admin.from("courses").select("id, title").in("id", ids),
      admin.from("lessons").select("course_id").in("course_id", ids),
      admin.from("lesson_progress").select("course_id").eq("user_id", user.id).eq("completed", true).in("course_id", ids),
    ]);
    const total: Record<string, number> = {};
    for (const l of ls ?? []) total[l.course_id] = (total[l.course_id] || 0) + 1;
    const feitas: Record<string, number> = {};
    for (const p of pr ?? []) feitas[p.course_id] = (feitas[p.course_id] || 0) + 1;
    linhas.push("- Treinamentos que ele tem:");
    for (const c of cs ?? []) {
      const t = total[c.id] || 0, d = feitas[c.id] || 0;
      linhas.push(`  - ${c.title}: ${t ? Math.round((d / t) * 100) : 0}% concluído (${d} de ${t} aulas)`);
    }
  } else {
    linhas.push("- Treinamentos que ele tem: nenhum.");
  }

  const detalhe = Object.entries(porTipo).map(([k, v]) => `${v} de ${PONTOS[k] || k}`).join(", ");
  linhas.push(`- Pontos: ${pontos}${detalhe ? ` (${detalhe})` : ""}. Posição no ranking: ${equipe.has(user.id) ? "não disputa (faz parte da equipe, o ranking é só de alunos)" : posicao >= 0 && pontos > 0 ? "#" + (posicao + 1) : "ainda sem pontos"}.`);
  const nomes = (selos ?? []).map((s: any) => SELOS[s.badge] || s.badge);
  linhas.push(`- Selos: ${nomes.length ? nomes.join(", ") : "nenhum"}. Certificados emitidos: ${certs ?? 0}.`);
  return linhas.join("\n");
}
