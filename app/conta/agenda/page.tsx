import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity } from "@/lib/community";

export const dynamic = "force-dynamic";

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

export default async function AgendaPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  if (!(await canUseCommunity(admin, user.id, user.email))) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-white">Agenda de lives</h1>
        <p className="mt-2 text-slate-400">Exclusivo para alunos com acesso ativo.</p>
        <Link href="/matricula" className="mt-6 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900">Garantir meu acesso</Link>
      </div>
    );
  }

  const { data: lives } = await admin.from("live_events").select("*").eq("published", true).order("starts_at");
  const now = Date.now();
  const upcoming = (lives ?? []).filter((l: any) => new Date(l.starts_at).getTime() + (l.duration_min || 60) * 60000 >= now);
  const past = (lives ?? []).filter((l: any) => new Date(l.starts_at).getTime() + (l.duration_min || 60) * 60000 < now).reverse();

  const isLiveNow = (l: any) => {
    const s = new Date(l.starts_at).getTime();
    return now >= s - 15 * 60000 && now <= s + (l.duration_min || 60) * 60000;
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Agenda de lives</h1>
      <p className="mt-1 text-sm text-slate-400">Encontros ao vivo e o roadmap de conteúdo da turma.</p>

      {/* Próximas */}
      <h2 className="mt-8 font-display text-lg font-bold text-white">Próximas</h2>
      {upcoming.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-slate-500">Nenhuma live agendada por enquanto.</p>
      ) : (
        <ol className="mt-4 space-y-4 border-l border-white/10 pl-6">
          {upcoming.map((l: any) => {
            const live = isLiveNow(l);
            return (
              <li key={l.id} className="relative">
                <span className={`absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full ${live ? "bg-red-500 ring-4 ring-red-500/20" : "bg-brand-green"}`} />
                <div className="glass rounded-2xl border border-white/8 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg font-bold text-white">{l.title}</h3>
                    {live && <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-300">AO VIVO</span>}
                  </div>
                  <p className="mt-1 text-sm text-brand-teal">{fmt(l.starts_at)}{l.duration_min ? ` · ${l.duration_min} min` : ""}</p>
                  {l.description && <p className="mt-2 text-sm text-slate-300">{l.description}</p>}
                  {l.url && (live ? (
                    <a href={l.url} target="_blank" rel="noreferrer" className="mt-4 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900">Entrar na live →</a>
                  ) : (
                    <span className="mt-4 inline-block rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-slate-400">Link disponível no horário</span>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Anteriores */}
      {past.length > 0 && (
        <>
          <h2 className="mt-10 font-display text-lg font-bold text-white">Anteriores</h2>
          <div className="mt-4 space-y-3">
            {past.map((l: any) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-4">
                <div>
                  <p className="font-medium text-white">{l.title}</p>
                  <p className="text-xs text-slate-500">{fmt(l.starts_at)}</p>
                </div>
                {l.url && <a href={l.url} target="_blank" rel="noreferrer" className="text-sm text-brand-teal hover:underline">Ver gravação ↗</a>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
