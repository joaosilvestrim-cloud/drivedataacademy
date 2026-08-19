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
  const withPct = courses.map((c) => {
    const total = lessonTotals[c.id] || 0;
    const done = doneCounts[c.id] || 0;
    return { ...c, total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  });
  const completedCount = withPct.filter((c) => c.total > 0 && c.pct === 100).length;
  const inProgress = withPct.filter((c) => c.pct > 0 && c.pct < 100).length;

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-white">Olá{firstName ? `, ${firstName}` : ""}</h1>
      <p className="mt-1 text-slate-400">Bem-vindo à sua área de aluno.</p>

      {courses.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { label: "Matriculado", value: courses.length, d: "M4 6h16v12H4zM4 10h16" },
            { label: "Em andamento", value: inProgress, d: "M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z" },
            { label: "Concluídos", value: completedCount, d: "M20 6L9 17l-5-5" },
          ].map((s) => (
            <div key={s.label} className="glass rounded-2xl border border-white/8 p-4 text-center">
              <div className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-brand-green/10">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-brand-green"><path d={s.d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-white">Meus cursos</h2>
          {courses.length > 0 && <Link href="/cursos" className="text-sm font-medium text-brand-green hover:underline">Ver catálogo →</Link>}
        </div>

        {courses.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-green to-brand-blue text-ink-900">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M4 6h16v12H4zM4 10h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <p className="font-medium text-white">Você ainda não está matriculado.</p>
            <p className="mt-1 text-sm text-slate-400">Explore o catálogo e comece agora.</p>
            <Link href="/cursos" className="mt-5 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
              Ver cursos
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            {withPct.map((c) => {
              const complete = c.total > 0 && c.pct === 100;
              return (
                <Link key={c.id} href={`/aprender/${c.slug}`} className="card-hover glass group flex flex-col overflow-hidden rounded-3xl border border-white/8">
                  <div className="relative aspect-[16/9] overflow-hidden">
                    {c.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.cover_url} alt={c.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-brand-green/20 via-ink-700 to-brand-blue/20" />
                    )}
                    {complete && <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-brand-green px-2.5 py-1 text-[0.65rem] font-bold text-ink-900"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>Concluído</span>}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-display text-lg font-bold text-white transition-colors group-hover:text-brand-green">{c.title}</h3>
                    <div className="mt-auto pt-4">
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full bg-gradient-to-r from-brand-green to-brand-blue transition-all" style={{ width: `${c.pct}%` }} />
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-slate-400">{c.done}/{c.total} aulas · {c.pct}%</p>
                        <span className="text-xs font-medium text-brand-green">{complete ? "Rever →" : c.pct > 0 ? "Continuar →" : "Começar →"}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {completedCount > 0 && (
          <Link href="/conta/certificados" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-brand-green/50 hover:text-brand-green">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l9 5-9 5-9-5 9-5zM7 10v5c0 1 2.2 2 5 2s5-1 5-2v-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Ver meus certificados
          </Link>
        )}
      </div>
    </div>
  );
}
