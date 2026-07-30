import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import CourseForm from "../CourseForm";
import Curriculum from "../Curriculum";
import CourseStudents from "../CourseStudents";
import { deleteCourse } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditCoursePage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, slug, subtitle, description, cover_url, level, instructor_name, price, workload, published")
    .eq("id", params.id)
    .single();

  if (!course) notFound();

  const [{ data: mods }, { data: lessons }] = await Promise.all([
    supabase.from("course_modules").select("id, title").eq("course_id", course.id).order("position"),
    supabase.from("lessons").select("id, module_id, title, type, video_id, content, duration, is_preview").eq("course_id", course.id).order("position"),
  ]);

  const modules = (mods ?? []).map((m: any) => ({
    ...m,
    lessons: (lessons ?? []).filter((l: any) => l.module_id === m.id),
  }));

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

      <div className="mt-6">
        <CourseForm course={course} />
      </div>

      <Curriculum courseId={course.id} modules={modules} />

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
