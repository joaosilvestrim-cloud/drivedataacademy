import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadProfiles, displayName } from "@/lib/community";
import Avatar from "@/components/Avatar";
import { Button, Status } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/layout";
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

const TOM: Record<string, "attention" | "accent" | "danger"> = {
  pending: "attention",
  approved: "accent",
  rejected: "danger",
};

/* Mesmo desenho do filtro de /admin/suporte, e de novo local. São dois
   consumidores com a mesma forma, o que já justifica avaliar promoção, mas a
   promoção precisa de aprovação antes de tocar em components/ui. */
function FiltroStatus({ ativo, counts }: { ativo: string; counts: Record<string, number> }) {
  return (
    <nav aria-label="Filtrar comentários por situação" className="flex flex-wrap gap-2">
      {FILTERS.map((o) => {
        const atual = ativo === o.k;
        return (
          <Link
            key={o.k}
            href={`/admin/comentarios?f=${o.k}`}
            aria-current={atual ? "page" : undefined}
            className={`inline-flex items-baseline gap-2 rounded-ctl border px-3 py-1.5 text-label font-medium transition-colors duration-fast ease-ds ${
              atual ? "border-ds-accent/50 bg-ds-accent/[0.07] text-ds-accent" : "border-ds-line text-ds-text-2 hover:border-ds-text-3 hover:text-ds-text"
            }`}
          >
            {o.l}
            <span className="font-mono text-caption tabular-nums">{counts[o.k] ?? 0}</span>
          </Link>
        );
      })}
    </nav>
  );
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

      <div className="mt-6">
        <FiltroStatus ativo={f} counts={counts} />
      </div>

      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-ds-line pb-2.5">
        <h2 className="font-display text-section font-semibold text-ds-text">
          {FILTERS.find((o) => o.k === f)?.l ?? "Comentários"}
        </h2>
        <span className="text-meta uppercase text-ds-text-3">
          {comments.length} {comments.length === 1 ? "comentário" : "comentários"}
        </span>
      </div>

      {comments.length === 0 ? (
        counts.all === 0 ? (
          <EmptyState
            title="Nenhum comentário ainda"
            description="Quando um aluno comentar numa aula, ele entra aqui para moderação."
          />
        ) : (
          <EmptyState
            title={`Nenhum comentário em ${(FILTERS.find((o) => o.k === f)?.l ?? f).toLowerCase()}`}
            description={`Existem ${counts.all} ${counts.all === 1 ? "comentário" : "comentários"} na fila. Troque a situação acima para vê-los.`}
          />
        )
      ) : (
        <ul className="flex flex-col">
          {comments.map((c) => {
            const st = STATUS[c.status] || STATUS.pending;
            return (
              <li key={c.id} className="flex gap-3 border-b border-ds-line-soft py-5">
                <Avatar name={displayName(nameById, c.user_id)} size="sm" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-body-sm font-medium text-ds-text">{displayName(nameById, c.user_id)}</span>
                    <Status tone={TOM[c.status] ?? "neutral"}>{st.label}</Status>
                    <span className="text-caption text-ds-text-3">{fmt(c.created_at)}</span>
                  </div>
                  <p className="text-caption text-ds-text-3">
                    {courseTitle[c.course_id] || "—"} · aula: {lessonTitle[c.lesson_id] || "—"}
                  </p>
                  <p className="whitespace-pre-line text-body text-ds-text-2">{c.body}</p>

                  {c.admin_reply && (
                    <div className="border-l-2 border-ds-info py-1.5 pl-3">
                      <p className="text-meta uppercase text-ds-text-3">Resposta da equipe</p>
                      <p className="mt-1 whitespace-pre-line text-body-sm text-ds-text-2">{c.admin_reply}</p>
                    </div>
                  )}

                  {/* Responder também aprova o comentário, que é o comportamento
                      da action. A frase diz isso em vez de deixar a pessoa
                      descobrir depois. */}
                  <form action={replyComment} className="mt-1 flex flex-col gap-1.5">
                    <input type="hidden" name="id" value={c.id} />
                    <label htmlFor={`comentario-${c.id}-reply`} className="text-label font-medium text-ds-text-2">
                      {c.admin_reply ? "Editar a resposta" : "Responder o aluno"}
                    </label>
                    <div className="flex flex-col gap-2 tablet:flex-row">
                      <input
                        id={`comentario-${c.id}-reply`}
                        name="reply"
                        defaultValue={c.admin_reply || ""}
                        className="h-10 w-full rounded-ctl border border-ds-line bg-ds-surface px-3 text-body text-ds-text placeholder:text-ds-text-3 transition-colors duration-fast ease-ds hover:border-ds-text-3"
                      />
                      <Button type="submit" variant="secondary" size="sm" className="shrink-0 tablet:h-10">
                        {c.admin_reply ? "Atualizar resposta" : "Responder"}
                      </Button>
                    </div>
                    <p className="text-caption text-ds-text-3">
                      A resposta aparece na aula e aprova o comentário junto. Apagar o texto desfaz a resposta.
                    </p>
                  </form>

                  <div className="flex flex-wrap items-center gap-2 border-t border-ds-line-soft pt-3">
                    {c.status !== "approved" && (
                      <form action={setCommentStatus}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="status" value="approved" />
                        <Button type="submit" size="sm">Aprovar</Button>
                      </form>
                    )}
                    {c.status !== "rejected" && (
                      <form action={setCommentStatus}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="status" value="rejected" />
                        <Button type="submit" variant="secondary" size="sm">Recusar</Button>
                      </form>
                    )}
                    <form action={deleteComment}>
                      <input type="hidden" name="id" value={c.id} />
                      <Button type="submit" variant="danger" size="sm">Excluir</Button>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
