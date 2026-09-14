import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import CourseForm from "../CourseForm";
import Curriculum from "../Curriculum";
import CourseStudents from "../CourseStudents";
import QuizBuilder from "../QuizBuilder";
import { deleteCourse, recalcularDuracoes } from "../actions";
import { cargaHoraria, minutosDoTexto, textoDosMinutos } from "@/lib/duracao";

export const dynamic = "force-dynamic";

export default async function EditCoursePage({ params, searchParams }: { params: { id: string }; searchParams: { ok?: string; error?: string } }) {
  const supabase = createAdminClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, slug, subtitle, description, cover_url, level, instructor_name, price, subscriber_price, workload, certificate_enabled, published, coming_soon, members_only")
    .eq("id", params.id)
    .single();

  if (!course) notFound();

  const [{ data: mods }, { data: lessons }] = await Promise.all([
    supabase.from("course_modules").select("id, title, available_at").eq("course_id", course.id).order("position"),
    supabase.from("lessons").select("id, module_id, title, type, video_id, video_provider, content, duration, is_preview, materials").eq("course_id", course.id).order("position"),
  ]);

  // Arquivos das aulas do tipo "materiais", agrupados por aula.
  const idsMateriais = (lessons ?? []).filter((l: any) => l.type === "materiais").map((l: any) => l.id);
  const { data: arquivos } = idsMateriais.length
    ? await supabase.from("ready_materials").select("id, lesson_id, title, description, file_name, file_size, external_url").in("lesson_id", idsMateriais).order("position")
    : { data: [] as any[] };
  const arquivosPorAula: Record<string, any[]> = {};
  for (const a of arquivos ?? []) (arquivosPorAula[a.lesson_id] ||= []).push(a);

  const modules = (mods ?? []).map((m: any) => ({
    ...m,
    lessons: (lessons ?? []).filter((l: any) => l.module_id === m.id).map((l: any) => ({ ...l, arquivos: arquivosPorAula[l.id] ?? [] })),
  }));

  const minutos = (lessons ?? []).reduce((t: number, l: any) => t + minutosDoTexto(l.duration), 0);
  const semDuracao = (lessons ?? []).filter((l: any) => !(l.duration || "").trim() && l.video_id).length;

  const { data: quizRow } = await supabase.from("quizzes").select("id, title, pass_score, max_attempts, cooldown_hours").eq("course_id", course.id).maybeSingle();
  let quiz: any = null;
  if (quizRow) {
    const { data: questions } = await supabase.from("quiz_questions").select("id, prompt, options").eq("quiz_id", quizRow.id).order("position");
    quiz = { ...quizRow, questions: questions ?? [] };
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/cursos" className="text-xs text-slate-500 hover:text-white">← Cursos</Link>
          <h1 className="mt-1 font-display text-2xl font-bold text-white">Editar curso</h1>
        </div>
        {course.published && (
          <a href={`/cursos/${course.slug}`} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-brand-green/50 hover:text-brand-green">
            Ver página do curso ↗
          </a>
        )}
      </div>

      {searchParams?.ok && (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm font-medium text-brand-green">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {searchParams.ok}
        </div>
      )}
      {searchParams?.error && (
        <div className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{searchParams.error}</div>
      )}

      <div className="mt-6">
        {/* Carga horária calculada das aulas. O botão some quando todas já têm duração. */}
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm">
          <span className="text-slate-300">Conteúdo somado das aulas: <strong className="text-white">{minutos ? textoDosMinutos(minutos) : "sem duração"}</strong>{minutos ? ` · no certificado: ${course.workload || cargaHoraria(minutos)}` : ""}</span>
          {semDuracao > 0 && (
            <form action={recalcularDuracoes}>
              <input type="hidden" name="course_id" value={course.id} />
              <button className="rounded-lg border border-brand-green/40 px-3 py-1.5 text-xs font-semibold text-brand-green hover:bg-brand-green/10">Buscar duração de {semDuracao} aula(s) no YouTube e Panda</button>
            </form>
          )}
        </div>
        <CourseForm course={course} cargaCalculada={cargaHoraria(minutos)} />
      </div>

      <Curriculum courseId={course.id} modules={modules} />

      <QuizBuilder courseId={course.id} quiz={quiz} />
      <div className="mt-6 rounded-xl border border-teal-300/20 bg-teal-950/20 p-5"><h2 className="font-semibold text-teal-100">Knowledge Universe 4D</h2><p className="mt-2 text-sm text-slate-400">Associe competências e pesos deste treinamento no catálogo do Universo.</p><Link href="/admin/universo" className="mt-3 inline-block text-sm text-teal-200">Configurar competências →</Link></div>

      <CourseStudents courseId={course.id} totalLessons={(lessons ?? []).length} />

      <form action={deleteCourse} className="mt-12 border-t border-white/8 pt-6">
        <input type="hidden" name="id" value={course.id} />
        <button className="rounded-lg border border-red-400/20 px-4 py-2 text-xs font-medium text-red-400/80 hover:border-red-400/50 hover:text-red-400">
          Excluir curso
        </button>
      </form>
    </div>
  );
}
