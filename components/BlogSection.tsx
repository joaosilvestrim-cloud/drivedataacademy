import Reveal from "./Reveal";
import { createPublicClient } from "@/lib/supabase/public";

type Post = {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  excerpt: string | null;
  cover_url: string | null;
  published_at: string | null;
};

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(new Date(iso))
    .replace(".", "");
}

export default async function BlogSection() {
  // Supabase não configurado (ex.: build sem env vars): não renderiza a seção.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  let posts: Post[] = [];
  try {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("posts")
      .select("id, title, slug, category, excerpt, cover_url, published_at")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .limit(6);
    posts = (data ?? []) as Post[];
  } catch {
    return null;
  }

  // Sem posts publicados: não renderiza a seção.
  if (posts.length === 0) return null;

  return (
    <section id="blog" className="relative mx-auto max-w-7xl px-6 py-24 scroll-mt-24">
      <Reveal>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-green">Blog & conteúdo</p>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">
              Conhecimento que <span className="text-gradient-blue">circula</span>
            </h2>
          </div>
          <a
            href="#lista"
            className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-brand-green/50 hover:text-brand-green"
          >
            Ver todos os artigos
          </a>
        </div>
      </Reveal>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {posts.map((p, i) => (
          <Reveal key={p.id} delay={i * 0.08}>
            <article className="card-hover glass group flex h-full flex-col overflow-hidden rounded-3xl border border-white/8">
              {/* Cover */}
              <div className="relative aspect-[16/9] overflow-hidden">
                {p.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.cover_url} alt={p.title} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-green/20 via-ink-700 to-brand-blue/20" />
                    <div className="absolute inset-0 grid-bg opacity-50" />
                  </>
                )}
                {p.category && (
                  <span className="absolute left-4 top-4 rounded-full bg-ink-900/80 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-brand-teal backdrop-blur">
                    {p.category}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-display text-lg font-bold leading-snug text-white transition-colors group-hover:text-brand-green">
                  {p.title}
                </h3>
                <p className="mt-2 flex-1 text-sm text-slate-400">{p.excerpt}</p>
                <p className="mt-5 text-xs text-slate-500">{formatDate(p.published_at)}</p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
