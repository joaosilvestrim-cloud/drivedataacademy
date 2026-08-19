import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Mascot from "@/components/Mascot";
import { replyTicket } from "../actions";
import { CATEGORIES } from "@/lib/support";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";

const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: "Aberto", cls: "bg-amber-400/15 text-amber-300" },
  answered: { label: "Respondido", cls: "bg-brand-green/15 text-brand-green" },
  resolved: { label: "Resolvido", cls: "bg-white/10 text-slate-400" },
};

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

export default async function TicketPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("support_tickets")
    .select("id, user_id, subject, category, status, created_at")
    .eq("id", params.id)
    .maybeSingle();
  if (!ticket || ticket.user_id !== user.id) notFound();

  const { data: messages } = await admin
    .from("support_messages")
    .select("id, author, body, created_at")
    .eq("ticket_id", ticket.id)
    .order("created_at");

  const st = STATUS[ticket.status] || STATUS.open;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/conta/ajuda" className="text-xs text-slate-500 transition-colors hover:text-white">← Central de Ajuda</Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">{ticket.subject}</h1>
          <p className="mt-1 text-xs text-slate-500">{CATEGORIES[ticket.category] || ticket.category} · aberto em {fmt(ticket.created_at)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
      </div>

      {/* Conversa */}
      <div className="mt-6 space-y-4">
        {(messages ?? []).map((m: any) => {
          const mine = m.author === "user";
          return (
            <div key={m.id} className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}>
              {!mine && <Mascot className="h-9 w-9 shrink-0" />}
              <div className={`max-w-[80%] rounded-2xl border px-4 py-3 ${mine ? "border-brand-green/20 bg-brand-green/[0.08]" : "border-white/8 bg-white/[0.03]"}`}>
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">
                  {mine ? "Você" : m.author === "ai" ? "Assistente (IA)" : "Time DriveData"}
                  <span className="ml-2 font-normal normal-case text-slate-500">{fmt(m.created_at)}</span>
                </p>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-200">{m.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Responder */}
      {ticket.status === "resolved" ? (
        <p className="mt-8 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-slate-400">Este chamado foi marcado como resolvido. Precisa de mais ajuda? Abra um novo na Central.</p>
      ) : (
        <form action={replyTicket} className="mt-8 space-y-3 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <input type="hidden" name="ticket_id" value={ticket.id} />
          <p className="text-sm font-semibold text-white">Responder</p>
          <textarea name="body" required rows={3} placeholder="Escreva sua mensagem..." className={`${field} resize-y`} />
          <button className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">Enviar</button>
        </form>
      )}
    </div>
  );
}
