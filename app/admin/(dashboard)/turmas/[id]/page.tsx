import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadProfiles, displayName } from "@/lib/community";
import Avatar from "@/components/Avatar";
import { updateTurma, grantBatch, revokeFromTurma } from "../actions";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";
const label = "block text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500";

function toDateInput(d: string | null) {
  return d ? d.slice(0, 10) : "";
}

export default async function TurmaDetail({ params, searchParams }: { params: { id: string }; searchParams: { ok?: string; granted?: string; existed?: string; missing?: string } }) {
  const admin = createAdminClient();
  const { data: turma } = await admin.from("turmas").select("*").eq("id", params.id).maybeSingle();
  if (!turma) notFound();

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
      <h1 className="mt-1 font-display text-2xl font-bold text-white">{turma.name}</h1>

      {searchParams?.ok && <div className="mt-4 rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm text-brand-green">{searchParams.ok}</div>}

      {/* Editar turma */}
      <form action={updateTurma} className="mt-6 glass grid gap-4 rounded-2xl border border-white/8 p-5 sm:grid-cols-2">
        <input type="hidden" name="id" value={turma.id} />
        <div className="space-y-1.5 sm:col-span-2"><label className={label}>Nome</label><input name="name" defaultValue={turma.name} className={field} /></div>
        <div className="space-y-1.5"><label className={label}>Início</label><input name="starts_at" type="date" defaultValue={toDateInput(turma.starts_at)} className={field} /></div>
        <div className="space-y-1.5"><label className={label}>Dias de acesso (vazio = sem expiração)</label><input name="access_days" type="number" defaultValue={turma.access_days ?? ""} className={field} /></div>
        <div className="space-y-1.5"><label className={label}>Preço (R$)</label><input name="price" defaultValue={turma.price ?? ""} className={field} /></div>
        <div className="space-y-1.5"><label className={label}>Status</label>
          <select name="status" defaultValue={turma.status} className={`${field} [&>option]:bg-ink-900`}><option value="open">Aberta</option><option value="closed">Fechada</option></select>
        </div>
        <div className="space-y-1.5 sm:col-span-2"><label className={label}>Anotações</label><textarea name="notes" defaultValue={turma.notes ?? ""} rows={2} className={`${field} resize-y`} /></div>
        <div><button className="rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2 text-sm font-semibold text-ink-900">Salvar turma</button></div>
      </form>

      {/* Liberar acesso em lote */}
      <div className="mt-8 glass rounded-2xl border border-white/8 p-5">
        <h2 className="font-display text-lg font-bold text-white">Liberar acesso em lote</h2>
        <p className="mt-1 text-sm text-slate-400">Cole os e-mails dos alunos (um por linha, ou separados por vírgula). Quem já tem conta ganha acesso full na hora, com o selo Fundador e e-mail de boas-vindas.</p>

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
          <button className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">Liberar acesso para a lista</button>
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
