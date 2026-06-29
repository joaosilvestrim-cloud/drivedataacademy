import { createPublicClient } from "@/lib/supabase/public";
import BlogSectionView, { type Post } from "./BlogSectionView";

export default async function BlogSection() {
  // Supabase não configurado (ex.: build sem env vars): não renderiza a seção.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  const BASIC = "id, title, slug, category, excerpt, cover_url, published_at";
  const WITH_I18N = `${BASIC}, title_en, excerpt_en, category_en, title_es, excerpt_es, category_es`;

  let posts: Post[] = [];
  try {
    const supabase = createPublicClient();
    const q = (cols: string) =>
      supabase
        .from("posts")
        .select(cols)
        .eq("published", true)
        .order("published_at", { ascending: false })
        .limit(6);

    let data: any = null;
    const r1 = await q(WITH_I18N);
    // Colunas de tradução ainda não criadas? Cai no select básico (blog continua em PT).
    data = r1.error ? (await q(BASIC)).data : r1.data;
    posts = (data ?? []) as Post[];
  } catch {
    return null;
  }

  // Sem posts publicados: não renderiza a seção.
  if (posts.length === 0) return null;

  return <BlogSectionView posts={posts} />;
}
