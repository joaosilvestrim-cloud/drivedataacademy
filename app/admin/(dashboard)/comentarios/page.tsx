import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadProfiles, displayName } from "@/lib/community";
import Avatar from "@/components/Avatar";
import AdminError from "../AdminError";
import { setCommentStatus, deleteComment, replyComment } from "./actions";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "bg-amber-400/15 text-amber-300" },
  approved: { label: "Aprovado", cls: "bg-brand-green/15 text-brand-green" },
  rejected: { label: "Recusado", cls: "bg-red-400/15 text-red-300" },
};

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

const FILTERS = [{ k: "pending", l: "Pendentes" }, { k: "approved", l: "Aprovados" }, { k: "rejected", l: "Recusados" }, { k: "all", l: "Todos" }];

export default async function ComentariosPage({ searchParams }: { searchParams: { f?: string } }) {
  const f = searchParams?.f || "pending";
  let comments: any[] = [];
  let lessonTitle: Record<string, string> = {}, courseTitle: Record<string, string> = {}, nameById: Record<string, string> = {};
  const counts: Record<string, number> = { pending: 0, approved: 0, rejected: 0, all: 0 };
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("lesson_comments").select("id, lesson_id, course_id, user_id, body, status, created_at, admin_reply, replied_at").order("created_at", { ascending: false }).limit(300);
    if (error) throw new Error(error.message);
    const all = data ?? [];
    for (const c of all) { counts.all++; counts[c.status] = (counts[c.status] || 0) + 1; }
    comments = f === "all" ? all : all.filter((c: any) => c.status === f);

    const [{ data: ls }, { data: cs }, prof] = await Promise.all([
      admin.from("lessons").select("id, title").in("id", Array.from(new Set(all.map((c: any) => c.lesson_id)))),
      admin.from("courses").select("id, title").in("id", Array.from(new Set(all.map((c: any) => c.course_id).filter(Boolean)))),
      loadProfiles(admin, all.map((c: any) => c.user_id)),
    ]);
    for (const l of ls ?? []) lessonTitle[l.id] = l.title;
    for (const c of cs ?? []) courseTitle[c.id] = c.title;
    nameById = prof.nameById;
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Comentários</h1>
        <div className="mt-6"><AdminError message={(e instanceof Error ? e.message : "Erro.") + " — rode o SQL de lesson_comments no Supabase."} /></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Comentários das aulas</h1>
      <p className="mt-1 text-sm text-slate-400">Aprove ou recuse os comentários dos alunos antes de aparecerem na aula.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((o) => (
          <Link key={o.k} href={`/admin/comentarios?f=${o.k}`} className={`rounded-full border px-4 py-1.5 text-sm font-medium ${f === o.k ? "border-brand-green/50 bg-brand-green/10 text-brand-green" : "border-white/10 text-slate-300 hover:border-white/30"}`}>{o.l} <span className="ml-1 text-xs opacity-70">{counts[o.k] ?? 0}</span></Link>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {comments.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 px-4 py-12 text-center text-slate-500">Nada por aqui.</p>}
        {comments.map((c) => {
          const st = STATUS[c.status] || STATUS.pending;
          return (
            <div key={c.id} className="glass rounded-2xl border border-white/8 p-4">
              <div className="flex items-start gap-3">
                <Avatar name={displayName(nameById, c.user_id)} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-white">{displayName(nameById, c.user_id)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase ${st.cls}`}>{st.label}</span>
                    <span className="text-xs text-slate-500">{fmt(c.created_at)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{courseTitle[c.course_id] || "—"} · aula: {lessonTitle[c.lesson_id] || "—"}</p>
                  <p className="mt-2 whitespace-pre-line text-sm text-slate-200">{c.body}</p>

                  {c.admin_reply && (
                    <div className="mt-2 rounded-xl border border-brand-blue/25 bg-brand-blue/[0.06] p-3">
                      <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-brand-teal">Resposta da equipe</p>
                      <p className="mt-1 whitespace-pre-line text-sm text-slate-200">{c.admin_reply}</p>
                    </div>
                  )}

                  <form action={replyComment} className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input type="hidden" name="id" value={c.id} />
                    <input name="reply" defaultValue={c.admin_reply || ""} placeholder={c.admin_reply ? "Editar resposta" : "Responder o aluno (aparece na aula)"} className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60" />
                    <button className="rounded-lg border border-brand-blue/40 bg-brand-blue/10 px-3 py-2 text-xs font-medium text-brand-teal">{c.admin_reply ? "Atualizar" : "Responder"}</button>
                  </form>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {c.status !== "approved" && (
                      <form action={setCommentStatus}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value="approved" /><button className="rounded-lg border border-brand-green/40 bg-brand-green/10 px-3 py-1.5 text-xs font-medium text-brand-green">Aprovar</button></form>
                    )}
                    {c.status !== "rejected" && (
                      <form action={setCommentStatus}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value="rejected" /><button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-amber-400/40 hover:text-amber-300">Recusar</button></form>
                    )}
                    <form action={deleteComment}><input type="hidden" name="id" value={c.id} /><button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-red-400/40 hover:text-red-400">Excluir</button></form>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
