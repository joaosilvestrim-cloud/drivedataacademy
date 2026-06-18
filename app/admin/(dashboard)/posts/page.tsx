import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { togglePublish } from "./actions";
import ConfirmDelete from "./ConfirmDelete";
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
      .select("id, title, category, cover_url, published, published_at, updated_at")
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

  const publishedCount = rows.filter((r) => r.published).length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Blog</h1>
          <p className="mt-1 text-sm text-slate-400">
            {rows.length} post(s) · {publishedCount} publicado(s)
          </p>
        </div>
        <Link
          href="/admin/posts/new"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          Novo post
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {rows.map((p) => (
          <div
            key={p.id}
            className="glass flex flex-wrap items-center gap-4 rounded-2xl border border-white/8 p-4"
          >
            {/* Miniatura */}
            <div className="relative aspect-[16/9] w-28 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5">
              {p.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-[0.65rem] text-slate-500">
                  sem capa
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${
                    p.published
                      ? "bg-brand-green/15 text-brand-green"
                      : "bg-white/5 text-slate-400"
                  }`}
                >
                  {p.published ? "Publicado" : "Rascunho"}
                </span>
                {p.category && <span className="text-xs text-slate-500">{p.category}</span>}
              </div>
              <Link href={`/admin/posts/${p.id}`} className="mt-1 block truncate font-medium text-white hover:text-brand-green">
                {p.title}
              </Link>
              <p className="mt-0.5 text-xs text-slate-500">
                {p.published ? `Publicado em ${fmt(p.published_at)}` : `Atualizado em ${fmt(p.updated_at)}`}
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
              <ConfirmDelete id={p.id} title={p.title} />
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-16 text-center">
            <p className="text-slate-400">Nenhum post ainda.</p>
            <Link href="/admin/posts/new" className="mt-3 inline-block text-sm font-medium text-brand-green hover:underline">
              Criar o primeiro post →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
