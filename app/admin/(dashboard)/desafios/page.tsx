import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { catalogVersions, KnowledgeSetupError } from "@/lib/knowledge/server";
import DesafiosAdmin from "./DesafiosAdmin";

export const dynamic = "force-dynamic";

export default async function DesafiosAdminPage() {
  if (!(await getAdminUser())) redirect("/admin/login");
  const db = createAdminClient();

  let competencies: { id: string; name: string }[] = [];
  try {
    const doc = (await catalogVersions()).at(-1)?.document;
    competencies = (doc?.competencies ?? []).map((c) => ({ id: c.id, name: c.name }));
  } catch (error) {
    const setup = error instanceof KnowledgeSetupError;
    return (
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-widest text-brand-green">Desafios</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">{setup ? "Estrutura ainda não instalada" : "Não foi possível carregar"}</h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          {setup
            ? "Rode a migração do Knowledge Universe e publique um catálogo antes de criar desafios."
            : "Tente novamente em instantes."}
        </p>
        <Link href="/admin/universo" className="mt-6 inline-block text-brand-green">Ir para o Knowledge Universe →</Link>
      </div>
    );
  }

  if (!competencies.length) {
    return (
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-widest text-brand-green">Desafios</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Publique um catálogo primeiro</h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-300">Os desafios se ligam a competências do catálogo publicado.</p>
        <Link href="/admin/universo" className="mt-6 inline-block text-brand-green">Ir para o Knowledge Universe →</Link>
      </div>
    );
  }

  const [{ data: challenges }, { data: subs }] = await Promise.all([
    db.from("ku_challenges").select("id, competency, dimension, title, brief, group_key, credits, advanced, published").order("created_at", { ascending: false }),
    db.from("ku_challenge_submissions").select("id, challenge_id, user_id, content, link, status, quality, feedback, created_at").order("created_at", { ascending: false }).limit(200),
  ]);

  const ids = Array.from(new Set((subs ?? []).map((s: any) => s.user_id)));
  const { data: profs } = ids.length
    ? await db.from("profiles").select("id, full_name").in("id", ids)
    : { data: [] as any[] };
  const nameById: Record<string, string> = {};
  for (const p of profs ?? []) nameById[p.id] = (p.full_name || "").trim() || "Aluno";

  const titleById: Record<string, string> = {};
  for (const c of challenges ?? []) titleById[c.id] = c.title;

  return (
    <DesafiosAdmin
      competencies={competencies}
      challenges={(challenges ?? []).map((c: any) => ({ ...c, credits: Number(c.credits) }))}
      submissions={(subs ?? []).map((s: any) => ({
        ...s,
        quality: s.quality === null ? null : Number(s.quality),
        studentName: nameById[s.user_id] || "Aluno",
        challengeTitle: titleById[s.challenge_id] || "Desafio",
      }))}
    />
  );
}
