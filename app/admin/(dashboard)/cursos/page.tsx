import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminError from "../AdminError";
import { togglePublishCourse } from "./actions";

export const dynamic = "force-dynamic";

export default async function CoursesAdminPage() {
  let courses: any[] = [];
  const lessonCounts: Record<string, number> = {};
  const enrollCounts: Record<string, number> = {};
  try {
    const supabase = createAdminClient();
    const [{ data: cs }, { data: ls }, { data: es }] = await Promise.all([
      supabase.from("courses").select("id, title, slug, published, price, updated_at").order("updated_at", { ascending: false }),
      supabase.from("lessons").select("course_id"),
      supabase.from("enrollments").select("course_id"),
    ]);
    courses = cs ?? [];
    for (const l of ls ?? []) lessonCounts[l.course_id] = (lessonCounts[l.course_id] || 0) + 1;
    for (const e of es ?? []) enrollCounts[e.course_id] = (enrollCounts[e.course_id] || 0) + 1;
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Cursos</h1>
        <div className="mt-6"><AdminError message={e instanceof Error ? e.message : "Erro."} /></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Cursos</h1>
          <p className="mt-1 text-sm text-slate-400">{courses.length} curso(s).</p>
        </div>
        <Link href="/admin/cursos/new" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
          Novo curso
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {courses.map((c) => (
          <div key={c.id} className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${c.published ? "bg-brand-green/15 text-brand-green" : "bg-white/5 text-slate-400"}`}>
                  {c.published ? "Publicado" : "Rascunho"}
                </span>
                <span className="text-xs text-slate-500">{Number(c.price) > 0 ? `R$ ${Number(c.price).toFixed(2)}` : "Gratuito"}</span>
              </div>
              <Link href={`/admin/cursos/${c.id}`} className="mt-1 block truncate font-medium text-white hover:text-brand-green">{c.title}</Link>
              <p className="mt-0.5 text-xs text-slate-500">{lessonCounts[c.id] || 0} aula(s) · {enrollCounts[c.id] || 0} matrícula(s)</p>
            </div>
            <div className="flex items-center gap-2">
              <form action={togglePublishCourse}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="next" value={(!c.published).toString()} />
                <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-brand-green/50 hover:text-brand-green">
                  {c.published ? "Despublicar" : "Publicar"}
                </button>
              </form>
              <Link href={`/admin/cursos/${c.id}`} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-white/30 hover:text-white">Editar</Link>
            </div>
          </div>
        ))}
        {courses.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-16 text-center">
            <p className="text-slate-400">Nenhum curso ainda.</p>
            <Link href="/admin/cursos/new" className="mt-3 inline-block text-sm font-medium text-brand-green hover:underline">Criar o primeiro curso →</Link>
          </div>
        )}
      </div>
    </div>
  );
}
