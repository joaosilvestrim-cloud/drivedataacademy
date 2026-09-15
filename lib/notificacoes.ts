import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/* Avisos por e-mail para o time (não para alunos). Quem recebe e quais avisos
   estão ligados ficam em site_settings, editáveis em Admin > Sistema >
   Notificações. Sem nada salvo, vale o comportamento antigo: todos ligados,
   indo para o primeiro e-mail de ADMIN_EMAILS. */

export const TIPOS_AVISO = {
  pedido: { titulo: "Novo pedido de assinatura", descricao: "Quando alguém preenche a página de assinatura, antes do pagamento confirmar." },
  chamado_ia: { titulo: "Chamado encaminhado pelo assistente", descricao: "Quando o assistente de IA passa uma conversa para o time." },
  chamado_ajuda: { titulo: "Chamado aberto na Central de Ajuda", descricao: "Quando um aluno abre um chamado pelo menu Ajuda." },
} as const;

export type TipoAviso = keyof typeof TIPOS_AVISO;
export type ConfigAvisos = { destinatarios: string[]; ativos: Record<TipoAviso, boolean> };

const CHAVE = "admin_notificacoes";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function configPadrao(): ConfigAvisos {
  const primeiro = (process.env.ADMIN_EMAILS || "").split(",")[0]?.trim();
  return {
    destinatarios: primeiro ? [primeiro] : [],
    ativos: { pedido: true, chamado_ia: true, chamado_ajuda: true },
  };
}

export async function lerConfigAvisos(admin?: SupabaseClient): Promise<ConfigAvisos & { salva: boolean }> {
  const padrao = configPadrao();
  try {
    const db = admin ?? createAdminClient();
    const { data } = await db.from("site_settings").select("value").eq("key", CHAVE).maybeSingle();
    if (!data?.value) return { ...padrao, salva: false };
    const j = JSON.parse(data.value);
    const destinatarios = Array.isArray(j.destinatarios) ? j.destinatarios.filter((e: unknown) => typeof e === "string" && EMAIL.test(e)) : padrao.destinatarios;
    const ativos = { ...padrao.ativos };
    for (const k of Object.keys(TIPOS_AVISO) as TipoAviso[]) if (typeof j.ativos?.[k] === "boolean") ativos[k] = j.ativos[k];
    return { destinatarios, ativos, salva: true };
  } catch {
    return { ...padrao, salva: false };
  }
}

export async function salvarConfigAvisos(admin: SupabaseClient, config: ConfigAvisos) {
  const limpo: ConfigAvisos = {
    destinatarios: Array.from(new Set(config.destinatarios.map((e) => e.trim().toLowerCase()).filter((e) => EMAIL.test(e)))),
    ativos: config.ativos,
  };
  return admin.from("site_settings").upsert({ key: CHAVE, value: JSON.stringify(limpo), updated_at: new Date().toISOString() }, { onConflict: "key" });
}

/* Manda o aviso para cada destinatário, se o tipo estiver ligado. Nunca lança:
   um aviso que falha não pode derrubar o pedido ou o chamado. */
export async function avisarTime(tipo: TipoAviso, enviar: (para: string) => Promise<unknown>) {
  try {
    const cfg = await lerConfigAvisos();
    if (!cfg.ativos[tipo] || !cfg.destinatarios.length) return;
    await Promise.all(cfg.destinatarios.map((para) => enviar(para).catch(() => null)));
  } catch { /* sem aviso, sem drama */ }
}
