import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity, pointsByUser, BADGE_LABELS } from "@/lib/community";
import VitrineClient, { type Membro } from "./VitrineClient";
import { listaSkills } from "./skills";

export const dynamic = "force-dynamic";

export default async function VitrinePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
    }))
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 100);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Vitrine de alunos</h1>
          <p className="mt-1 text-sm text-slate-400">Conheça a comunidade: especialidades, pontos, conquistas e portfólio.</p>
        </div>
        <Link href="/conta/perfil" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 hover:border-brand-green/50 hover:text-brand-green">Editar meu perfil</Link>
      </div>

      <VitrineClient membros={membros} meuId={user.id} />
    </div>
  );
}
