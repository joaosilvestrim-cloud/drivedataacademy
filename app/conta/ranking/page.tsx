import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity, loadProfiles, displayName, BADGE_LABELS } from "@/lib/community";
import Avatar from "@/components/Avatar";

export const dynamic = "force-dynamic";

function BadgeChips({ list }: { list?: string[] }) {
  if (!list?.length) return null;
  return (
    <>
      {list.map((b) => (
        <span key={b} className="ml-1.5 rounded-full bg-brand-teal/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-brand-teal">
          {BADGE_LABELS[b] || b}
        </span>
      ))}
    </>
  );
}

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

  const podium = top.slice(0, 3);
  const rest = top.slice(3);
  const maxPts = top[0]?.pts || 1;

  // Ordem visual do pódio: 2º, 1º, 3º
  const podiumOrder = [podium[1], podium[0], podium[2]];
  const heights = ["h-24", "h-32", "h-20"];
  const rings = ["ring-slate-300/40", "ring-amber-300/60", "ring-orange-400/40"];
  const medals = ["🥈", "🥇", "🥉"];
  const realRank = [2, 1, 3];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Ranking</h1>
          <p className="mt-1 text-sm text-slate-400">Pontos por ajudar a comunidade. Responda dúvidas e suba.</p>
        </div>
        <Link href="/conta/comunidade" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-brand-green/50 hover:text-brand-green">← Comunidade</Link>
      </div>

      {/* Pódio */}
      {podium.length > 0 && (
        <div className="mt-8 flex items-end justify-center gap-3 sm:gap-6">
          {podiumOrder.map((r, i) =>
            r ? (
              <div key={r.id} className="flex w-24 flex-col items-center sm:w-32">
                <div className="relative">
                  <Avatar name={displayName(nameById, r.id)} size={i === 1 ? "lg" : "md"} className={`ring-2 ${rings[i]}`} />
                  <span className="absolute -bottom-1 -right-1 text-lg">{medals[i]}</span>
                </div>
                <p className="mt-2 max-w-full truncate text-center text-sm font-semibold text-white">{displayName(nameById, r.id)}</p>
                <p className="text-xs font-bold text-brand-green">{r.pts} pts</p>
                <div className={`mt-2 flex w-full ${heights[i]} items-start justify-center rounded-t-xl border border-white/8 bg-gradient-to-b from-white/[0.06] to-transparent pt-2`}>
                  <span className="font-display text-lg font-bold text-slate-400">{realRank[i]}º</span>
                </div>
              </div>
            ) : (
              <div key={i} className="w-24 sm:w-32" />
            )
          )}
        </div>
      )}

      {/* Minha posição */}
      <div className="mt-8 flex items-center gap-4 rounded-2xl border border-brand-green/25 bg-gradient-to-r from-brand-green/[0.10] to-brand-blue/[0.06] px-5 py-4">
        <Avatar name={displayName(nameById, user.id)} size="md" />
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide text-slate-400">Você</p>
          <p className="font-semibold text-white">{displayName(nameById, user.id)}<BadgeChips list={badgeById[user.id]} /></p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-bold text-white">{myRank >= 0 ? `#${myRank + 1}` : "—"}</p>
          <p className="text-sm font-semibold text-brand-green">{myPts} pts</p>
        </div>
      </div>

      {/* Demais posições */}
      {rest.length > 0 && (
        <div className="mt-6 space-y-2">
          {rest.map((r, i) => (
            <div key={r.id} className={`flex items-center gap-4 rounded-xl border px-4 py-3 ${r.id === user.id ? "border-brand-green/30 bg-white/[0.04]" : "border-white/8 bg-white/[0.02]"}`}>
              <span className="w-6 shrink-0 text-center font-display text-sm font-bold text-slate-500">{i + 4}</span>
              <Avatar name={displayName(nameById, r.id)} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white">{displayName(nameById, r.id)}<BadgeChips list={badgeById[r.id]} /></p>
                <div className="mt-1.5 h-1 w-full max-w-[220px] overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-green to-brand-blue" style={{ width: `${Math.max(6, (r.pts / maxPts) * 100)}%` }} />
                </div>
              </div>
              <span className="shrink-0 font-display text-sm font-bold text-brand-green">{r.pts} pts</span>
            </div>
          ))}
        </div>
      )}

      {top.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-white/5 text-3xl">🏆</div>
          <p className="font-medium text-white">O ranking está em branco.</p>
          <p className="mt-1 text-sm text-slate-400">Seja o primeiro a pontuar respondendo dúvidas na comunidade.</p>
          <Link href="/conta/comunidade" className="mt-5 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900">Ir para a comunidade</Link>
        </div>
      )}
    </div>
  );
}
