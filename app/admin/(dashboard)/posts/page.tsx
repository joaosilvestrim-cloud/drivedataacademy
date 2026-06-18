import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { deletePost, togglePublish } from "./actions";
import AdminError from "../AdminError";

export const dynamic = "force-dynamic";

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(iso));
}

export default async function PostsPage() {
  let rows: any[] = [];
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("posts")
      .select("id, title, category, published, published_at, updated_at")
      .order("updated_at", { ascending: false });
    rows = data ?? [];
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Blog</h1>
        <div className="mt-6">
          <AdminError message={e instanceof Error ? e.message : "Erro desconhecido."} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Blog</h1>
          <p className="mt-1 text-sm text-slate-400">{rows.length} post(s).</p>
        </div>
        <Link
          href="/admin/posts/new"
          className="rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]"
        >
          Novo post
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {rows.map((p) => (
          <div
            key={p.id}
            className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 p-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    p.published ? "bg-brand-green" : "bg-slate-600"
                  }`}
                />
                <Link href={`/admin/posts/${p.id}`} className="truncate font-medium text-white hover:text-brand-green">
                  {p.title}
                </Link>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {p.category || "Sem categoria"} ·{" "}
                {p.published ? `Publicado em ${fmt(p.published_at)}` : "Rascunho"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <form action={togglePublish}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="next" value={(!p.published).toString()} />
                <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-brand-green/50 hover:text-brand-green">
                  {p.published ? "Despublicar" : "Publicar"}
                </button>
              </form>
              <Link
                href={`/admin/posts/${p.id}`}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-white/30 hover:text-white"
              >
                Editar
              </Link>
              <form action={deletePost}>
                <input type="hidden" name="id" value={p.id} />
                <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-red-400/40 hover:text-red-400">
                  Excluir
                </button>
              </form>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="rounded-2xl border border-white/8 px-4 py-10 text-center text-slate-500">
            Nenhum post ainda. Crie o primeiro!
          </div>
        )}
      </div>
    </div>
  );
}
