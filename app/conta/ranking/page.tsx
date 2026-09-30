import { tr } from "@/lib/i18n/traduzir-servidor";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity, loadProfiles, displayName, BADGE_LABELS } from "@/lib/community";
import Avatar from "@/components/Avatar";
import RankingPodium from "@/components/ranking/RankingPodium";
import RankMedal from "@/components/ranking/RankMedal";
import MedalCatalog from "@/components/ranking/MedalCatalog";
import {loadCommunityRanking} from "@/lib/community-ranking";
import { usuarioAtual } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const BADGE_ICONS: Record<string, string> = {
  fundador: "M12 2l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V5l7-3z",
  top: "M8 21h8M12 17v4M6 4h12v3a6 6 0 01-12 0V4zM6 5H3v1a3 3 0 003 3M18 5h3v1a3 3 0 01-3 3",
};
function BadgeChips({ list }: { list?: string[] }) {
  if (!list?.length) return null;
  return (
    <>
      {list.map((b) => (
        <span key={b} className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-brand-teal/15 px-2 py-0.5 text-[0.6rem] font-semibold text-marca">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d={BADGE_ICONS[b] || "M12 2l3 6 6 .9-4.5 4.2 1 6-5.5-3-5.5 3 1-6L3 8.9 9 8z"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {BADGE_LABELS[b] || b}
        </span>
      ))}
    </>
  );
}
export default async function RankingPage() {
  const user = await usuarioAtual();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  if (!(await canUseCommunity(admin, user.id, user.email))) redirect("/conta");

  const ranked = await loadCommunityRanking();
  const top = ranked.slice(0, 50);
  const { nameById, badgeById } = await loadProfiles(admin, [...top.map((r) => r.id), user.id]);

  const myPts = ranked.find(r=>r.id===user.id)?.pts || 0;
  const myRank = ranked.findIndex((r) => r.id === user.id);

  const podium = top.slice(0, 3);
  const rest = top.slice(3);
  const maxPts = top[0]?.pts || 1;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[2rem] font-bold leading-tight tracking-tight text-obsidian">{tr("Ranking")}</h1>
          <p className="mt-1 text-sm text-slate-400">{tr("Pontos por ajudar a comunidade. Responda dúvidas e suba.")}</p>
        </div>
        <Link href="/conta/comunidade" className="rounded-full border border-tinta/25 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-acento/50 hover:text-acento">{tr("← Comunidade")}</Link>
      </div>

      {/* Comunicado do prêmio */}
      <div className="mt-5 flex items-start gap-3 rounded-[20px] border border-amber-400/40 bg-amber-400/[0.08] px-5 py-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-400/15 text-amber-300">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0zM7 4H4v2a3 3 0 003 3M17 4h3v2a3 3 0 01-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <div className="text-sm text-slate-300">
          <p className="font-semibold text-tinta">{tr("O 1º lugar leva prêmio 🏆")}</p>
          <p className="mt-0.5">{tr("Quem terminar em")} <b className="text-amber-200">{tr("1º no ranking")}</b> {tr("ganha")} <b className="text-tinta">{tr("assinatura grátis")}</b> {tr("pelo período seguinte e")} <b className="text-tinta">{tr("10% de desconto")}</b> {tr("na compra de cursos. Suba respondendo dúvidas, participando e concluindo treinamentos.")}</p>
        </div>
      </div>

      {/* Como ganhar pontos */}
      <div className="mt-4 rounded-[20px] border border-tinta/10 bg-papel p-5">
        <h2 className="text-lg font-bold tracking-tight text-obsidian">{tr("Como ganhar pontos")}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { pts: "+10", t: tr("Resolver dúvidas"), d: "Sua resposta marcada como solução vale 10 pontos.", d2: "M20 6L9 17l-5-5" },
            { pts: "+2", t: "Curtidas recebidas", d: "Cada curtida de outro aluno na sua mensagem.", d2: "M7 10v11M2 13v6a2 2 0 002 2h13.4a2 2 0 002-1.6l1.4-7A2 2 0 0018.8 10H14V5a2 2 0 00-2-2l-3 7z" },
            { pts: "+1", t: "Participar", d: "Cada mensagem na comunidade (até 5 por dia).", d2: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" },
            { pts: "★", t: tr("Desafios"), d: "Pontos extras que a equipe dá pelos desafios.", d2: "M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0z" },
          ].map((r) => (
            <div key={r.t} className="rounded-srf bg-fog p-4">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-papel text-marca">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d={r.d2} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <span className="font-mono text-lg font-medium tabular-nums text-marca">{r.pts}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-tinta">{r.t}</p>
              <p className="mt-0.5 text-xs text-slate-400">{r.d}</p>
            </div>
          ))}
        </div>
      </div>

      <MedalCatalog myRank={myRank>=0?myRank+1:null}/>

      <RankingPodium participants={podium.map(r => ({id:r.id, name:displayName(nameById,r.id), pts:r.pts}))}/>

      {/* Minha posição */}
      <div className="mt-8 flex items-center gap-4 escuro rounded-[20px] bg-noite px-6 py-5">
        {myRank >= 0 ? <RankMedal rank={myRank+1} name={displayName(nameById,user.id)} points={myPts} compact/> : <Avatar name={displayName(nameById, user.id)} size="md" />}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-300">{tr("Você")}</p>
          <p className="font-semibold text-tinta">{displayName(nameById, user.id)}<BadgeChips list={badgeById[user.id]} /></p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[2rem] font-medium leading-none tabular-nums text-white">{myRank >= 0 ? `#${myRank + 1}` : "—"}</p>
          <p className="mt-1 text-sm font-semibold text-marca-verde">{myPts} pts</p>
        </div>
      </div>

      {/* Demais posições */}
      {rest.length > 0 && (
        <div className="mt-6 space-y-2">
          {rest.map((r, i) => (
            <div key={r.id} className={`flex items-center gap-4 rounded-srf border px-4 py-3.5 ${r.id === user.id ? "border-marca/30 bg-marca-nevoa" : "border-tinta/10 bg-papel"}`}>
              <RankMedal rank={i+4} name={displayName(nameById,r.id)} points={r.pts} compact/>
              <Avatar name={displayName(nameById, r.id)} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-tinta">{displayName(nameById, r.id)}<BadgeChips list={badgeById[r.id]} /></p>
                <div className="mt-2 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-fog">
                  <div className="h-full rounded-full bg-marca-verde" style={{ width: `${Math.max(6, (r.pts / maxPts) * 100)}%` }} />
                </div>
              </div>
              <span className="shrink-0 font-mono text-sm font-medium tabular-nums text-marca">{r.pts} pts</span>
            </div>
          ))}
        </div>
      )}

      {top.length === 0 && (
        <div className="mt-8 rounded-[20px] border border-dashed border-tinta/20 bg-papel px-6 py-16 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-marca-nevoa text-marca">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0zM7 4H4v2a3 3 0 003 3M17 4h3v2a3 3 0 01-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <p className="font-medium text-tinta">{tr("O ranking está em branco.")}</p>
          <p className="mt-1 text-sm text-slate-400">{tr("Seja o primeiro a pontuar respondendo dúvidas na comunidade.")}</p>
          <Link href="/conta/comunidade" className="mt-5 inline-block rounded-full bg-marca-verde px-5 py-2.5 text-sm font-semibold text-sobre-acento">{tr("Ir para a comunidade")}</Link>
        </div>
      )}
    </div>
  );
}
