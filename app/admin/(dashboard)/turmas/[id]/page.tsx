import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadProfiles, displayName } from "@/lib/community";
import Avatar from "@/components/Avatar";
import { grantBatch, revokeFromTurma } from "../actions";
import TurmaForm from "../TurmaForm";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";

export default async function TurmaDetail({ params, searchParams }: { params: { id: string }; searchParams: { ok?: string; granted?: string; existed?: string; missing?: string } }) {
  const admin = createAdminClient();
  const { data: turma } = await admin.from("turmas").select("*").eq("id", params.id).maybeSingle();
  if (!turma) notFound();

  const { data: courses } = await admin.from("courses").select("id, title").order("title");
  const titleById: Record<string, string> = {};
  for (const c of courses ?? []) titleById[c.id] = c.title;
  const includesSummary = turma.includes === "selected"
    ? ((turma.course_ids || "").split(",").filter(Boolean).map((i: string) => titleById[i] || "?").join(", ") || "Nenhum curso selecionado")
    : "Todos os treinamentos (acesso full)";
  const { data: members } = await admin.from("memberships").select("id, user_id, expires_at, starts_at").eq("turma_id", turma.id).eq("status", "active").order("starts_at", { ascending: false });
  const ids = (members ?? []).map((m: any) => m.user_id);
  const { data: userData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById: Record<string, string> = {};
  for (const u of userData?.users ?? []) emailById[u.id] = u.email || "";
  const { nameById } = await loadProfiles(admin, ids);

  const granted = Number(searchParams?.granted || 0);
  const existed = Number(searchParams?.existed || 0);
  const missing = (searchParams?.missing || "").split(",").filter(Boolean);
  const showResult = searchParams?.granted != null || searchParams?.existed != null || missing.length > 0;

  return (
    <div>
      <Link href="/admin/turmas" className="text-xs text-slate-500 hover:text-white">← Turmas</Link>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <h1 className="font-display text-2xl font-bold text-white">{turma.name}</h1>
        <span className={`rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase ${turma.status === "open" ? "bg-brand-green/15 text-brand-green" : "bg-white/5 text-slate-400"}`}>{turma.status === "open" ? "Aberta" : "Fechada"}</span>
        {turma.online_sale && <span className="rounded-full bg-brand-blue/15 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase text-brand-cyan">venda online</span>}
      </div>
      <p className="mt-1 text-sm text-slate-400">Inclui: <span className="text-slate-200">{includesSummary}</span>{turma.price ? ` · R$ ${Number(turma.price).toFixed(2)}` : ""}</p>

      {searchParams?.ok && <div className="mt-4 rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm text-brand-green">{searchParams.ok}</div>}

      {/* Configuração da turma (o que inclui + cobrança) */}
      <div className="mt-6 glass rounded-2xl border border-white/8 p-5">
        <TurmaForm turma={turma} courses={courses ?? []} />
      </div>

      {/* Liberar acesso em lote */}
      <div className="mt-8 glass rounded-2xl border border-white/8 p-5">
        <h2 className="font-display text-lg font-bold text-white">Dar acesso a uma lista de alunos</h2>
        <p className="mt-1 text-sm text-slate-400">Cole os e-mails (um por linha ou separados por vírgula). Cada aluno recebe <span className="text-slate-200">{includesSummary}</span> na hora, com e-mail de boas-vindas. Quem ainda não tem conta precisa se cadastrar antes.</p>

        {showResult && (
          <div className="mt-4 space-y-2">
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-lg bg-brand-green/15 px-3 py-1.5 font-medium text-brand-green">{granted} liberado(s)</span>
              <span className="rounded-lg bg-white/5 px-3 py-1.5 font-medium text-slate-300">{existed} já tinha(m) acesso</span>
              {missing.length > 0 && <span className="rounded-lg bg-amber-400/15 px-3 py-1.5 font-medium text-amber-300">{missing.length} sem conta</span>}
            </div>
            {missing.length > 0 && (
              <div className="rounded-lg border border-amber-400/20 bg-amber-400/[0.05] p-3 text-xs text-amber-200/90">
                Sem conta criada (peça para se cadastrarem primeiro): {missing.join(", ")}
              </div>
            )}
          </div>
        )}

        <form action={grantBatch} className="mt-4 space-y-3">
          <input type="hidden" name="turma_id" value={turma.id} />
          <textarea name="emails" rows={5} required placeholder={"aluno1@email.com\naluno2@email.com\naluno3@email.com"} className={`${field} resize-y font-mono`} />
          <button className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">Dar acesso a estes alunos</button>
        </form>
      </div>

      {/* Alunos da turma */}
      <h2 className="mt-8 font-display text-lg font-bold text-white">Alunos com acesso nesta turma <span className="text-sm font-normal text-slate-500">({(members ?? []).length})</span></h2>
      <div className="mt-4 space-y-2">
        {(members ?? []).length === 0 && <p className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-slate-500">Ninguém liberado ainda.</p>}
        {(members ?? []).map((m: any) => {
          const email = emailById[m.user_id] || "(sem e-mail)";
          const name = displayName(nameById, m.user_id);
          return (
            <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar name={name} size="xs" />
                <div>
                  <p className="font-medium text-white">{name}</p>
                  <p className="text-xs text-slate-500">{email}{m.expires_at ? ` · expira ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(m.expires_at))}` : " · sem expiração"}</p>
                </div>
              </div>
              <form action={revokeFromTurma}>
                <input type="hidden" name="membership_id" value={m.id} />
                <input type="hidden" name="turma_id" value={turma.id} />
                <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-red-400/40 hover:text-red-400">Revogar</button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
