import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Mascot from "@/components/Mascot";
import OpenAssistant from "./OpenAssistant";
import { CATEGORIES, TICKET_STATUS } from "@/lib/support";

export const dynamic = "force-dynamic";

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
      <div className="glow-border overflow-hidden rounded-3xl">
        <div className="glass flex flex-col items-center gap-5 p-8 text-center sm:flex-row sm:text-left">
          <Mascot className="h-24 w-24 shrink-0 animate-float" />
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold text-white">Central de Ajuda</h1>
            <p className="mt-1 text-sm text-slate-300">Fale com o assistente da DriveData. Ele responde suas dúvidas na hora e, quando precisar de uma pessoa, aciona o time sem burocracia.</p>
            <OpenAssistant auto={searchParams?.novo === "1"} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
              Conversar com o assistente
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </OpenAssistant>
          </div>
        </div>
      </div>

      {/* Meus chamados */}
      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-white">Meus atendimentos</h2>
        <span className="text-xs text-slate-500">{(tickets ?? []).length} no total</span>
      </div>
      <div className="mt-4 space-y-2">
        {(tickets ?? []).length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center">
            <p className="font-medium text-white">Nenhum atendimento por aqui ainda.</p>
            <p className="mt-1 text-sm text-slate-400">Abra o assistente acima e mande sua dúvida. Se ele acionar o time, o atendimento aparece nesta lista.</p>
          </div>
        )}
        {(tickets ?? []).map((t: any) => {
          const st = TICKET_STATUS[t.status] || TICKET_STATUS.open;
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
