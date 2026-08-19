import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadProfiles, displayName } from "@/lib/community";
import { CATEGORIES, TICKET_STATUS } from "@/lib/support";
import Mascot from "@/components/Mascot";
import { replyTicketAdmin, setTicketStatus } from "../actions";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

export default async function AdminTicketPage({ params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("support_tickets")
    .select("id, user_id, email, subject, category, status, created_at")
    .eq("id", params.id)
    .maybeSingle();
  if (!ticket) notFound();

  const [{ data: messages }, prof] = await Promise.all([
    admin.from("support_messages").select("id, author, body, created_at").eq("ticket_id", ticket.id).order("created_at"),
    loadProfiles(admin, [ticket.user_id]),
  ]);
  const studentName = displayName(prof.nameById, ticket.user_id);
  const st = TICKET_STATUS[ticket.status] || TICKET_STATUS.open;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/suporte" className="text-xs text-slate-500 transition-colors hover:text-white">← Suporte</Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">{ticket.subject}</h1>
          <p className="mt-1 text-xs text-slate-500">{CATEGORIES[ticket.category] || ticket.category} · {studentName} · {ticket.email} · {fmt(ticket.created_at)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
      </div>

      {/* Ações de status */}
      <div className="mt-4 flex flex-wrap gap-2">
        {ticket.status !== "resolved" ? (
          <form action={setTicketStatus}>
            <input type="hidden" name="ticket_id" value={ticket.id} />
            <input type="hidden" name="status" value="resolved" />
            <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-brand-green/50 hover:text-brand-green">Marcar como resolvido</button>
          </form>
        ) : (
          <form action={setTicketStatus}>
            <input type="hidden" name="ticket_id" value={ticket.id} />
            <input type="hidden" name="status" value="open" />
            <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-amber-400/50 hover:text-amber-300">Reabrir</button>
          </form>
        )}
      </div>

      {/* Conversa */}
      <div className="mt-6 space-y-4">
        {(messages ?? []).map((m: any) => {
          const fromStudent = m.author === "user";
          return (
            <div key={m.id} className={`flex gap-3 ${fromStudent ? "" : "flex-row-reverse"}`}>
              {!fromStudent && <Mascot className="h-9 w-9 shrink-0" />}
              <div className={`max-w-[80%] rounded-2xl border px-4 py-3 ${fromStudent ? "border-white/8 bg-white/[0.03]" : "border-brand-green/20 bg-brand-green/[0.08]"}`}>
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">
                  {fromStudent ? studentName : m.author === "ai" ? "Assistente (IA)" : "Time DriveData"}
                  <span className="ml-2 font-normal normal-case text-slate-500">{fmt(m.created_at)}</span>
                </p>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-200">{m.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Responder */}
      <form action={replyTicketAdmin} className="mt-8 space-y-3 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
        <input type="hidden" name="ticket_id" value={ticket.id} />
        <p className="text-sm font-semibold text-white">Responder ao aluno</p>
        <textarea name="body" required rows={4} placeholder="Escreva a resposta..." className={`${field} resize-y`} />
        <p className="text-xs text-slate-500">O aluno recebe a resposta por e-mail e na Central de Ajuda.</p>
        <button className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">Enviar resposta</button>
      </form>
    </div>
  );
}
