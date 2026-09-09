import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { knowledgeAccess, catalogVersions, KnowledgeSetupError } from "@/lib/knowledge/server";
import DiagnosticForm from "./DiagnosticForm";

export const dynamic = "force-dynamic";

export default async function DiagnosticoPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?next=/conta/diagnostico");

  const admin = createAdminClient();
  let liberado = false;
  try { liberado = await knowledgeAccess(user.id, user.email); } catch { liberado = false; }
  if (!liberado) {
    return (
      <div className="max-w-xl">
        <p className="text-sm font-medium uppercase tracking-wide text-brand-green">Diagnóstico</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-white">Diagnóstico de entrada</h1>
        <p className="mt-3 text-sm text-slate-400">Faz parte do Knowledge Universe, incluído na assinatura ativa.</p>
        <Link href="/matricula" className="mt-6 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900">Conhecer a assinatura</Link>
      </div>
    );
  }

  let nameByCompetency: Record<string, string> = {};
  try {
    const doc = (await catalogVersions()).at(-1)?.document;
    for (const c of doc?.competencies ?? []) nameByCompetency[c.id] = c.name;
  } catch (error) {
    if (error instanceof KnowledgeSetupError) {
      return (
        <div className="max-w-xl">
          <h1 className="font-display text-3xl font-bold text-white">Em preparação</h1>
          <p className="mt-3 text-sm text-slate-400">A estrutura de conhecimento ainda está sendo montada.</p>
        </div>
      );
    }
  }

  const [{ data: attempt }, { data: questions }] = await Promise.all([
    admin.from("ku_diagnostic_attempts").select("results, completed_at").eq("user_id", user.id).maybeSingle(),
    admin.from("ku_diagnostic_questions").select("id, competency, prompt, options, position").eq("published", true).order("position"),
  ]);

  const header = (
    <>
      <p className="text-sm font-medium uppercase tracking-wide text-brand-green">Diagnóstico</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-white">Diagnóstico de entrada</h1>
    </>
  );

  if (attempt) {
    const results = (attempt.results ?? {}) as Record<string, { acertos: number; total: number; quality: number }>;
    const linhas = Object.entries(results).sort((a, b) => b[1].quality - a[1].quality);
    return (
      <div className="max-w-2xl">
        {header}
        <p className="mt-2 text-sm text-slate-400">
          Respondido em {new Date(attempt.completed_at).toLocaleDateString("pt-BR")}. O diagnóstico é feito uma vez, porque
          serve como ponto de partida do seu mapa.
        </p>
        <div className="mt-6 space-y-2">
          {linhas.map(([competency, r]) => (
            <div key={competency} className="flex items-center gap-4 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
              <span className="min-w-0 flex-1 truncate text-sm text-white">{nameByCompetency[competency] || competency}</span>
              <span className="text-xs text-slate-400">{r.acertos}/{r.total}</span>
              <div className="h-2 w-24 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-brand-green to-brand-blue" style={{ width: `${Math.round(r.quality * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-slate-400">
          Daqui pra frente seu mapa cresce com aulas, avaliações e desafios entregues.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/universo" target="_blank" rel="noreferrer" className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900">Ver meu universo ↗</Link>
          <Link href="/conta/desafios" className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-slate-200 hover:border-brand-green/50 hover:text-brand-green">Ir para os desafios</Link>
        </div>
      </div>
    );
  }

  if (!questions?.length) {
    return (
      <div className="max-w-xl">
        {header}
        <p className="mt-3 text-sm text-slate-400">O diagnóstico ainda não foi publicado pela equipe.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {header}
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        São {questions.length} perguntas rápidas. Elas dão o ponto de partida do seu mapa de competências.
        Acertos viram evidência real; o que você não souber agora fica apenas como espaço para aprender.
        Você responde uma vez só.
      </p>
      <DiagnosticForm
        questions={(questions ?? []).map((q: any) => ({
          id: q.id,
          prompt: q.prompt,
          options: Array.isArray(q.options) ? q.options.map(String) : [],
          competencyName: nameByCompetency[q.competency] || q.competency,
        }))}
      />
    </div>
  );
}
