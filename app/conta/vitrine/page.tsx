import { tr } from "@/lib/i18n/traduzir-servidor";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity, pointsByUser, BADGE_LABELS, seloDaCasa } from "@/lib/community";
import { rankUsers, ranksForUsers } from "@/lib/ranking";
import VitrineClient, { type Membro } from "./VitrineClient";
import { listaSkills } from "./skills";
import { usuarioAtual } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function VitrinePage() {
  const user = await usuarioAtual();
  if (!user) redirect("/entrar");
  const admin = createAdminClient();
  if (!(await canUseCommunity(admin, user.id, user.email))) redirect("/conta");

  const [{ data: profs }, totals, { data: badgeRows }] = await Promise.all([
    admin.from("profiles").select("id, full_name, headline, avatar_url, skills, created_at"),
    pointsByUser(admin),
    admin.from("user_badges").select("user_id, badge"),
  ]);

  const badgesById: Record<string, string[]> = {};
  for (const b of badgeRows ?? []) (badgesById[b.user_id] ||= []).push(b.badge);

  /* A posição no ranking é a mesma do chat e da página de ranking: uma ordenação
     só, em lib/ranking. Aqui ela vira a moldura da medalha no avatar. */
  const ranked = rankUsers(totals);
  const rankById = ranksForUsers(ranked, (profs ?? []).map((p: any) => p.id));
  const lider = ranked[0]?.pts ?? 0;

  const membros: Membro[] = (profs ?? [])
    .filter((p: any) => (p.full_name || "").trim())
    .map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      headline: p.headline ?? null,
      avatar_url: p.avatar_url ?? null,
      pts: totals[p.id] || 0,
      badges: (badgesById[p.id] || []).map((k) => ({ key: k, label: BADGE_LABELS[k] || k })),
      since: p.created_at ?? null,
      skills: listaSkills(p.skills),
      rank: rankById[p.id] ?? null,
      casa: seloDaCasa(badgesById[p.id]),
    }))
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 100);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">{tr("Vitrine de alunos")}</h1>
          <p className="mt-1 text-sm text-slate-400">{tr("Conheça a comunidade: especialidades, pontos, conquistas e portfólio.")}</p>
        </div>
        <Link href="/conta/perfil" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 hover:border-brand-green/50 hover:text-brand-green">{tr("Editar meu perfil")}</Link>
      </div>

      <VitrineClient membros={membros} meuId={user.id} lider={lider} />
    </div>
  );
}
