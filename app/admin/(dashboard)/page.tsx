import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminError from "./AdminError";

export const dynamic = "force-dynamic";

async function count(table: string, filter?: (q: any) => any) {
  const supabase = createAdminClient();
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count: c } = await q;
  return c ?? 0;
}

export default async function AdminHome() {
  let waitlist = 0, leads = 0, posts = 0, published = 0;
  try {
    [waitlist, leads, posts, published] = await Promise.all([
      count("waitlist"),
      count("enterprise_leads"),
      count("posts"),
      count("posts", (q) => q.eq("published", true)),
    ]);
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

  const cards = [
    { label: "Inscritos na lista", value: waitlist, href: "/admin/waitlist" },
    { label: "Leads de empresas", value: leads, href: "/admin/leads" },
    { label: "Posts no total", value: posts, href: "/admin/posts" },
    { label: "Posts publicados", value: published, href: "/admin/posts" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Visão geral</h1>
      <p className="mt-1 text-sm text-slate-400">Resumo do que está chegando pelo site.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="glass card-hover rounded-2xl border border-white/8 p-5"
          >
            <p className="font-display text-3xl font-bold text-gradient-blue">{c.value}</p>
            <p className="mt-1 text-sm text-slate-400">{c.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
