import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity, pointsByUser, BADGE_LABELS } from "@/lib/community";
import Avatar from "@/components/Avatar";

export const dynamic = "force-dynamic";

const BADGE_ICONS: Record<string, string> = {
  fundador: "M12 2l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V5l7-3z",
  top: "M8 21h8M12 17v4M6 4h12v3a6 6 0 01-12 0V4zM6 5H3v1a3 3 0 003 3M18 5h3v1a3 3 0 01-3 3",
};

function tempo(iso?: string | null) {
  if (!iso) return "novo por aqui";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  if (days < 1) return "entrou hoje";
  if (days < 30) return `há ${days} dia${days > 1 ? "s" : ""}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} ${months > 1 ? "meses" : "mês"}`;
  const years = Math.floor(months / 12);
  return `há ${years} ano${years > 1 ? "s" : ""}`;
}

export default async function VitrinePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const admin = createAdminClient();
  if (!(await canUseCommunity(admin, user.id, user.email))) redirect("/conta");

  const [{ data: profs }, totals, { data: badgeRows }] = await Promise.all([
    admin.from("profiles").select("id, full_name, headline, avatar_url, portfolio_url, linkedin_url, created_at"),
    pointsByUser(admin),
    admin.from("user_badges").select("user_id, badge"),
  ]);

  const badgesById: Record<string, string[]> = {};
  for (const b of badgeRows ?? []) (badgesById[b.user_id] ||= []).push(b.badge);

  const members = (profs ?? [])
    .filter((p: any) => (p.full_name || "").trim())
    .map((p: any) => ({
      ...p,
      pts: totals[p.id] || 0,
      badges: badgesById[p.id] || [],
      since: p.created_at,
      link: (p.portfolio_url || p.linkedin_url || "").trim(),
    }))
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 100);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Vitrine de alunos</h1>
          <p className="mt-1 text-sm text-slate-400">Conheça a comunidade: pontos, conquistas, tempo de casa e portfólio.</p>
        </div>
        <Link href="/conta/perfil" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 hover:border-brand-green/50 hover:text-brand-green">Editar meu perfil</Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <div key={m.id} className="glass rounded-2xl border border-white/8 p-5">
            <div className="flex items-center gap-3">
              <Avatar name={m.full_name} src={m.avatar_url} size="lg" className="ring-2 ring-white/10" />
              <div className="min-w-0">
                <p className="truncate font-display text-base font-bold text-white">{m.full_name}{m.id === user.id && <span className="ml-1.5 text-xs font-normal text-brand-green">(você)</span>}</p>
                {m.headline && <p className="truncate text-xs text-slate-400">{m.headline}</p>}
                <p className="text-[0.7rem] text-slate-500">na comunidade {tempo(m.since)}</p>
              </div>
            </div>

            {m.badges.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {m.badges.map((b: string) => (
                  <span key={b} className="inline-flex items-center gap-1 rounded-full bg-brand-teal/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-brand-teal">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d={BADGE_ICONS[b] || "M12 2l3 6 6 .9-4.5 4.2 1 6-5.5-3-5.5 3 1-6L3 8.9 9 8z"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    {BADGE_LABELS[b] || b}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3">
              <span className="text-sm"><span className="font-display text-lg font-bold text-brand-green">{m.pts}</span> <span className="text-xs text-slate-400">pts</span></span>
              {m.link ? (
                <a href={m.link.startsWith("http") ? m.link : `https://${m.link}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-teal hover:underline">
                  Portfólio
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </a>
              ) : (
                <span className="text-xs text-slate-600">sem portfólio</span>
              )}
            </div>
          </div>
        ))}
        {members.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 px-4 py-12 text-center text-slate-500 sm:col-span-2 lg:col-span-3">Ainda não há alunos na vitrine.</p>}
      </div>
    </div>
  );
}
