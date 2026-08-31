import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { unenrollFromCourse } from "./actions";
import AllocateStudent from "./AllocateStudent";

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(iso));
}

export default async function CourseStudents({ courseId, totalLessons }: { courseId: string; totalLessons: number }) {
  const supabase = createAdminClient();

  const [{ data: enrolls }, { data: userData }, { data: profs }, { data: prog }] = await Promise.all([
    supabase.from("enrollments").select("user_id, created_at, source").eq("course_id", courseId).order("created_at", { ascending: false }),
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    supabase.from("profiles").select("id, full_name"),
    supabase.from("lesson_progress").select("user_id").eq("course_id", courseId).eq("completed", true),
  ]);

  const emailById: Record<string, string> = {};
  for (const u of userData?.users ?? []) emailById[u.id] = u.email || "";
  const nameById: Record<string, string> = {};
  for (const p of profs ?? []) nameById[p.id] = p.full_name || "";
  const doneBy: Record<string, number> = {};
  for (const p of prog ?? []) doneBy[p.user_id] = (doneBy[p.user_id] || 0) + 1;

  const rows = enrolls ?? [];

  // alunos ainda NÃO matriculados neste curso (para o dropdown de alocação)
  const enrolledIds = new Set(rows.map((e: any) => e.user_id));
  const available = (userData?.users ?? [])
    .filter((u: any) => !enrolledIds.has(u.id))
    .map((u: any) => ({ id: u.id, name: nameById[u.id] || "", email: u.email || "" }))
    .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));

  return (
    <div className="mt-10">
      <h2 className="font-display text-lg font-bold text-white">Alunos matriculados</h2>
      <p className="mt-1 text-sm text-slate-400">{rows.length} aluno(s) neste curso.</p>

      {/* Alocar aluno na hora (busca + dropdown) */}
      <AllocateStudent courseId={courseId} students={available} />

      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/8">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Aluno</th>
              <th className="px-4 py-3 font-medium">Progresso</th>
              <th className="px-4 py-3 font-medium">Matrícula</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e: any) => {
              const done = doneBy[e.user_id] || 0;
              const pct = totalLessons ? Math.round((done / totalLessons) * 100) : 0;
              return (
                <tr key={e.user_id} className="border-t border-white/5 text-slate-200">
                  <td className="px-4 py-3">
                    <p className="font-medium">{nameById[e.user_id] || "—"}</p>
                    <p className="text-xs text-slate-500">{emailById[e.user_id]}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full bg-gradient-to-r from-brand-green to-brand-blue" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-400">{done}/{totalLessons}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-400">{fmt(e.created_at)} {e.source === "admin" ? "· cortesia" : ""}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/alunos/${e.user_id}`} className="text-xs text-brand-green hover:underline">Ver aluno</Link>
                      <form action={unenrollFromCourse} className="inline">
                        <input type="hidden" name="course_id" value={courseId} />
                        <input type="hidden" name="user_id" value={e.user_id} />
                        <button className="text-xs text-slate-500 hover:text-red-400" title="Remover do curso">Remover</button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Ninguém matriculado ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
