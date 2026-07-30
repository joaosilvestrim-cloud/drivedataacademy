import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ContaHome() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const [{ data: profile }, { data: enrolls }] = await Promise.all([
    admin.from("profiles").select("full_name").eq("id", user!.id).maybeSingle(),
    admin.from("enrollments").select("course_id").eq("user_id", user!.id),
  ]);

  const courseIds = (enrolls ?? []).map((e: any) => e.course_id);
  let courses: any[] = [];
  const lessonTotals: Record<string, number> = {};
  const doneCounts: Record<string, number> = {};

  if (courseIds.length) {
    const [{ data: cs }, { data: ls }, { data: pr }] = await Promise.all([
      admin.from("courses").select("id, slug, title, cover_url").in("id", courseIds),
      admin.from("lessons").select("course_id").in("course_id", courseIds),
      admin.from("lesson_progress").select("course_id").eq("user_id", user!.id).eq("completed", true).in("course_id", courseIds),
    ]);
    courses = cs ?? [];
    for (const l of ls ?? []) lessonTotals[l.course_id] = (lessonTotals[l.course_id] || 0) + 1;
    for (const p of pr ?? []) doneCounts[p.course_id] = (doneCounts[p.course_id] || 0) + 1;
  }

  const firstName = (profile?.full_name || "").split(" ")[0];

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-white">Olá{firstName ? `, ${firstName}` : ""}! 👋</h1>
      <p className="mt-1 text-slate-400">Bem-vindo à sua área de aluno.</p>

      <div className="mt-8">
        <h2 className="font-display text-lg font-bold text-white">Meus cursos</h2>

        {courses.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center">
            <p className="font-medium text-white">Você ainda não está matriculado.</p>
            <p className="mt-1 text-sm text-slate-400">Explore o catálogo e comece agora.</p>
            <Link href="/cursos" className="mt-5 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900">
              Ver cursos
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            {courses.map((c) => {
              const total = lessonTotals[c.id] || 0;
              const done = doneCounts[c.id] || 0;
              const pct = total ? Math.round((done / total) * 100) : 0;
              return (
                <Link key={c.id} href={`/aprender/${c.slug}`} className="card-hover glass group overflow-hidden rounded-3xl border border-white/8">
                  <div className="relative aspect-[16/9] overflow-hidden">
                    {c.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.cover_url} alt={c.title} className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-brand-green/20 via-ink-700 to-brand-blue/20" />
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-display text-lg font-bold text-white transition-colors group-hover:text-brand-green">{c.title}</h3>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full bg-gradient-to-r from-brand-green to-brand-blue" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-slate-400">{done}/{total} aulas · {pct}%</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
