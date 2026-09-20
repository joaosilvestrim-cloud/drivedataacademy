import { tr } from "@/lib/i18n/traduzir-servidor";
import Link from "next/link";
import Background from "@/components/Background";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 60;

export const metadata = {
  title: "Blog · DriveData Academy",
  description: "Tendências, técnica e prática em dados, BI e IA, escritas por quem entrega projeto.",
};

function data(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

export default async function BlogPage() {
  const pub = createPublicClient();
  const { data: posts } = await pub
    .from("posts")
    .select("id, slug, title, category, excerpt, cover_url, published_at")
    .eq("published", true)
    .order("published_at", { ascending: false });

  const lista = posts ?? [];
  const [destaque, ...resto] = lista;

  return (
    <>
      <Background />
      <Navbar />
      <main className="relative mx-auto max-w-7xl px-6 pb-24 pt-32 sm:pt-40">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-green">{tr("Blog")}</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-6xl">{tr("Conhecimento que")} <span className="text-gradient-blue">{tr("circula")}</span></h1>
          <p className="mt-5 text-lg text-slate-300/90">{tr("O que está mudando em dados, BI e IA, e o que fazer com isso no seu trabalho.")}</p>
        </div>

        {destaque && (
          <Link href={`/blog/${destaque.slug}`} className="card-hover glass group mt-14 grid overflow-hidden rounded-3xl border border-white/8 lg:grid-cols-[1.2fr_1fr]">
            <div className="relative aspect-[16/9] lg:aspect-auto">
              {destaque.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={destaque.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-brand-green/20 via-ink-700 to-brand-blue/20" />
              )}
            </div>
            <div className="flex flex-col justify-center p-8 sm:p-10">
              <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-brand-teal">{destaque.category}</span>
              <h2 className="mt-3 font-display text-2xl font-bold leading-snug text-white transition-colors group-hover:text-brand-green sm:text-3xl">{destaque.title}</h2>
              <p className="mt-3 text-slate-400">{destaque.excerpt}</p>
              <p className="mt-6 text-xs text-slate-500">{data(destaque.published_at)}</p>
            </div>
          </Link>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {resto.map((p: any) => (
            <Link key={p.id} href={`/blog/${p.slug}`} className="card-hover glass group flex flex-col overflow-hidden rounded-3xl border border-white/8">
              <div className="relative aspect-[16/9] overflow-hidden">
                {p.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-green/20 via-ink-700 to-brand-blue/20" />
                )}
              </div>
              <div className="flex flex-1 flex-col p-6">
                <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-brand-teal">{p.category}</span>
                <h2 className="mt-2 font-display text-lg font-bold leading-snug text-white transition-colors group-hover:text-brand-green">{p.title}</h2>
                <p className="mt-2 flex-1 text-sm text-slate-400">{p.excerpt}</p>
                <p className="mt-5 text-xs text-slate-500">{data(p.published_at)}</p>
              </div>
            </Link>
          ))}
        </div>

        {lista.length === 0 && (
          <p className="mt-14 rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center text-slate-400">{tr("Os primeiros artigos estão a caminho.")}</p>
        )}
      </main>
      <Footer />
    </>
  );
}
