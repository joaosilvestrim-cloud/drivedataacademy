import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BADGE_LABELS, pointsByUser } from "@/lib/community";
import ProfileForm from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  const [totals, { data: myEvents }, { data: badges }] = await Promise.all([
    pointsByUser(admin),
    admin.from("point_events").select("kind, points").eq("user_id", user.id),
    admin.from("user_badges").select("badge").eq("user_id", user.id),
  ]);

  const ranked = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const myPoints = totals[user.id] || 0;
  const myRank = ranked.findIndex(([id]) => id === user.id);
  const solutions = (myEvents ?? []).filter((e: any) => e.kind === "solution").length;
  const myBadges = (badges ?? []).map((b: any) => b.badge);

  const Icon = ({ d }: { d: string }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-brand-green"><path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
  );

  const stats = [
    { label: "Pontos", value: myPoints, d: "M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" },
    { label: "Posição", value: myRank >= 0 ? `#${myRank + 1}` : "—", d: "M4 20h16M7 20V9M12 20V4M17 20v-7" },
    { label: "Soluções", value: solutions, d: "M20 6L9 17l-5-5" },
  ];

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl font-bold text-white">Meu perfil</h1>
      <p className="mt-1 text-sm text-slate-400">Seus dados de aluno na DriveData Academy.</p>

      <ProfileForm />

      {/* Gamificação */}
      <div className="mt-8">
        <h2 className="font-display text-lg font-bold text-white">Minha gamificação</h2>
        <p className="mt-1 text-sm text-slate-400">Você ganha pontos participando da comunidade: cada curtida que suas mensagens recebem vale pontos e te faz subir no ranking.</p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-center">
              <div className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-brand-green/10"><Icon d={s.d} /></div>
              <p className="mt-2 font-display text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Selos */}
        <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <p className="text-sm font-semibold text-white">Meus selos</p>
          {myBadges.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {myBadges.map((b) => (
                <span key={b} className="inline-flex items-center gap-1.5 rounded-full border border-brand-teal/30 bg-brand-teal/10 px-3 py-1 text-xs font-semibold text-brand-teal">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.3 7.2 17.7l.9-5.4L4.2 8.5l5.4-.8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
                  {BADGE_LABELS[b] || b}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Você ainda não tem selos. O selo Fundador é dado aos alunos da primeira turma.</p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/conta/comunidade" className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">Ir para a comunidade</Link>
          <Link href="/conta/ranking" className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-brand-green/50 hover:text-brand-green">Ver ranking completo</Link>
        </div>
      </div>
    </div>
  );
}
