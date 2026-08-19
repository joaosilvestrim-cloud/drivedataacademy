import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasFullAccess } from "@/lib/access";
import Avatar from "@/components/Avatar";

export const dynamic = "force-dynamic";

function Cover({ url, title }: { url: string | null; title: string }) {
  if (url) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-transparent to-transparent" />
      </>
    );
  }
  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-brand-green/25 via-ink-700 to-brand-blue/25">
      <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,.6) 1px, transparent 0)", backgroundSize: "22px 22px" }} />
      <span className="absolute -bottom-6 right-3 font-display text-[7rem] font-black leading-none text-white/10">{title.charAt(0).toUpperCase()}</span>
    </div>
  );
}

export default async function ContaHome() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const [{ data: profile }, { data: enrolls }, full, { count: certCount }] = await Promise.all([
    admin.from("profiles").select("full_name").eq("id", user!.id).maybeSingle(),
    admin.from("enrollments").select("course_id").eq("user_id", user!.id),
    hasFullAccess(admin, user!.id),
    admin.from("certificates").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
  ]);

  const courseIds = (enrolls ?? []).map((e: any) => e.course_id);
  let courses: any[] = [];
  const lessonTotals: Record<string, number> = {};
  const doneCounts: Record<string, number> = {};

  if (courseIds.length) {
    const [{ data: cs }, { data: ls }, { data: pr }] = await Promise.all([
      admin.from("courses").select("id, slug, title, subtitle, cover_url").in("id", courseIds),
      admin.from("lessons").select("course_id").in("course_id", courseIds),
      admin.from("lesson_progress").select("course_id").eq("user_id", user!.id).eq("completed", true).in("course_id", courseIds),
    ]);
    courses = cs ?? [];
    for (const l of ls ?? []) lessonTotals[l.course_id] = (lessonTotals[l.course_id] || 0) + 1;
    for (const p of pr ?? []) doneCounts[p.course_id] = (doneCounts[p.course_id] || 0) + 1;
  }

  const fullName = profile?.full_name || "";
  const firstName = fullName.split(" ")[0];
  const withPct = courses.map((c) => {
    const total = lessonTotals[c.id] || 0;
    const done = doneCounts[c.id] || 0;
    return { ...c, total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  });
  const completedCount = withPct.filter((c) => c.total > 0 && c.pct === 100).length;
  const inProgress = withPct.filter((c) => c.pct > 0 && c.pct < 100);
  const resume = inProgress[0] || withPct.find((c) => c.pct === 0) || null;

  const stats = [
    { label: "Cursos", value: courses.length, d: "M4 6h16v12H4zM4 10h16" },
    { label: "Em andamento", value: inProgress.length, d: "M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z" },
    { label: "Concluídos", value: completedCount, d: "M20 6L9 17l-5-5" },
    { label: "Certificados", value: certCount ?? 0, d: "M12 2l9 5-9 5-9-5 9-5zM7 10v5c0 1 2.2 2 5 2s5-1 5-2v-5" },
  ];

  const shortcuts = [
    { label: "Comunidade", href: "/conta/comunidade", d: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" },
    { label: "Agenda", href: "/conta/agenda", d: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" },
    { label: "Ranking", href: "/conta/ranking", d: "M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0zM7 4H4v2a3 3 0 003 3M17 4h3v2a3 3 0 01-3 3" },
    { label: "Certificados", href: "/conta/certificados", d: "M12 2l9 5-9 5-9-5 9-5zM7 10v5c0 1 2.2 2 5 2s5-1 5-2v-5" },
  ];

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <Avatar name={fullName || "Aluno"} size="lg" />
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Olá{firstName ? ", " : ""}<span className="text-gradient">{firstName}</span></h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm text-slate-400">Bem-vindo à sua área de aluno.</p>
            {full && <span className="rounded-full border border-brand-green/30 bg-brand-green/10 px-2.5 py-0.5 text-[0.7rem] font-semibold text-brand-green">Acesso Full</span>}
          </div>
        </div>
      </div>

      {/* Stats */}
      {courses.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="glass rounded-2xl border border-white/8 p-4">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-green/10">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-brand-green"><path d={s.d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <p className="mt-3 font-display text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Continuar de onde parou */}
      {resume && (
        <Link href={`/aprender/${resume.slug}`} className="group mt-8 block overflow-hidden rounded-3xl border border-white/8">
          <div className="relative min-h-[220px] p-6 sm:p-8">
            <Cover url={resume.cover_url} title={resume.title} />
            <div className="relative flex h-full min-h-[172px] flex-col justify-end">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-green">{resume.pct > 0 ? "Continuar de onde parou" : "Comece agora"}</p>
              <h2 className="mt-1 max-w-lg font-display text-2xl font-bold text-white sm:text-3xl">{resume.title}</h2>
              {resume.subtitle && <p className="mt-1 max-w-lg text-sm text-slate-300">{resume.subtitle}</p>}
              <div className="mt-4 flex items-center gap-4">
                <span className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 transition-transform group-hover:scale-[1.02]">
                  {resume.pct > 0 ? "Continuar" : "Começar"}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <div className="hidden flex-1 sm:block">
                  <div className="h-2 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full bg-gradient-to-r from-brand-green to-brand-blue" style={{ width: `${resume.pct}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-300">{resume.done}/{resume.total} aulas · {resume.pct}%</p>
                </div>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Meus cursos */}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-white">Meus cursos</h2>
          <Link href="/cursos" className="text-sm font-medium text-brand-green hover:underline">Ver catálogo →</Link>
        </div>

        {courses.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-green to-brand-blue text-ink-900">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M4 6h16v12H4zM4 10h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <p className="font-medium text-white">Você ainda não está matriculado.</p>
            <p className="mt-1 text-sm text-slate-400">Explore o catálogo e comece agora.</p>
            <Link href="/cursos" className="mt-5 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">Ver cursos</Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {withPct.map((c) => {
              const complete = c.total > 0 && c.pct === 100;
              return (
                <Link key={c.id} href={`/aprender/${c.slug}`} className="card-hover glass group flex flex-col overflow-hidden rounded-3xl border border-white/8">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Cover url={c.cover_url} title={c.title} />
                    {complete ? (
                      <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-brand-green px-2.5 py-1 text-[0.65rem] font-bold text-ink-900"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>Concluído</span>
                    ) : c.pct > 0 ? (
                      <span className="absolute right-3 top-3 rounded-full bg-ink-900/80 px-2.5 py-1 text-[0.65rem] font-bold text-brand-teal backdrop-blur">{c.pct}%</span>
                    ) : (
                      <span className="absolute right-3 top-3 rounded-full bg-ink-900/80 px-2.5 py-1 text-[0.65rem] font-bold text-slate-300 backdrop-blur">Novo</span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-display text-lg font-bold text-white transition-colors group-hover:text-brand-green">{c.title}</h3>
                    <div className="mt-auto pt-4">
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full bg-gradient-to-r from-brand-green to-brand-blue transition-all" style={{ width: `${c.pct}%` }} />
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-slate-400">{c.done}/{c.total} aulas</p>
                        <span className="text-xs font-medium text-brand-green">{complete ? "Rever" : c.pct > 0 ? "Continuar" : "Começar"} →</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Atalhos */}
      <div className="mt-10">
        <h2 className="font-display text-lg font-bold text-white">Acesso rápido</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {shortcuts.map((s) => (
            <Link key={s.href} href={s.href} className="card-hover glass flex items-center gap-3 rounded-2xl border border-white/8 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-green/10">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-brand-green"><path d={s.d} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <span className="text-sm font-medium text-white">{s.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
