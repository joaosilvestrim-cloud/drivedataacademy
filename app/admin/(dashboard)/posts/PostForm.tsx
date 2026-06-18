import Link from "next/link";
import { savePost } from "./actions";
import CoverField from "./CoverField";

type Post = {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  excerpt: string | null;
  content: string | null;
  cover_url: string | null;
  author: string | null;
  published: boolean;
} | null;

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60";
const label = "block text-sm font-medium text-slate-300";

export default function PostForm({ post }: { post?: Post }) {
  return (
    <form action={savePost} className="max-w-3xl space-y-6">
      {post && <input type="hidden" name="id" value={post.id} />}

      <div className="glass rounded-2xl border border-white/8 p-6 space-y-5">
        <div className="space-y-1.5">
          <label className={label} htmlFor="title">Título</label>
          <input id="title" name="title" required defaultValue={post?.title ?? ""} className={field} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={label} htmlFor="slug">Slug (URL)</label>
            <input id="slug" name="slug" placeholder="gerado do título se vazio" defaultValue={post?.slug ?? ""} className={field} />
          </div>
          <div className="space-y-1.5">
            <label className={label} htmlFor="category">Categoria</label>
            <input id="category" name="category" placeholder="Ex.: Power BI" defaultValue={post?.category ?? ""} className={field} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={label} htmlFor="excerpt">Resumo (aparece no card)</label>
          <textarea id="excerpt" name="excerpt" rows={2} defaultValue={post?.excerpt ?? ""} className={`${field} resize-none`} />
        </div>
      </div>

      <div className="glass rounded-2xl border border-white/8 p-6">
        <CoverField defaultUrl={post?.cover_url} />
      </div>

      <div className="glass rounded-2xl border border-white/8 p-6 space-y-5">
        <div className="space-y-1.5">
          <label className={label} htmlFor="content">Conteúdo</label>
          <textarea id="content" name="content" rows={12} defaultValue={post?.content ?? ""} className={`${field} resize-y`} />
        </div>
        <div className="space-y-1.5">
          <label className={label} htmlFor="author">Autor</label>
          <input id="author" name="author" defaultValue={post?.author ?? "DriveData Academy"} className={`${field} max-w-xs`} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <label className="flex items-center gap-3 text-sm text-slate-300">
          <input type="checkbox" name="published" defaultChecked={post?.published ?? false} className="h-4 w-4 accent-emerald-400" />
          Publicar (visível no site)
        </label>

        <div className="flex items-center gap-3">
          <Link href="/admin/posts" className="text-sm text-slate-400 hover:text-white">
            Cancelar
          </Link>
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]"
          >
            Salvar
          </button>
        </div>
      </div>
    </form>
  );
}
