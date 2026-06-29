import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import PostForm from "../PostForm";

export const dynamic = "force-dynamic";

export default async function EditPostPage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  const { data: post } = await supabase
    .from("posts")
    .select("id, title, slug, category, excerpt, content, cover_url, author, published, title_en, excerpt_en, category_en, title_es, excerpt_es, category_es")
    .eq("id", params.id)
    .single();

  if (!post) notFound();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Editar post</h1>
      <p className="mt-1 text-sm text-slate-400">{post.title}</p>
      <div className="mt-6">
        <PostForm post={post} />
      </div>
    </div>
  );
}
