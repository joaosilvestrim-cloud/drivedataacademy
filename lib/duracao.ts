import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { youtubeId } from "@/lib/youtube";

/* Duração das aulas e carga horária do curso.

   O campo `duration` das aulas é texto livre ("12 min", "1h 20min", "01:15:30")
   e a maioria das aulas do Panda está vazia. Este módulo faz três coisas:
   lê esse texto como minutos, busca a duração real no provedor quando o campo
   está em branco, e soma tudo em carga horária para o curso. */

// "12 min" -> 12 · "1h 20min" -> 80 · "01:15:30" -> 76 · "45" -> 45 · "2 h" -> 120
export function minutosDoTexto(raw: string | null | undefined): number {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return 0;

  // hh:mm:ss ou mm:ss
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
    const p = s.split(":").map(Number);
    const seg = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
    return Math.round(seg / 60);
  }

  let total = 0;
  const h = s.match(/(\d+(?:[.,]\d+)?)\s*h/);
  const m = s.match(/(\d+)\s*(?:min|m\b)/);
  if (h) total += Number(h[1].replace(",", ".")) * 60;
  if (m) total += Number(m[1]);
  if (!h && !m && /^\d+$/.test(s)) total = Number(s); // número puro vale como minutos
  return Math.round(total);
}

export function textoDosMinutos(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r ? `${h}h ${r}min` : `${h}h`;
}

/* Carga horária para certificado e página do curso. Arredonda para cima em
   horas cheias a partir de uma hora, que é como carga horária costuma ser
   declarada: 3h10 de vídeo vira "4 horas". Abaixo de uma hora, fica em minutos. */
export function cargaHoraria(min: number): string | null {
  if (min <= 0) return null;
  if (min < 60) return `${min} minutos`;
  const h = Math.ceil(min / 60);
  return `${h} ${h === 1 ? "hora" : "horas"}`;
}

// ---------- duração real no provedor ----------

async function segundosNoYoutube(videoRef: string): Promise<number | null> {
  const id = youtubeId(videoRef);
  if (!id) return null;
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${id}`, {
      headers: { "accept-language": "pt-BR", "user-agent": "Mozilla/5.0" },
      cache: "no-store",
    });
    const html = await res.text();
    const m = html.match(/"lengthSeconds":"(\d+)"/);
    const seg = m ? Number(m[1]) : 0;
    return seg > 0 ? seg : null; // live agendada devolve 0: melhor não gravar nada
  } catch {
    return null;
  }
}

function pandaId(videoRef: string): string | null {
  const m = String(videoRef || "").match(/[?&]v=([0-9a-f-]{36})/i) || String(videoRef || "").match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return m ? m[1] : null;
}

async function segundosNoPanda(videoRef: string): Promise<number | null> {
  const key = process.env.PANDA_API_KEY;
  const id = pandaId(videoRef);
  if (!key || !id) return null;
  try {
    const res = await fetch(`https://api-v2.pandavideo.com.br/videos/${id}`, {
      headers: { Authorization: key, accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const j: any = await res.json();
    const seg = Number(j?.length ?? j?.duration ?? 0);
    return seg > 0 ? seg : null;
  } catch {
    return null;
  }
}

/* Devolve o texto de duração ("12 min") buscado no provedor, ou null quando
   não dá para descobrir. Nunca lança: aula salva sem duração é melhor do que
   aula que não salva porque o YouTube demorou. */
export async function duracaoNoProvedor(provider: string | null, videoRef: string | null): Promise<string | null> {
  if (!videoRef) return null;
  const seg = provider === "panda" ? await segundosNoPanda(videoRef) : await segundosNoYoutube(videoRef);
  if (!seg) return null;
  return textoDosMinutos(Math.max(1, Math.round(seg / 60)));
}

// Minutos somados de todas as aulas do curso, lidos do campo de duração.
export async function minutosDoCurso(admin: SupabaseClient, courseId: string): Promise<number> {
  const { data } = await admin.from("lessons").select("duration").eq("course_id", courseId);
  return (data ?? []).reduce((t: number, l: any) => t + minutosDoTexto(l.duration), 0);
}
