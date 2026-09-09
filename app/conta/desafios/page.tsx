import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { knowledgeAccess, catalogVersions, KnowledgeSetupError } from "@/lib/knowledge/server";
import ChallengeList from "./ChallengeList";

export const dynamic = "force-dynamic";

export default async function DesafiosPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?next=/conta/desafios");

  const admin = createAdminClient();

  let liberado = false;
  try {
    liberado = await knowledgeAccess(user.id, user.email);
  } catch {
    liberado = false;
  }
  if (!liberado) {
    return (
      <div className="max-w-xl">
        <p className="text-sm font-medium uppercase tracking-wide text-brand-green">Desafios</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-white">Desafios práticos</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Os desafios fazem parte do Knowledge Universe e estão incluídos na assinatura ativa da Academy.
        </p>
        <Link href="/matricula" className="mt-6 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900">Conhecer a assinatura</Link>
      </div>
    );
  }

  // Nome da competência vem do catálogo publicado. Sem catálogo, não há desafio.
  let nameByCompetency: Record<string, string> = {};
  try {
    const doc = (await catalogVersions()).at(-1)?.document;
    for (const c of doc?.competencies ?? []) nameByCompetency[c.id] = c.name;
  } catch (error) {
    if (error instanceof KnowledgeSetupError) {
      return (
        <div className="max-w-xl">
          <p className="text-sm font-medium uppercase tracking-wide text-brand-green">Desafios</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-white">Em preparação</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">A equipe ainda está montando a estrutura de conhecimento. Volte em breve.</p>
        </div>
      );
    }
  }

  const [{ data: challenges }, { data: mine }] = await Promise.all([
    admin.from("ku_challenges").select("id, competency, dimension, title, brief, credits, advanced").eq("published", true).order("created_at", { ascending: false }),
    admin.from("ku_challenge_submissions").select("challenge_id, content, link, status, quality, feedback, reviewed_at").eq("user_id", user.id),
  ]);

  const byChallenge = Object.fromEntries((mine ?? []).map((s: any) => [s.challenge_id, s]));
  const items = (challenges ?? []).map((c: any) => ({
    ...c,
    credits: Number(c.credits),
    competencyName: nameByCompetency[c.competency] || c.competency,
    submission: byChallenge[c.id] ?? null,
  }));

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-brand-green">Desafios</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-white">Desafios práticos</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
        Aqui você demonstra na prática o que aprendeu. A equipe corrige e a evidência entra no seu
        Knowledge Universe. Sem prática avaliada, uma competência não passa de 79 pontos.
      </p>
      <Link href="/universo" target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-brand-teal hover:underline">Ver meu universo ↗</Link>

      <ChallengeList items={items} />
    </div>
  );
}
