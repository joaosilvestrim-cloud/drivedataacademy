import { createPublicClient } from "@/lib/supabase/public";
import BlogSectionView, { type Post } from "./BlogSectionView";

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

  return <BlogSectionView posts={posts} />;
}
