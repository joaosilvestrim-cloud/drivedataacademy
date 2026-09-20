import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { listaTraduzida } from "@/lib/i18n/conteudo";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasFullAccess } from "@/lib/access";

/* Memória de uma requisição só.

   Layout e página renderizam na mesma passada, e os dois precisam do usuário,
   da assinatura e do contador do menu. Sem memória, cada um fazia sua própria
   ida ao Supabase: `getUser()` é chamada de rede, não leitura de cookie, e o
   banco está em São Paulo. Eram três a cinco idas repetidas por clique.

   `cache()` do React guarda o resultado pelo tempo da requisição. Nada fica
   guardado entre requisições, então não há risco de um aluno ver o dado do
   outro: a próxima navegação recomeça do zero. */

export const usuarioAtual = cache(async () => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

export const assinaturaAtiva = cache(async (userId: string) => {
  return hasFullAccess(createAdminClient(), userId);
});

/* Quantos treinamentos estão abertos para compra e o aluno ainda não tem.
   É o selo ao lado de "Cursos" no menu. Duas leituras curtas, em paralelo. */
export const treinamentosAVenda = cache(async (userId: string) => {
  try {
    const admin = createAdminClient();
    const [{ data: abertos }, { data: matriculas }] = await Promise.all([
      admin
        .from("courses")
        .select("id")
        .eq("published", true)
        .eq("access_mode", "catalogo")
        .eq("coming_soon", false)
        .not("subscriber_price", "is", null),
      admin.from("enrollments").select("course_id").eq("user_id", userId).neq("source", "free"),
    ]);
    const meus = new Set((matriculas ?? []).map((m: any) => m.course_id));
    return (abertos ?? []).filter((c: any) => !meus.has(c.id)).length;
  } catch {
    return 0;
  }
});

/* Próximos encontros para a faixa do topo da área do aluno. Só o que está
   publicado e ainda não acabou: uma live que começou há meia hora continua na
   faixa, porque ainda dá para entrar. */
export type EventoFaixa = { id: string; title: string; starts_at: string; kind: string | null };

export const proximosEventos = cache(async (): Promise<EventoFaixa[]> => {
  try {
    const desde = new Date(Date.now() - 2 * 3600_000).toISOString();
    const { data } = await createAdminClient()
      .from("live_events")
      .select("id, title, starts_at, kind, duration_min")
      .eq("published", true)
      .gte("starts_at", desde)
      .order("starts_at", { ascending: true })
      .limit(8);
    const agora = Date.now();
    const vivos = (data ?? []).filter((e: any) => Date.parse(e.starts_at) + (Number(e.duration_min) || 120) * 60_000 > agora);
    // A faixa fica no topo de toda tela do aluno, então o título do evento
    // sai no idioma dela quando existe tradução.
    const traduzidos = await listaTraduzida("live_events", vivos as any[]);
    return traduzidos.map((e: any) => ({ id: e.id, title: e.title, starts_at: e.starts_at, kind: e.kind }));
  } catch {
    return [];
  }
});
