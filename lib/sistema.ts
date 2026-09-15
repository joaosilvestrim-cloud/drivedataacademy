import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/* Checagens da saúde da plataforma, usadas em Admin > Sistema. Cada checagem
   falha sozinha e devolve o motivo em português, sem derrubar a página. */

export type Check = { nome: string; ok: boolean | null; detalhe: string };

const ASAAS_BASE = process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";

/* Nunca devolve o valor bruto quando ele é inválido: se alguém colar uma chave
   no lugar do remetente, a tela não pode exibir a chave. */
function remetente(valor: string | undefined): string {
  const raw = (valor || "").trim().replace(/^["']|["']$/g, "");
  const email = raw.match(/[^\s<>"']+@[^\s<>"']+\.[^\s<>"']+/)?.[0];
  if (email) return raw;
  if (!raw) return "não definido";
  if (/^re_[A-Za-z0-9_]{10,}$/.test(raw)) return "inválido: contém uma chave de API do Resend, não um endereço de e-mail (valor oculto)";
  return `inválido: não é um endereço de e-mail (valor oculto, ${raw.length} caracteres)`;
}

async function comTempo<T>(fn: (sinal: AbortSignal) => Promise<T>, ms = 6000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fn(ctrl.signal); } finally { clearTimeout(t); }
}

/* Serviços externos: cobrança, e-mail, IA, vídeo. */
export async function checarIntegracoes(): Promise<Check[]> {
  const checks: Check[] = [];

  const asaasKey = process.env.ASAAS_API_KEY;
  if (!asaasKey) checks.push({ nome: "Asaas (cobranças)", ok: false, detalhe: "ASAAS_API_KEY ausente. Nenhum pagamento pode ser gerado." });
  else {
    try {
      const r = await comTempo((signal) => fetch(`${ASAAS_BASE}/customers?limit=1`, { headers: { access_token: asaasKey }, cache: "no-store", signal }));
      checks.push({ nome: "Asaas (cobranças)", ok: r.ok, detalhe: r.ok ? `Chave válida. API ${ASAAS_BASE.includes("sandbox") ? "de testes" : "de produção"} respondendo.` : `API respondeu ${r.status}. Confira a chave na Vercel.` });
    } catch { checks.push({ nome: "Asaas (cobranças)", ok: false, detalhe: "Sem resposta da API em 6 segundos." }); }
  }

  checks.push({
    nome: "Webhook do Asaas",
    ok: !!process.env.ASAAS_WEBHOOK_TOKEN,
    detalhe: process.env.ASAAS_WEBHOOK_TOKEN
      ? "Token configurado. O Asaas precisa enviar o mesmo token para academy.drivedata.com.br/api/webhooks/asaas."
      : "ASAAS_WEBHOOK_TOKEN ausente: o webhook aceita qualquer chamada.",
  });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) checks.push({ nome: "Resend (e-mails)", ok: false, detalhe: "RESEND_API_KEY ausente. Nenhum e-mail sai." });
  else {
    try {
      const r = await comTempo((signal) => fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${resendKey}` }, cache: "no-store", signal }));
      const j = r.ok ? await r.json() : null;
      const verificados = ((j?.data ?? []) as any[]).filter((d) => d.status === "verified").map((d) => d.name);
      checks.push({ nome: "Resend (e-mails)", ok: r.ok && verificados.length > 0, detalhe: r.ok ? (verificados.length ? `Domínios verificados: ${verificados.join(", ")}.` : "Chave válida, mas nenhum domínio verificado.") : `API respondeu ${r.status}.` });
    } catch { checks.push({ nome: "Resend (e-mails)", ok: false, detalhe: "Sem resposta da API em 6 segundos." }); }
  }

  const fromConta = remetente(process.env.RESEND_FROM_CONTA);
  checks.push({
    nome: "Remetente dos e-mails de acesso",
    ok: !fromConta.startsWith("inválido") && fromConta !== "não definido",
    detalhe: `RESEND_FROM_CONTA: ${fromConta}. RESEND_FROM: ${remetente(process.env.RESEND_FROM)}.`,
  });

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) checks.push({ nome: "Groq (assistente de IA)", ok: false, detalhe: "GROQ_API_KEY ausente. O assistente encaminha tudo para o time." });
  else {
    try {
      const r = await comTempo((signal) => fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${groqKey}` }, cache: "no-store", signal }));
      const modelo = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
      const lista = r.ok ? (((await r.json())?.data ?? []) as any[]).map((m) => m.id) : [];
      checks.push({ nome: "Groq (assistente de IA)", ok: r.ok && lista.includes(modelo), detalhe: r.ok ? (lista.includes(modelo) ? `Chave válida. Modelo em uso: ${modelo}.` : `Chave válida, mas o modelo ${modelo} não está disponível.`) : `API respondeu ${r.status}.` });
    } catch { checks.push({ nome: "Groq (assistente de IA)", ok: false, detalhe: "Sem resposta da API em 6 segundos." }); }
  }

  checks.push({ nome: "Panda (vídeos)", ok: process.env.PANDA_API_KEY ? true : null, detalhe: process.env.PANDA_API_KEY ? "Chave configurada: a duração das aulas é lida automaticamente." : "Sem chave: a duração das aulas do Panda fica em branco." });
  checks.push({ nome: "Supabase (banco e login)", ok: !!process.env.SUPABASE_SERVICE_ROLE_KEY && !!process.env.NEXT_PUBLIC_SUPABASE_URL, detalhe: process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/^https?:\/\//, "")}` : "URL ausente." });
  checks.push({ nome: "Administradores", ok: !!process.env.ADMIN_EMAILS, detalhe: process.env.ADMIN_EMAILS ? `${process.env.ADMIN_EMAILS.split(",").filter(Boolean).length} e-mail(s) com acesso ao admin. Quem recebe os avisos do time se define em Sistema > Notificações.` : "ADMIN_EMAILS ausente." });

  return checks;
}

/* Estrutura do banco: cada migration que o código espera, conferida pela
   presença da coluna ou tabela que ela cria. */
const ESTRUTURA: { nome: string; tabela: string; coluna: string }[] = [
  { nome: "Pedidos", tabela: "orders", coluna: "id" },
  { nome: "Pedido de treinamento avulso", tabela: "orders", coluna: "course_id" },
  { nome: "Cupons no pedido", tabela: "orders", coluna: "coupon_code" },
  { nome: "Assinaturas", tabela: "memberships", coluna: "expires_at" },
  { nome: "Cupons", tabela: "coupons", coluna: "code" },
  { nome: "Uso de cupons", tabela: "coupon_redemptions", coluna: "coupon_id" },
  { nome: "Registro de e-mails", tabela: "email_log", coluna: "status" },
  { nome: "Preço de assinante nos cursos", tabela: "courses", coluna: "subscriber_price" },
  { nome: "Cursos Em breve", tabela: "courses", coluna: "coming_soon" },
  { nome: "Gravação das lives", tabela: "live_events", coluna: "recording_url" },
  { nome: "Aula de materiais", tabela: "ready_materials", coluna: "lesson_id" },
  { nome: "Chamados", tabela: "support_tickets", coluna: "status" },
  { nome: "Conversas do assistente", tabela: "ai_chat_logs", coluna: "escalated" },
  { nome: "Pontos do ranking", tabela: "point_events", coluna: "kind" },
];

export async function checarBanco(admin: SupabaseClient): Promise<Check[]> {
  return Promise.all(
    ESTRUTURA.map(async (e) => {
      const { error } = await admin.from(e.tabela).select(e.coluna).limit(1);
      return { nome: e.nome, ok: !error, detalhe: error ? `Falta ${e.tabela}.${e.coluna}: rode a migration correspondente.` : `${e.tabela}.${e.coluna}` };
    })
  );
}

/* Buckets do Storage que o código usa, e se a visibilidade está certa. */
const BUCKETS: { nome: string; publico: boolean; uso: string }[] = [
  { nome: "materiais-prontos", publico: false, uso: "arquivos das aulas de materiais" },
  { nome: "blog", publico: true, uso: "capas dos artigos" },
  { nome: "covers", publico: true, uso: "capas de cursos e lives" },
  { nome: "avatars", publico: true, uso: "fotos de perfil" },
  { nome: "community", publico: true, uso: "anexos da comunidade" },
];

export async function checarStorage(admin: SupabaseClient): Promise<Check[]> {
  const { data, error } = await admin.storage.listBuckets();
  if (error) return [{ nome: "Storage", ok: false, detalhe: error.message }];
  const mapa = new Map((data ?? []).map((b: any) => [b.name, b.public]));
  return BUCKETS.map((b) => {
    if (!mapa.has(b.nome)) return { nome: b.nome, ok: false, detalhe: `Bucket ausente (${b.uso}).` };
    const certo = mapa.get(b.nome) === b.publico;
    return { nome: b.nome, ok: certo, detalhe: certo ? `${b.publico ? "Público" : "Privado"}, ${b.uso}.` : `Deveria ser ${b.publico ? "público" : "privado"} (${b.uso}).` };
  });
}

/* Números da operação para o topo da página. */
export async function resumoOperacao(admin: SupabaseClient) {
  const desde7 = new Date(Date.now() - 7 * 864e5).toISOString();
  const desde30 = new Date(Date.now() - 30 * 864e5).toISOString();
  const seguro = async <T,>(fn: () => Promise<T>, padrao: T): Promise<T> => { try { return await fn(); } catch { return padrao; } };

  const [pedidos30, emails7, ultimaFalha, ia7, chamados, ultimoPago] = await Promise.all([
    seguro(async () => (await admin.from("orders").select("status, amount").gte("created_at", desde30)).data ?? [], [] as any[]),
    seguro(async () => (await admin.from("email_log").select("status").gte("created_at", desde7)).data ?? [], [] as any[]),
    seguro(async () => (await admin.from("email_log").select("to_email, subject, reason, created_at").eq("status", "failed").order("created_at", { ascending: false }).limit(1).maybeSingle()).data, null as any),
    seguro(async () => (await admin.from("ai_chat_logs").select("escalated").gte("created_at", desde7)).data ?? [], [] as any[]),
    seguro(async () => (await admin.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open")).count ?? 0, 0),
    seguro(async () => (await admin.from("orders").select("email, product, amount, updated_at").eq("status", "paid").order("updated_at", { ascending: false }).limit(1).maybeSingle()).data, null as any),
  ]);

  const pagos = pedidos30.filter((p: any) => p.status === "paid");
  return {
    pedidosPagos30: pagos.length,
    receita30: pagos.reduce((t: number, p: any) => t + Number(p.amount || 0), 0),
    pedidosPendentes30: pedidos30.filter((p: any) => p.status === "pending").length,
    emailsEnviados7: emails7.filter((e: any) => e.status === "sent").length,
    emailsFalhos7: emails7.filter((e: any) => e.status === "failed").length,
    ultimaFalhaEmail: ultimaFalha,
    conversasIa7: ia7.length,
    encaminhadasIa7: ia7.filter((c: any) => c.escalated).length,
    chamadosAbertos: chamados,
    ultimoPagamento: ultimoPago,
  };
}

/* Versão publicada, a partir das variáveis que a Vercel injeta no build. */
export function infoDeploy() {
  return {
    ambiente: process.env.VERCEL_ENV || (process.env.NODE_ENV === "production" ? "production" : "local"),
    commit: process.env.VERCEL_GIT_COMMIT_SHA ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7) : null,
    mensagem: process.env.VERCEL_GIT_COMMIT_MESSAGE || null,
    branch: process.env.VERCEL_GIT_COMMIT_REF || null,
    regiao: process.env.VERCEL_REGION || null,
    site: process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br",
  };
}
