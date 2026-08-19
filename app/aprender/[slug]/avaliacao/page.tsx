import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccessCourse } from "@/lib/access";
import { gradeQuiz } from "../quizActions";

export const dynamic = "force-dynamic";

export default async function AvaliacaoPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { attempt?: string; blocked?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  const { data: course } = await admin.from("courses").select("id, slug, title").eq("slug", params.slug).maybeSingle();
  if (!course) notFound();

  if (!(await canAccessCourse(admin, user.id, course.id))) redirect(`/cursos/${params.slug}`);

  const { data: quiz } = await admin.from("quizzes").select("id, title, pass_score, max_attempts, cooldown_hours").eq("course_id", course.id).eq("published", true).maybeSingle();
  if (!quiz) redirect(`/aprender/${params.slug}`);

  const { data: questions } = await admin.from("quiz_questions").select("id, prompt, options").eq("quiz_id", quiz.id).order("position");
  const qs = questions ?? [];

  const { data: attempts } = await admin.from("quiz_attempts").select("id, score, passed, answers, created_at").eq("user_id", user.id).eq("quiz_id", quiz.id).order("created_at", { ascending: false });
  const list = attempts ?? [];
  const bestPassed = list.find((a: any) => a.passed);

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-ink-900">
      <header className="border-b border-white/10 px-6 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link href={`/aprender/${params.slug}`} className="text-sm text-slate-400 hover:text-white">← Voltar ao curso</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
    </div>
  );

  // ---- Resultado de uma tentativa ----
  const attempt = searchParams.attempt ? list.find((a: any) => a.id === searchParams.attempt) : null;
  if (attempt) {
    return (
      <Shell>
        <div className={`rounded-2xl border p-6 text-center ${attempt.passed ? "border-brand-green/30 bg-brand-green/10" : "border-amber-400/30 bg-amber-400/10"}`}>
          <p className="font-display text-3xl font-bold text-white">{attempt.score}%</p>
          <p className={`mt-1 font-semibold ${attempt.passed ? "text-brand-green" : "text-amber-300"}`}>
            {attempt.passed ? "Aprovado! 🎉" : `Não atingiu a nota mínima (${quiz.pass_score}%)`}
          </p>
        </div>
        <div className="mt-6 space-y-4">
          {qs.map((q: any, i: number) => {
            const picked = (attempt.answers ?? {})[q.id];
            const opts = q.options as any[];
            return (
              <div key={q.id} className="glass rounded-2xl border border-white/8 p-5">
                <p className="font-medium text-white">{i + 1}. {q.prompt}</p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {opts.map((o: any, idx: number) => {
                    const isPicked = picked === idx;
                    const cls = o.correct ? "text-brand-green" : isPicked ? "text-red-400" : "text-slate-400";
                    return <li key={idx} className={cls}>{o.correct ? "✓" : isPicked ? "✕" : "•"} {o.text}{isPicked ? " (sua resposta)" : ""}</li>;
                  })}
                </ul>
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex items-center gap-3">
          {attempt.passed ? (
            <Link href={`/aprender/${params.slug}`} className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900">Voltar ao curso</Link>
          ) : (
            <Link href={`/aprender/${params.slug}/avaliacao`} className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900">Tentar novamente</Link>
          )}
        </div>
      </Shell>
    );
  }

  // ---- Já aprovado ----
  if (bestPassed) {
    return (
      <Shell>
        <div className="rounded-2xl border border-brand-green/30 bg-brand-green/10 p-6 text-center">
          <p className="font-display text-2xl font-bold text-white">Você já foi aprovado 🎉</p>
          <p className="mt-1 text-brand-green">Nota: {bestPassed.score}%</p>
          <Link href={`/aprender/${params.slug}/avaliacao?attempt=${bestPassed.id}`} className="mt-4 inline-block text-sm text-slate-300 hover:underline">Ver gabarito</Link>
        </div>
      </Shell>
    );
  }

  // ---- Bloqueado por cooldown ----
  const blocked = searchParams.blocked === "1" || (list.length >= quiz.max_attempts && quiz.cooldown_hours > 0 && (Date.now() - new Date(list[0].created_at).getTime()) < quiz.cooldown_hours * 3600 * 1000);
  if (blocked) {
    return (
      <Shell>
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-6 text-center">
          <p className="font-display text-xl font-bold text-white">Tentativas esgotadas</p>
          <p className="mt-2 text-sm text-amber-200">Você usou as {quiz.max_attempts} tentativas. Aguarde {quiz.cooldown_hours}h para tentar de novo e revise o conteúdo.</p>
        </div>
      </Shell>
    );
  }

  const attemptsLeft = Math.max(0, quiz.max_attempts - list.length);

  // ---- Formulário do quiz ----
  return (
    <Shell>
      <h1 className="font-display text-2xl font-bold text-white">{quiz.title}</h1>
      <p className="mt-1 text-sm text-slate-400">Nota mínima: {quiz.pass_score}% · Tentativas restantes: {attemptsLeft || quiz.max_attempts}</p>

      {qs.length === 0 ? (
        <p className="mt-6 text-slate-400">Esta avaliação ainda não tem perguntas.</p>
      ) : (
        <form action={gradeQuiz} className="mt-6 space-y-4">
          <input type="hidden" name="slug" value={params.slug} />
          <input type="hidden" name="quiz_id" value={quiz.id} />
          <input type="hidden" name="course_id" value={course.id} />
          {qs.map((q: any, i: number) => (
            <div key={q.id} className="glass rounded-2xl border border-white/8 p-5">
              <p className="font-medium text-white">{i + 1}. {q.prompt}</p>
              <div className="mt-3 space-y-2">
                {(q.options as any[]).map((o: any, idx: number) => (
                  <label key={idx} className="flex items-center gap-2.5 text-sm text-slate-200">
                    <input type="radio" name={`q_${q.id}`} value={idx} required className="h-4 w-4 accent-emerald-400" />
                    {o.text}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">Enviar respostas</button>
        </form>
      )}
    </Shell>
  );
}
