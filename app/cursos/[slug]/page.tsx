import Link from "next/link";
import { notFound } from "next/navigation";
import Background from "@/components/Background";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { enrollFree } from "./actions";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: { slug: string } }) {
  const pub = createPublicClient();
  const { data: course } = await pub
    .from("courses")
    .select("id, slug, title, subtitle, description, cover_url, level, price, instructor_name")
    .eq("slug", params.slug)
    .eq("published", true)
    .maybeSingle();

  if (!course) notFound();

  const [{ data: mods }, { data: lessons }] = await Promise.all([
    pub.from("course_modules").select("id, title").eq("course_id", course.id).order("position"),
    pub.from("lessons").select("id, module_id, title, duration, is_preview").eq("course_id", course.id).order("position"),
  ]);
  const modules = (mods ?? []).map((m: any) => ({ ...m, lessons: (lessons ?? []).filter((l: any) => l.module_id === m.id) }));
  const lessonCount = (lessons ?? []).length;

  // Estado do usuário / matrícula
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let enrolled = false;
  if (user) {
    const { data: e } = await supabase.from("enrollments").select("id").eq("user_id", user.id).eq("course_id", course.id).maybeSingle();
    enrolled = !!e;
  }
  const isPaid = Number(course.price) > 0;

  return (
    <>
      <Background />
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-36 sm:pt-44">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          <div>
            {course.level && <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-green">{course.level}</p>}
            <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{course.title}</h1>
            {course.subtitle && <p className="mt-3 text-lg text-slate-300/90">{course.subtitle}</p>}
            {course.description && <p className="mt-5 whitespace-pre-line text-slate-300/90">{course.description}</p>}
            {course.instructor_name && <p className="mt-5 text-sm text-slate-400">Com <strong className="text-white">{course.instructor_name}</strong></p>}

            {/* Currículo */}
            <div className="mt-10">
              <h2 className="font-display text-lg font-bold text-white">Conteúdo do curso</h2>
              <p className="mt-1 text-sm text-slate-500">{modules.length} módulo(s) · {lessonCount} aula(s)</p>
              <div className="mt-4 space-y-3">
                {modules.map((m: any) => (
                  <div key={m.id} className="glass rounded-2xl border border-white/8 p-5">
                    <p className="font-semibold text-white">{m.title}</p>
                    <ul className="mt-3 space-y-2">
                      {m.lessons.map((l: any) => (
                        <li key={l.id} className="flex items-center justify-between gap-3 text-sm text-slate-300">
                          <span className="flex items-center gap-2">
                            <span className="text-slate-500">▶</span>
                            {l.title}
                            {l.is_preview && <span className="rounded-full bg-brand-green/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-brand-green">grátis</span>}
                          </span>
                          {l.duration && <span className="shrink-0 text-xs text-slate-500">{l.duration}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card de matrícula */}
          <div className="lg:sticky lg:top-28">
            <div className="glow-border overflow-hidden rounded-[2rem]">
              <div className="glass-strong rounded-[2rem] p-6 sm:p-7">
                {course.cover_url && (
                  <div className="mb-5 aspect-[16/9] overflow-hidden rounded-xl border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={course.cover_url} alt={course.title} className="h-full w-full object-cover" />
                  </div>
                )}
                <p className="font-display text-2xl font-bold text-white">
                  {isPaid ? `R$ ${Number(course.price).toFixed(2)}` : "Gratuito"}
                </p>

                <div className="mt-5">
                  {enrolled ? (
                    <Link href={`/aprender/${course.slug}`} className="block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3.5 text-center text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
                      Continuar curso
                    </Link>
                  ) : !user ? (
                    <Link href="/entrar" className="block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3.5 text-center text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
                      Entre para começar
                    </Link>
                  ) : isPaid ? (
                    <button disabled className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-slate-400">
                      Compra em breve
                    </button>
                  ) : (
                    <form action={enrollFree}>
                      <input type="hidden" name="slug" value={course.slug} />
                      <button className="w-full rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
                        Matricular gratuitamente
                      </button>
                    </form>
                  )}
                </div>
                <p className="mt-3 text-center text-xs text-slate-500">Acesso imediato após a matrícula.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
