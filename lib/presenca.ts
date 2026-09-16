import "server-only";
import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { textoDosMinutos } from "@/lib/duracao";

/* Presença em live: a pessoa lê o QR code, confirma que estava assistindo e
   recebe o certificado de participação na hora.

   A live elegível é a que tem certificado ligado e já começou. Antes disso o
   formulário não aparece, senão vira certificado de graça antes da aula. */

export const JANELA_ANTES_MIN = 30;   // já libera meia hora antes de começar

export type LiveDePresenca = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  duration_min: number | null;
  attendance_code: string | null;
  certificate_hours: string | null;
};

const CAMPOS = "id, title, description, starts_at, duration_min, attendance_code, certificate_hours";

/* A live do momento. Com id explícito, valida esse id. Sem id, pega a mais
   recente que já abriu; se nenhuma abriu, devolve a próxima só para explicar ao
   visitante quando abre.

   Não existe prazo de fechamento. Quem assistiu uma live de semanas atrás e
   perdeu o link continua emitindo o certificado. Fechar é decisão do time:
   basta desmarcar o certificado na live. */
export async function liveDePresenca(admin: SupabaseClient, id?: string | null) {
  const agora = Date.now();
  if (id) {
    const { data } = await admin.from("live_events").select(CAMPOS).eq("id", id).eq("certificate_enabled", true).maybeSingle();
    return { live: (data as LiveDePresenca) || null, aberta: data ? dentroDaJanela(data as LiveDePresenca, agora) : false };
  }

  const { data } = await admin
    .from("live_events")
    .select(CAMPOS)
    .eq("certificate_enabled", true)
    .order("starts_at", { ascending: false })
    .limit(30);

  const lives = (data ?? []) as LiveDePresenca[];
  const aberta = lives.find((l) => dentroDaJanela(l, agora));          // desc: a mais recente já aberta
  const proxima = [...lives].reverse().find((l) => new Date(l.starts_at).getTime() > agora);
  return { live: aberta || proxima || lives[0] || null, aberta: !!aberta };
}

export function dentroDaJanela(live: LiveDePresenca, agora = Date.now()): boolean {
  return agora >= new Date(live.starts_at).getTime() - JANELA_ANTES_MIN * 60e3;
}

// Carga horária impressa no certificado: o campo do admin manda, senão a duração.
export function cargaDaLive(live: LiveDePresenca): string {
  const manual = (live.certificate_hours || "").trim();
  if (manual) return manual;
  return live.duration_min ? textoDosMinutos(live.duration_min) : "";
}

export function normalizarCodigo(valor: string | null | undefined): string {
  return String(valor || "").trim().toLowerCase().replace(/\s+/g, "");
}

export function novoCodigoCertificado(): string {
  return "DDA-" + randomBytes(4).toString("hex").toUpperCase();
}

/* Emite (ou reaproveita) o certificado de participação. É idempotente pelo par
   live + e-mail: quem preencher duas vezes cai no mesmo certificado. */
export async function emitirCertificadoDeParticipacao(
  admin: SupabaseClient,
  live: LiveDePresenca,
  pessoa: { name: string; email: string }
): Promise<{ code: string; novo: boolean }> {
  const email = pessoa.email.trim().toLowerCase();
  const { data: existente } = await admin
    .from("certificates")
    .select("code")
    .eq("live_id", live.id)
    .eq("email", email)
    .maybeSingle();
  if (existente?.code) return { code: existente.code, novo: false };

  const code = novoCodigoCertificado();
  await admin.from("certificates").insert({
    user_id: null,
    course_id: null,
    live_id: live.id,
    kind: "live",
    code,
    email,
    student_name: pessoa.name.trim(),
    course_title: live.title,
    workload: cargaDaLive(live) || null,
  });
  return { code, novo: true };
}
