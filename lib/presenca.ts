import "server-only";
import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { textoDosMinutos } from "@/lib/duracao";

/* Presença em live: a pessoa lê o QR code, confirma que estava assistindo e
   recebe o certificado de participação na hora.

   A live elegível é a que tem certificado ligado e está acontecendo agora, com
   folga para quem chega atrasado ou preenche depois que acabou. Fora dessa
   janela o formulário não aparece, senão vira certificado de graça. */

export const JANELA_ANTES_MIN = 30;   // já libera meia hora antes de começar
export const JANELA_DEPOIS_H = 12;    // e segue aberto no resto do dia

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

/* A live do momento. Com id explícito, valida esse id. Sem id, pega a que está
   na janela agora; se nenhuma estiver, devolve a próxima só para explicar ao
   visitante quando abre. */
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
    .gte("starts_at", new Date(agora - JANELA_DEPOIS_H * 3600e3).toISOString())
    .order("starts_at")
    .limit(5);

  const lives = (data ?? []) as LiveDePresenca[];
  const aberta = lives.find((l) => dentroDaJanela(l, agora));
  return { live: aberta || lives[0] || null, aberta: !!aberta };
}

export function dentroDaJanela(live: LiveDePresenca, agora = Date.now()): boolean {
  const inicio = new Date(live.starts_at).getTime();
  return agora >= inicio - JANELA_ANTES_MIN * 60e3 && agora <= inicio + JANELA_DEPOIS_H * 3600e3;
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
