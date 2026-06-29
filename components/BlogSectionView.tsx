"use client";

import Reveal from "./Reveal";
import { useI18n } from "@/lib/i18n/LanguageProvider";

export type Post = {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  excerpt: string | null;
  cover_url: string | null;
  published_at: string | null;
  title_en?: string | null;
  excerpt_en?: string | null;
  category_en?: string | null;
  title_es?: string | null;
  excerpt_es?: string | null;
  category_es?: string | null;
};

const LOCALES: Record<string, string> = { pt: "pt-BR", en: "en-US", es: "es-ES" };

export default function BlogSectionView({ posts }: { posts: Post[] }) {
  const { lang, t } = useI18n();

  // Escolhe o campo do idioma atual; cai no português se não houver tradução.
  const pick = (base: string | null, en?: string | null, es?: string | null) => {
    if (lang === "en") return en || base;
    if (lang === "es") return es || base;
    return base;
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "";
    return new Intl.DateTimeFormat(LOCALES[lang] ?? "pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
      .format(new Date(iso))
      .replace(".", "");
  };

  return (
    <section id="blog" className="relative mx-auto max-w-7xl px-6 py-24 scroll-mt-24">
      <Reveal>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-green">{t.blog.eyebrow}</p>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">
              {t.blog.titlePre} <span className="text-gradient-blue">{t.blog.titleGrad}</span>
            </h2>
          </div>
          <a
            href="#lista"
            className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-brand-green/50 hover:text-brand-green"
          >
            {t.blog.seeAll}
          </a>
        </div>
      </Reveal>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {posts.map((p, i) => {
          const title = pick(p.title, p.title_en, p.title_es) || p.title;
          const excerpt = pick(p.excerpt, p.excerpt_en, p.excerpt_es);
          const category = pick(p.category, p.category_en, p.category_es);
          return (
          <Reveal key={p.id} delay={i * 0.08}>
            <article className="card-hover glass group flex h-full flex-col overflow-hidden rounded-3xl border border-white/8">
              <div className="relative aspect-[16/9] overflow-hidden">
                {p.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.cover_url} alt={title} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-green/20 via-ink-700 to-brand-blue/20" />
                    <div className="absolute inset-0 grid-bg opacity-50" />
                  </>
                )}
                {category && (
                  <span className="absolute left-4 top-4 rounded-full bg-ink-900/80 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-brand-teal backdrop-blur">
                    {category}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-display text-lg font-bold leading-snug text-white transition-colors group-hover:text-brand-green">
                  {title}
                </h3>
                <p className="mt-2 flex-1 text-sm text-slate-400">{excerpt}</p>
                <p className="mt-5 text-xs text-slate-500">{formatDate(p.published_at)}</p>
              </div>
            </article>
          </Reveal>
          );
        })}
      </div>
    </section>
  );
}
