import { comTraducao, listaTraduzida, traducoesDe } from "@/lib/i18n/conteudo";
import { tr } from "@/lib/i18n/traduzir-servidor";
import Link from "next/link";
import { notFound } from "next/navigation";
import Background from "@/components/Background";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createPublicClient } from "@/lib/supabase/public";
import { markdownParaHtml, minutosDeLeitura } from "@/lib/markdown";
import "../artigo.css";

export const revalidate = 60;

const CAMPOS = "id, slug, title, category, excerpt, content, cover_url, author, published_at";

function data(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const pub = createPublicClient();
  const { data: bruto } = await pub.from("posts").select("id, title, excerpt, cover_url").eq("slug", params.slug).eq("published", true).maybeSingle();
  if (!bruto) return { title: `${tr("Artigo")} · DriveData Academy` };
  const p = comTraducao(bruto as any, await traducoesDe("posts", [(bruto as any).id]));
  return {
    title: `${p.title} · DriveData Academy`,
    description: p.excerpt || undefined,
    openGraph: { title: p.title, description: p.excerpt || undefined, images: p.cover_url ? [{ url: p.cover_url }] : undefined },
  };
}

export default async function ArtigoPage({ params }: { params: { slug: string } }) {
  const pub = createPublicClient();
  const { data: postRaw } = await pub.from("posts").select(CAMPOS).eq("slug", params.slug).eq("published", true).maybeSingle();
  if (!postRaw) notFound();
  const post = comTraducao(postRaw as any, await traducoesDe("posts", [(postRaw as any).id]));

  const { data: outrosRaw } = await pub
    .from("posts")
    .select("id, slug, title, category, cover_url, published_at")
    .eq("published", true)
    .neq("id", post.id)
    .order("published_at", { ascending: false })
    .limit(3);
  const outros = await listaTraduzida("posts", (outrosRaw ?? []) as any[]);

  const html = markdownParaHtml(post.content || "");
  const minutos = minutosDeLeitura(post.content || "");

  return (
    <>
      <Background />
      <Navbar />
      <main className="relative mx-auto max-w-6xl px-6 pb-24 pt-32 sm:pt-40">
        <Link href="/blog" className="text-sm text-slate-400 transition-colors hover:text-brand-green">{tr("← Todos os artigos")}</Link>

        <header className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            {post.category && <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-green">{post.category}</p>}
            <h1 className="mt-3 font-display text-3xl font-bold leading-[1.1] tracking-tight sm:text-5xl">{post.title}</h1>
            {post.excerpt && <p className="mt-5 max-w-2xl text-lg text-slate-300/90">{post.excerpt}</p>}
            <p className="mt-6 text-sm text-slate-500">
              {post.author || "DriveData Academy"} · {data(post.published_at)} · {minutos} {tr("min de leitura")}
            </p>
          </div>
          {post.cover_url && (
            <div className="overflow-hidden rounded-3xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.cover_url} alt="" className="aspect-[16/9] w-full object-cover" />
            </div>
          )}
        </header>

        <div className="mt-14 grid gap-14 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <article className="artigo max-w-[68ch]" dangerouslySetInnerHTML={{ __html: html }} />

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="glass rounded-3xl border border-white/8 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-green">{tr("Aprenda na prática")}</p>
              <p className="mt-3 font-display text-xl font-bold text-white">{tr("Lives, gravações, ferramentas e treinamentos com preço de assinante.")}</p>
              <Link href="/cursos" className="mt-5 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
                {tr("Conhecer a assinatura")}
              </Link>
            </div>
            {(outros ?? []).length > 0 && (
              <div className="mt-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{tr("Leia também")}</p>
                <ul className="mt-4 divide-y divide-white/5">
                  {(outros ?? []).map((o: any) => (
                    <li key={o.id} className="py-3">
                      <Link href={`/blog/${o.slug}`} className="group block">
                        <span className="block text-[0.7rem] font-semibold uppercase tracking-wide text-brand-teal">{o.category}</span>
                        <span className="mt-1 block text-sm font-medium text-slate-200 transition-colors group-hover:text-brand-green">{o.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
