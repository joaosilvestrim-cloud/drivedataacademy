import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Mascot from "@/components/Mascot";
import { createTicket } from "./actions";
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

export default async function AjudaPage({ searchParams }: { searchParams: { novo?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  const { data: tickets } = await admin
    .from("support_tickets")
    .select("id, subject, category, status, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <div className="max-w-3xl">
      {/* Intro do assistente */}
      <div className="flex items-center gap-5 rounded-3xl border border-white/8 bg-gradient-to-r from-brand-green/[0.10] to-brand-blue/[0.06] p-6">
        <Mascot className="h-20 w-20 shrink-0" />
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Central de Ajuda</h1>
          <p className="mt-1 text-sm text-slate-300">Oi! Sou o assistente da DriveData. Abra um chamado que eu respondo na hora as dúvidas mais comuns. Quando precisar, chamo o time para dar sequência.</p>
        </div>
      </div>

      {/* Novo chamado */}
      <details className="mt-6 glass rounded-2xl border border-white/8 p-5" open={searchParams?.novo === "1" || (tickets ?? []).length === 0}>
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-white">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-brand-green to-brand-blue text-ink-900">+</span>
          Abrir um chamado
        </summary>
        <form action={createTicket} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
            <input name="subject" required placeholder="Assunto" className={field} />
            <select name="category" defaultValue="duvida" className={`${field} [&>option]:bg-ink-900`}>
              {Object.entries(CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <textarea name="message" required rows={4} placeholder="Descreva sua dúvida ou problema..." className={`${field} resize-y`} />
          <button className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">Enviar chamado</button>
        </form>
      </details>

      {/* Meus chamados */}
      <h2 className="mt-10 font-display text-lg font-bold text-white">Meus chamados</h2>
      <div className="mt-4 space-y-2">
        {(tickets ?? []).length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-slate-500">Você ainda não abriu nenhum chamado.</div>
        )}
        {(tickets ?? []).map((t: any) => {
          const st = STATUS[t.status] || STATUS.open;
          return (
            <Link key={t.id} href={`/conta/ajuda/${t.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3.5 transition-colors hover:border-white/15 hover:bg-white/[0.04]">
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{t.subject}</p>
                <p className="text-xs text-slate-500">{CATEGORIES[t.category] || t.category} · atualizado {fmt(t.updated_at)}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
