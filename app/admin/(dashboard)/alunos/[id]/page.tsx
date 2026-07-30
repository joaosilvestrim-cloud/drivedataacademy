import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { enrollStudent, unenrollStudent } from "../actions";

export const dynamic = "force-dynamic";

function fmt(iso?: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(iso));
}

export default async function AlunoDetail({ params }: { params: { id: string } }) {
  const supabase = createAdminClient();

  const { data: userRes } = await supabase.auth.admin.getUserById(params.id);
  const user = userRes?.user;
  if (!user) notFound();

  const [{ data: profile }, { data: enrolls }, { data: courses }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, country").eq("id", params.id).maybeSingle(),
    supabase.from("enrollments").select("course_id, created_at, source").eq("user_id", params.id),
    supabase.from("courses").select("id, title, slug").order("title"),
  ]);

  const enrolledIds = new Set((enrolls ?? []).map((e: any) => e.course_id));
  const courseById: Record<string, any> = {};
  for (const c of courses ?? []) courseById[c.id] = c;

  // progresso por curso
  const { data: prog } = await supabase.from("lesson_progress").select("course_id").eq("user_id", params.id).eq("completed", true);
  const { data: lessonsAll } = await supabase.from("lessons").select("course_id").in("course_id", Array.from(enrolledIds).length ? Array.from(enrolledIds) : ["00000000-0000-0000-0000-000000000000"]);
  const totalByCourse: Record<string, number> = {};
  for (const l of lessonsAll ?? []) totalByCourse[l.course_id] = (totalByCourse[l.course_id] || 0) + 1;
  const doneByCourse: Record<string, number> = {};
  for (const p of prog ?? []) doneByCourse[p.course_id] = (doneByCourse[p.course_id] || 0) + 1;

  const notEnrolled = (courses ?? []).filter((c: any) => !enrolledIds.has(c.id));

  return (
    <div>
      <Link href="/admin/alunos" className="text-xs text-slate-500 hover:text-white">← Alunos</Link>
      <h1 className="mt-1 font-display text-2xl font-bold text-white">{profile?.full_name || user.user_metadata?.full_name || "Aluno"}</h1>
      <p className="mt-1 text-sm text-slate-400">{user.email}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="glass rounded-2xl border border-white/8 p-4"><p className="text-xs text-slate-500">Telefone</p><p className="mt-1 text-sm text-white">{profile?.phone || "—"}</p></div>
        <div className="glass rounded-2xl border border-white/8 p-4"><p className="text-xs text-slate-500">País</p><p className="mt-1 text-sm text-white">{profile?.country || "—"}</p></div>
        <div className="glass rounded-2xl border border-white/8 p-4"><p className="text-xs text-slate-500">Cadastro</p><p className="mt-1 text-sm text-white">{fmt(user.created_at)}</p></div>
      </div>

      {/* Cursos matriculados */}
      <h2 className="mt-8 font-display text-lg font-bold text-white">Cursos matriculados</h2>
      <div className="mt-3 space-y-2">
        {(enrolls ?? []).map((e: any) => {
          const c = courseById[e.course_id];
          const total = totalByCourse[e.course_id] || 0;
          const done = doneByCourse[e.course_id] || 0;
          const pct = total ? Math.round((done / total) * 100) : 0;
          return (
            <div key={e.course_id} className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 p-4">
              <div>
                <p className="font-medium text-white">{c?.title || "Curso removido"}</p>
                <p className="mt-0.5 text-xs text-slate-500">{done}/{total} aulas · {pct}% · matriculado {fmt(e.created_at)} {e.source === "admin" ? "(cortesia)" : ""}</p>
              </div>
              <form action={unenrollStudent}>
                <input type="hidden" name="user_id" value={params.id} />
                <input type="hidden" name="course_id" value={e.course_id} />
                <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-red-400/40 hover:text-red-400">Remover acesso</button>
              </form>
            </div>
          );
        })}
        {(enrolls ?? []).length === 0 && <p className="text-sm text-slate-500">Nenhuma matrícula ainda.</p>}
      </div>

      {/* Matricular manualmente */}
      <div className="mt-6 glass rounded-2xl border border-brand-green/20 p-5">
        <p className="text-sm font-semibold text-white">Dar acesso a um curso (cortesia)</p>
        <form action={enrollStudent} className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="user_id" value={params.id} />
          <select name="course_id" required defaultValue="" className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-brand-green/60 [&>option]:bg-ink-900">
            <option value="" disabled>Escolha um curso...</option>
            {notEnrolled.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <button className="rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2.5 text-sm font-semibold text-ink-900">Matricular</button>
        </form>
      </div>
    </div>
  );
}
