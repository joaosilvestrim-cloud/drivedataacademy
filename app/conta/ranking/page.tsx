import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity, loadProfiles, displayName, BADGE_LABELS } from "@/lib/community";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  if (!(await canUseCommunity(admin, user.id, user.email))) redirect("/conta");

  const { data: events } = await admin.from("point_events").select("user_id, points");
  const totals: Record<string, number> = {};
  for (const e of events ?? []) totals[e.user_id] = (totals[e.user_id] || 0) + (e.points || 0);

  const ranked = Object.entries(totals).map(([id, pts]) => ({ id, pts })).sort((a, b) => b.pts - a.pts);
  const top = ranked.slice(0, 50);
  const { nameById, badgeById } = await loadProfiles(admin, [...top.map((r) => r.id), user.id]);

  const myPts = totals[user.id] || 0;
  const myRank = ranked.findIndex((r) => r.id === user.id);
  const medal = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Ranking</h1>
          <p className="mt-1 text-sm text-slate-400">Pontos por ajudar a comunidade.</p>
        </div>
        <Link href="/conta/comunidade" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 hover:border-brand-green/50 hover:text-brand-green">← Comunidade</Link>
      </div>

      {/* Minha posição */}
      <div className="mt-6 flex items-center justify-between rounded-2xl border border-brand-green/25 bg-brand-green/[0.06] px-5 py-4">
        <div>
          <p className="text-sm text-slate-300">Sua posição</p>
          <p className="font-display text-xl font-bold text-white">{myRank >= 0 ? `#${myRank + 1}` : "—"}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-300">Seus pontos</p>
          <p className="font-display text-xl font-bold text-brand-green">{myPts}</p>
        </div>
      </div>

      {/* Tabela */}
      <div className="mt-6 divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/8">
        {top.length === 0 && <p className="px-4 py-10 text-center text-slate-500">Ninguém pontuou ainda. Responda dúvidas na comunidade!</p>}
        {top.map((r, i) => (
          <div key={r.id} className={`flex items-center gap-4 px-4 py-3 ${r.id === user.id ? "bg-white/[0.03]" : ""}`}>
            <span className="w-8 shrink-0 text-center font-display text-sm font-bold text-slate-300">{medal(i)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-white">
                {displayName(nameById, r.id)}
                {(badgeById[r.id] || []).map((b) => (
                  <span key={b} className="ml-1.5 rounded-full bg-brand-teal/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-brand-teal">{BADGE_LABELS[b] || b}</span>
                ))}
              </p>
            </div>
            <span className="shrink-0 font-display text-sm font-bold text-brand-green">{r.pts} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}
