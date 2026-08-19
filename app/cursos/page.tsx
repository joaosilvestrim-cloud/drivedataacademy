import Link from "next/link";
import Background from "@/components/Background";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 60;

export default async function CatalogPage() {
  let courses: any[] = [];
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const supabase = createPublicClient();
      const { data } = await supabase
        .from("courses")
        .select("id, slug, title, subtitle, cover_url, level, price, certificate_enabled")
        .eq("published", true)
        .order("position");
      courses = data ?? [];
    } catch {
      courses = [];
    }
  }

  return (
    <>
      <Background />
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 pb-24 pt-36 sm:pt-44">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-green">Cursos</p>
          <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">
            Formação prática em <span className="text-gradient">dados e IA</span>
          </h1>
          <p className="mt-4 text-slate-300/90">Aprenda no seu ritmo, com projetos reais.</p>
        </div>

        {courses.length === 0 ? (
          <div className="mx-auto mt-16 max-w-md rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center text-slate-400">
            Novos cursos em breve. Fique de olho!
          </div>
        ) : (
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <Link key={c.id} href={`/cursos/${c.slug}`} className="card-hover glass group flex flex-col overflow-hidden rounded-3xl border border-white/8">
                <div className="relative aspect-[16/9] overflow-hidden">
                  {c.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.cover_url} alt={c.title} className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-green/20 via-ink-700 to-brand-blue/20" />
                  )}
                  <span className="absolute left-4 top-4 rounded-full bg-ink-900/80 px-3 py-1 text-[0.7rem] font-semibold text-brand-teal backdrop-blur">
                    {Number(c.price) > 0 ? `R$ ${Number(c.price).toFixed(2)}` : "Gratuito"}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    {c.level && <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[0.7rem] font-medium text-slate-400">{c.level}</span>}
                    {c.certificate_enabled !== false && <span className="rounded-full bg-brand-green/10 px-2.5 py-0.5 text-[0.7rem] font-medium text-brand-green">🎓 Certificado</span>}
                  </div>
                  <h2 className="mt-2 font-display text-lg font-bold text-white transition-colors group-hover:text-brand-green">{c.title}</h2>
                  {c.subtitle && <p className="mt-2 flex-1 text-sm text-slate-400">{c.subtitle}</p>}
                  <span className="mt-4 text-sm font-medium text-brand-green">Ver curso →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
