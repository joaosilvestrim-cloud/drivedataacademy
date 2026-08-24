import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { youtubeId } from "@/lib/youtube";
import { canAccessCourse } from "@/lib/access";
import { markComplete } from "./actions";
import { issueCertificate, issueModuleCertificate } from "@/app/certificado/actions";
import CourseContents from "./CourseContents";
import PandaPlayer from "./PandaPlayer";
import ProtectedPlayer from "./ProtectedPlayer";
import NpsPrompt from "./NpsPrompt";

export const dynamic = "force-dynamic";

const linkBtn = "rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-white/30 hover:text-white";

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { l?: string; nps?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  const { data: course } = await admin.from("courses").select("id, slug, title, certificate_enabled").eq("slug", params.slug).maybeSingle();
  if (!course) notFound();

  if (!(await canAccessCourse(admin, user.id, course.id))) redirect(`/cursos/${params.slug}`);

  const [{ data: mods }, { data: lessons }, { data: prog }] = await Promise.all([
    admin.from("course_modules").select("id, title, available_at").eq("course_id", course.id).order("position"),
    admin.from("lessons").select("id, module_id, title, type, video_id, video_provider, content, duration, materials").eq("course_id", course.id).order("position"),
    admin.from("lesson_progress").select("lesson_id").eq("user_id", user.id).eq("course_id", course.id).eq("completed", true),
  ]);
  const { data: quiz } = await admin.from("quizzes").select("id, title").eq("course_id", course.id).eq("published", true).maybeSingle();
  const { data: certs } = await admin.from("certificates").select("code, module_id").eq("user_id", user.id).eq("course_id", course.id);
  const { data: npsRow } = await admin.from("course_nps").select("score").eq("course_id", course.id).eq("user_id", user.id).maybeSingle();
  const certByModule = new Map<string, string>();
  for (const c of certs ?? []) if (c.module_id) certByModule.set(c.module_id, c.code);

  const allLessons = lessons ?? [];
  const done = new Set((prog ?? []).map((p: any) => p.lesson_id));
  const nowMs = Date.now();
  const relFmt = (iso: string) =>
    new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
  const modules = (mods ?? []).map((m: any) => {
    const locked = !!m.available_at && new Date(m.available_at).getTime() > nowMs;
    return {
      ...m,
      locked,
      releaseLabel: locked ? relFmt(m.available_at) : null,
      lessons: allLessons.filter((l: any) => l.module_id === m.id),
    };
  });

  // Módulos 100% concluídos (para certificado por módulo). Ignora bloqueados.
  const completedModules = modules
    .filter((m: any) => !m.locked && m.lessons.length > 0 && m.lessons.every((l: any) => done.has(l.id)))
    .map((m: any) => ({ id: m.id, title: m.title, code: certByModule.get(m.id) || null }));

  // Navegação só entre aulas liberadas (drip).
  const flat = modules.filter((m: any) => !m.locked).flatMap((m: any) => m.lessons);
  const current = flat.find((l: any) => l.id === searchParams.l) || flat.find((l: any) => !done.has(l.id)) || flat[0];
  const currentIdx = current ? flat.findIndex((l: any) => l.id === current.id) : -1;
  const prev = currentIdx > 0 ? flat[currentIdx - 1] : null;
  const next = currentIdx >= 0 && currentIdx < flat.length - 1 ? flat[currentIdx + 1] : null;

  // Progresso considera todas as aulas do curso (o certificado só sai com tudo liberado e concluído).
  const total = allLessons.length;
  const completed = allLessons.filter((l: any) => done.has(l.id)).length;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  const vid = current?.type === "video" ? youtubeId(current.video_id) : null;
  const materials: { title: string; url: string }[] = (current?.materials as any) || [];

  const sidebarModules = modules.map((m: any) => ({
    id: m.id,
    title: m.title,
    locked: m.locked,
    releaseLabel: m.releaseLabel,
    lessons: m.lessons.map((l: any) => ({ id: l.id, title: l.title, duration: l.duration })),
  }));

  return (
    <div className="min-h-screen bg-ink-900">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/conta" aria-label="Minha conta">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Drive Data Academy" className="h-8 w-auto" />
            </Link>
            <span className="truncate text-sm font-medium text-slate-300">{course.title}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden h-2 w-32 overflow-hidden rounded-full bg-white/10 sm:block">
              <div className="h-full bg-gradient-to-r from-brand-green to-brand-blue transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-slate-400">{completed}/{total} · {pct}%</span>
          </div>
        </div>
      </header>

      {pct === 100 && course.certificate_enabled !== false && (
        <div className="mx-auto max-w-7xl px-6 pt-6">
          <form action={issueCertificate} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-green/30 bg-brand-green/10 p-4">
            <input type="hidden" name="course_id" value={course.id} />
            <input type="hidden" name="slug" value={course.slug} />
            <p className="text-sm font-medium text-white">Você concluiu o curso. Emita seu certificado.</p>
            <button className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">Emitir certificado</button>
          </form>
        </div>
      )}

      {pct === 100 && (searchParams.nps === "ok" ? (
        <div className="mx-auto max-w-7xl px-6 pt-6">
          <div className="rounded-2xl border border-brand-green/25 bg-brand-green/[0.06] px-5 py-3 text-sm font-medium text-brand-green">Obrigado pela sua avaliação!</div>
        </div>
      ) : !npsRow ? (
        <div className="mx-auto max-w-7xl px-6 pt-6">
          <NpsPrompt courseId={course.id} slug={course.slug} />
        </div>
      ) : null)}

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          {!current ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-6 py-20 text-center text-slate-400">
              Este curso ainda não tem aulas publicadas.
            </div>
          ) : (
            <>
              {current.video_provider === "panda" && current.video_id ? (
                <ProtectedPlayer>
                  <PandaPlayer videoId={current.video_id} host={process.env.NEXT_PUBLIC_PANDA_PLAYER_HOST || null} lessonId={current.id} courseId={course.id} slug={course.slug} />
                </ProtectedPlayer>
              ) : vid ? (
                <ProtectedPlayer>
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                    <div className="relative aspect-video">
                      <iframe className="absolute inset-0 h-full w-full" src={`https://www.youtube.com/embed/${vid}?rel=0&modestbranding=1`} title={current.title} allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
                    </div>
                  </div>
                </ProtectedPlayer>
              ) : current.type === "text" ? (
                <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
                  <div className="whitespace-pre-line text-[0.95rem] leading-relaxed text-slate-200">{current.content || "—"}</div>
                </article>
              ) : (
                <div className="grid aspect-video place-items-center rounded-2xl border border-white/10 bg-white/[0.02] text-slate-500">Aula em preparação.</div>
              )}

              <p className="mt-5 text-xs font-medium uppercase tracking-wide text-brand-green">Aula {currentIdx + 1} de {flat.length}</p>
              <h1 className="mt-1 font-display text-2xl font-bold text-white">{current.title}</h1>

              {materials.length > 0 && (
                <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
                  <p className="text-sm font-semibold text-white">Materiais de apoio</p>
                  <ul className="mt-3 space-y-2">
                    {materials.map((mat, i) => (
                      <li key={i}>
                        <a href={mat.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-brand-teal hover:underline">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          {mat.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Navegação */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                {prev ? (
                  <Link href={`/aprender/${course.slug}?l=${prev.id}`} className={linkBtn}>← Aula anterior</Link>
                ) : <span />}
                <div className="flex items-center gap-2">
                  {next && <Link href={`/aprender/${course.slug}?l=${next.id}`} className={linkBtn}>Próxima aula →</Link>}
                  <form action={markComplete}>
                    <input type="hidden" name="slug" value={course.slug} />
                    <input type="hidden" name="lesson_id" value={current.id} />
                    <input type="hidden" name="course_id" value={course.id} />
                    {next && <input type="hidden" name="next_lesson" value={next.id} />}
                    <button className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
                      {done.has(current.id) ? (next ? "Concluída · avançar" : "Concluída") : next ? "Concluir e avançar" : "Marcar como concluída"}
                    </button>
                  </form>
                </div>
              </div>
            </>
          )}

          {course.certificate_enabled !== false && modules.length > 1 && completedModules.length > 0 && (
            <div className="mt-8 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
              <p className="text-sm font-semibold text-white">Certificados por módulo</p>
              <p className="mt-1 text-xs text-slate-400">Emita o certificado de cada módulo concluído.</p>
              <ul className="mt-4 space-y-2">
                {completedModules.map((m: any) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
                    <span className="text-sm text-slate-200">{m.title}</span>
                    {m.code ? (
                      <Link href={`/certificado/${m.code}`} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-brand-teal hover:border-brand-teal/50">Ver certificado</Link>
                    ) : (
                      <form action={issueModuleCertificate}>
                        <input type="hidden" name="course_id" value={course.id} />
                        <input type="hidden" name="module_id" value={m.id} />
                        <input type="hidden" name="slug" value={course.slug} />
                        <button className="rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-4 py-1.5 text-xs font-semibold text-ink-900 transition-transform hover:scale-[1.02]">Emitir certificado</button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <CourseContents slug={course.slug} modules={sidebarModules} doneIds={Array.from(done) as string[]} currentId={current?.id} quiz={quiz} />
      </div>
    </div>
  );
}
