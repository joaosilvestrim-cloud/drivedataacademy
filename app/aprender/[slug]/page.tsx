import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { youtubeId } from "@/lib/youtube";
import { markComplete } from "./actions";

export const dynamic = "force-dynamic";

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { l?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  const { data: course } = await admin
    .from("courses")
    .select("id, slug, title")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!course) notFound();

  // Precisa estar matriculado.
  const { data: enr } = await admin.from("enrollments").select("id").eq("user_id", user.id).eq("course_id", course.id).maybeSingle();
  if (!enr) redirect(`/cursos/${params.slug}`);

  const [{ data: mods }, { data: lessons }, { data: prog }] = await Promise.all([
    admin.from("course_modules").select("id, title").eq("course_id", course.id).order("position"),
    admin.from("lessons").select("id, module_id, title, type, video_id, content, duration").eq("course_id", course.id).order("position"),
    admin.from("lesson_progress").select("lesson_id").eq("user_id", user.id).eq("course_id", course.id).eq("completed", true),
  ]);

  const allLessons = lessons ?? [];
  const done = new Set((prog ?? []).map((p: any) => p.lesson_id));
  const modules = (mods ?? []).map((m: any) => ({ ...m, lessons: allLessons.filter((l: any) => l.module_id === m.id) }));

  const flat = modules.flatMap((m: any) => m.lessons);
  const current = flat.find((l: any) => l.id === searchParams.l) || flat.find((l: any) => !done.has(l.id)) || flat[0];
  const currentIdx = current ? flat.findIndex((l: any) => l.id === current.id) : -1;
  const next = currentIdx >= 0 && currentIdx < flat.length - 1 ? flat[currentIdx + 1] : null;

  const total = flat.length;
  const completed = flat.filter((l: any) => done.has(l.id)).length;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  const vid = current?.type === "video" ? youtubeId(current.video_id) : null;

  return (
    <div className="min-h-screen bg-ink-900">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/conta">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Drive Data Academy" className="h-8 w-auto" />
            </Link>
            <span className="truncate text-sm font-medium text-slate-300">{course.title}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden h-2 w-32 overflow-hidden rounded-full bg-white/10 sm:block">
              <div className="h-full bg-gradient-to-r from-brand-green to-brand-blue" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-slate-400">{pct}%</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[1fr_320px]">
        {/* Player */}
        <div>
          {!current ? (
            <p className="text-slate-400">Este curso ainda não tem aulas.</p>
          ) : (
            <>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                {vid ? (
                  <div className="relative aspect-video">
                    <iframe
                      className="absolute inset-0 h-full w-full"
                      src={`https://www.youtube.com/embed/${vid}?rel=0&modestbranding=1`}
                      title={current.title}
                      allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                    />
                  </div>
                ) : current.type === "text" ? (
                  <div className="prose-invert whitespace-pre-line p-8 text-slate-200">{current.content || "—"}</div>
                ) : (
                  <div className="grid aspect-video place-items-center text-slate-500">Aula sem vídeo configurado.</div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                <h1 className="font-display text-xl font-bold text-white">{current.title}</h1>
                <form action={markComplete} className="flex items-center gap-3">
                  <input type="hidden" name="slug" value={course.slug} />
                  <input type="hidden" name="lesson_id" value={current.id} />
                  <input type="hidden" name="course_id" value={course.id} />
                  {next && <input type="hidden" name="next_lesson" value={next.id} />}
                  <button className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
                    {done.has(current.id) ? (next ? "Concluída · próxima aula" : "Concluída") : (next ? "Concluir e avançar" : "Marcar como concluída")}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

        {/* Lista de aulas */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-white/8 bg-white/[0.02]">
            {modules.map((m: any) => (
              <div key={m.id} className="border-b border-white/5 last:border-0">
                <p className="px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">{m.title}</p>
                <ul className="p-2">
                  {m.lessons.map((l: any) => {
                    const active = current && l.id === current.id;
                    return (
                      <li key={l.id}>
                        <Link
                          href={`/aprender/${course.slug}?l=${l.id}`}
                          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"}`}
                        >
                          <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${done.has(l.id) ? "border-brand-green bg-brand-green text-ink-900" : "border-white/20"}`}>
                            {done.has(l.id) && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            )}
                          </span>
                          <span className="flex-1 truncate">{l.title}</span>
                          {l.duration && <span className="shrink-0 text-xs text-slate-500">{l.duration}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
