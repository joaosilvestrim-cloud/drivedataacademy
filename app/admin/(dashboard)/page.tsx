import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminError from "./AdminError";

export const dynamic = "force-dynamic";

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(iso));
}

const ICONS: Record<string, string> = {
  list: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  building: "M3 21h18M5 21V7l8-4v18M19 21V11l-6-3",
  doc: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  check: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
};

function StatCard({ label, value, href, icon }: { label: string; value: number; href: string; icon: string }) {
  return (
    <Link href={href} className="glass card-hover flex items-center justify-between rounded-2xl border border-white/8 p-5">
      <div>
        <p className="font-display text-3xl font-bold text-gradient-blue">{value}</p>
        <p className="mt-1 text-sm text-slate-400">{label}</p>
      </div>
      <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-brand-green">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d={ICONS[icon]} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </Link>
  );
}

export default async function AdminHome() {
  try {
    const supabase = createAdminClient();
    const head = (t: string, f?: (q: any) => any) => {
      let q = supabase.from(t).select("*", { count: "exact", head: true });
      if (f) q = f(q);
      return q;
    };

    const [waitlistC, leadsC, postsC, publishedC, recentWaitlist, recentLeads, recentPosts] =
      await Promise.all([
        head("waitlist"),
        head("enterprise_leads"),
        head("posts"),
        head("posts", (q) => q.eq("published", true)),
        supabase.from("waitlist").select("name, email, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("enterprise_leads").select("name, request_type, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("posts").select("id, title, published, updated_at").order("updated_at", { ascending: false }).limit(5),
      ]);

    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Visão geral</h1>
        <p className="mt-1 text-sm text-slate-400">Resumo do que está chegando pelo site.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Inscritos na lista" value={waitlistC.count ?? 0} href="/admin/waitlist" icon="list" />
          <StatCard label="Leads de empresas" value={leadsC.count ?? 0} href="/admin/leads" icon="building" />
          <StatCard label="Posts no total" value={postsC.count ?? 0} href="/admin/posts" icon="doc" />
          <StatCard label="Posts publicados" value={publishedC.count ?? 0} href="/admin/posts" icon="check" />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Últimos inscritos */}
          <div className="glass rounded-2xl border border-white/8 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">Últimos inscritos</h2>
              <Link href="/admin/waitlist" className="text-xs text-brand-green hover:underline">Ver todos</Link>
            </div>
            <div className="mt-4 space-y-3">
              {(recentWaitlist.data ?? []).map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{r.name}</p>
                    <p className="truncate text-xs text-slate-500">{r.email}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">{fmt(r.created_at)}</span>
                </div>
              ))}
              {(recentWaitlist.data ?? []).length === 0 && (
                <p className="text-sm text-slate-500">Ninguém ainda.</p>
              )}
            </div>
          </div>

          {/* Últimos leads */}
          <div className="glass rounded-2xl border border-white/8 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">Últimos leads de empresas</h2>
              <Link href="/admin/leads" className="text-xs text-brand-green hover:underline">Ver todos</Link>
            </div>
            <div className="mt-4 space-y-3">
              {(recentLeads.data ?? []).map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{r.name}</p>
                    <p className="truncate text-xs text-slate-500">{r.request_type || "—"}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">{fmt(r.created_at)}</span>
                </div>
              ))}
              {(recentLeads.data ?? []).length === 0 && (
                <p className="text-sm text-slate-500">Nenhum lead ainda.</p>
              )}
            </div>
          </div>
        </div>

        {/* Posts recentes */}
        <div className="mt-6 glass rounded-2xl border border-white/8 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-white">Posts recentes</h2>
            <Link href="/admin/posts/new" className="text-xs text-brand-green hover:underline">Novo post</Link>
          </div>
          <div className="mt-4 space-y-2">
            {(recentPosts.data ?? []).map((p: any) => (
              <Link key={p.id} href={`/admin/posts/${p.id}`} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-white/5">
                <span className="flex min-w-0 items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${p.published ? "bg-brand-green" : "bg-slate-600"}`} />
                  <span className="truncate text-sm text-slate-200">{p.title}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-500">{p.published ? "Publicado" : "Rascunho"}</span>
              </Link>
            ))}
            {(recentPosts.data ?? []).length === 0 && (
              <p className="text-sm text-slate-500">Nenhum post ainda.</p>
            )}
          </div>
        </div>
      </div>
    );
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Visão geral</h1>
        <div className="mt-6">
          <AdminError message={e instanceof Error ? e.message : "Erro desconhecido."} />
        </div>
      </div>
    );
  }
}
