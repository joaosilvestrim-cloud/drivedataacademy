import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity, pointsByUser, BADGE_LABELS } from "@/lib/community";
import Avatar from "@/components/Avatar";
import { listaSkills } from "../skills";

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

function comProtocolo(u: string) {
  const s = u.trim();
  return s.startsWith("http") ? s : `https://${s}`;
}

/* Perfil público de um aluno dentro da comunidade.

   Mostra só o que o próprio aluno preencheu para ser visto: nome, título,
   resumo, especialidades e os links que ele mesmo publicou. Nada de e-mail,
   telefone ou currículo, que são dados de cadastro e não de vitrine. */

export default async function AlunoVitrinePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const admin = createAdminClient();
  if (!(await canUseCommunity(admin, user.id, user.email))) redirect("/conta");

  const [{ data: p }, totals, { data: badgeRows }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, headline, bio, skills, avatar_url, portfolio_url, linkedin_url, country, created_at")
      .eq("id", params.id)
      .maybeSingle(),
    pointsByUser(admin),
    admin.from("user_badges").select("badge").eq("user_id", params.id),
  ]);

  if (!p || !(p.full_name || "").trim()) notFound();

  const skills = listaSkills(p.skills);
  const badges = (badgeRows ?? []).map((b: any) => b.badge);
  const pts = totals[p.id] || 0;
  const souEu = p.id === user.id;

  const links = [
    p.portfolio_url ? { label: "Portfólio", url: comProtocolo(p.portfolio_url) } : null,
    p.linkedin_url ? { label: "LinkedIn", url: comProtocolo(p.linkedin_url) } : null,
  ].filter(Boolean) as { label: string; url: string }[];

  return (
    <div>
      <Link
        href="/conta/vitrine"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-brand-green"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Voltar para a vitrine
      </Link>

      <div className="glass mt-5 rounded-3xl border border-white/8 p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar name={p.full_name} src={p.avatar_url} size="lg" className="h-20 w-20 shrink-0 text-2xl ring-2 ring-white/10" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
              {p.full_name}
              {souEu && <span className="ml-2 align-middle text-sm font-normal text-brand-green">(você)</span>}
            </h1>
            {p.headline && <p className="mt-1 text-slate-300">{p.headline}</p>}
            <p className="mt-1.5 text-xs text-slate-500">
              na comunidade {tempo(p.created_at)}
              {p.country && ` · ${p.country}`}
            </p>

            {badges.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {badges.map((b: string) => (
                  <span key={b} className="inline-flex items-center gap-1 rounded-full bg-brand-teal/15 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-brand-teal">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={BADGE_ICONS[b] || "M12 2l3 6 6 .9-4.5 4.2 1 6-5.5-3-5.5 3 1-6L3 8.9 9 8z"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    {BADGE_LABELS[b] || b}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="shrink-0 rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-3 text-center">
            <p className="font-display text-2xl font-bold text-brand-green">{pts}</p>
            <p className="text-[0.7rem] uppercase tracking-wide text-slate-500">pontos</p>
          </div>
        </div>

        {skills.length > 0 && (
          <div className="mt-7 border-t border-white/8 pt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Especialidades</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {skills.map((s) => (
                <span key={s} className="rounded-md border border-brand-blue/25 bg-brand-blue/10 px-2.5 py-1 text-xs font-medium text-brand-teal">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {p.bio && (
          <div className="mt-7 border-t border-white/8 pt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sobre</h2>
            <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-slate-300">{p.bio}</p>
          </div>
        )}

        <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-white/8 pt-6">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-brand-green/50 hover:text-brand-green"
            >
              {l.label}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
          ))}
          {links.length === 0 && !souEu && <p className="text-sm text-slate-500">Este aluno ainda não publicou portfólio nem LinkedIn.</p>}
          {souEu && (
            <Link href="/conta/perfil" className="inline-flex items-center gap-1.5 rounded-xl border border-brand-green/40 px-4 py-2 text-sm font-medium text-brand-green hover:bg-brand-green/10">
              Editar meu perfil
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
