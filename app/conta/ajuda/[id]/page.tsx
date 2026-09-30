import { tr } from "@/lib/i18n/traduzir-servidor";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import Mascot from "@/components/Mascot";
import { replyTicket } from "../actions";
import { CATEGORIES } from "@/lib/support";
import { usuarioAtual } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-xl border border-tinta/10 bg-papel px-4 py-3 text-sm text-tinta placeholder:text-slate-500 outline-none focus:border-acento/60";

const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: "Aberto", cls: "bg-amber-400/15 text-amber-300" },
  answered: { label: "Respondido", cls: "bg-brand-green/15 text-acento" },
  resolved: { label: tr("Resolvido"), cls: "bg-tinta/10 text-slate-400" },
};

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

export default async function TicketPage({ params }: { params: { id: string } }) {
  const user = await usuarioAtual();
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
      <Link href="/conta/ajuda" className="text-xs text-slate-500 transition-colors hover:text-tinta">{tr("← Central de Ajuda")}</Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[2rem] font-bold leading-tight tracking-tight text-obsidian">{ticket.subject}</h1>
          <p className="mt-1 text-xs text-slate-500">{CATEGORIES[ticket.category] || ticket.category} · aberto em {fmt(ticket.created_at)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${st.cls}`}>{tr(st.label)}</span>
      </div>

      {/* Conversa */}
      <div className="mt-6 space-y-4">
        {(messages ?? []).map((m: any) => {
          const mine = m.author === "user";
          return (
            <div key={m.id} className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}>
              {!mine && <Mascot className="h-9 w-9 shrink-0" />}
              <div className={`max-w-[80%] rounded-[20px] border px-4 py-3 ${mine ? "border-acento/20 bg-brand-green/[0.08]" : "border-tinta/10 bg-papel"}`}>
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

      {/* O prazo fica na tela do chamado, nao so na Central: e aqui que a
          pessoa volta para ver se responderam. */}
      {ticket.status !== "resolved" && (
        <p className="mt-6 rounded-xl border border-brand-teal/25 bg-brand-teal/5 px-4 py-3 text-sm text-brand-teal">
          {tr("O time responde em até 3 dias úteis. Você recebe a resposta por aqui e por e-mail.")}
        </p>
      )}

      {/* Responder */}
      {ticket.status === "resolved" ? (
        <p className="mt-8 rounded-xl border border-tinta/10 bg-papel px-4 py-3 text-sm text-slate-400">{tr("Este chamado foi marcado como resolvido. Precisa de mais ajuda? Abra um novo na Central.")}</p>
      ) : (
        <form action={replyTicket} className="mt-8 space-y-3 rounded-[20px] border border-tinta/10 bg-papel p-5">
          <input type="hidden" name="ticket_id" value={ticket.id} />
          <p className="text-sm font-semibold text-tinta">{tr("Responder")}</p>
          <textarea name="body" required rows={3} placeholder={tr("Escreva sua mensagem...")} className={`${field} resize-y`} />
          <button className="rounded-full bg-marca-verde px-5 py-2.5 text-sm font-semibold text-sobre-acento transition-[filter] hover:brightness-95">{tr("Enviar")}</button>
        </form>
      )}
    </div>
  );
}
