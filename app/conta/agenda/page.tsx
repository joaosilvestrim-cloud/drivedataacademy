import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity } from "@/lib/community";

export const dynamic = "force-dynamic";

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}
function shortDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}
function countdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "começando";
  const days = Math.floor(diff / 864e5);
  if (days >= 1) return `em ${days} dia${days > 1 ? "s" : ""}`;
  const hours = Math.floor(diff / 36e5);
  if (hours >= 1) return `em ${hours} h`;
  return `em ${Math.max(1, Math.floor(diff / 6e4))} min`;
}

export default async function AgendaPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  if (!(await canUseCommunity(admin, user.id, user.email))) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.02] px-6 py-20 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-green to-brand-blue text-ink-900">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h1 className="font-display text-2xl font-bold text-white">Agenda de lives</h1>
        <p className="mt-2 text-slate-400">Exclusivo para alunos com acesso ativo.</p>
        <Link href="/matricula" className="mt-6 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">Garantir meu acesso</Link>
      </div>
    );
  }

  const { data: lives } = await admin.from("live_events").select("*").eq("published", true).order("starts_at");
  const now = Date.now();
  const endOf = (l: any) => new Date(l.starts_at).getTime() + (l.duration_min || 60) * 60000;
  const upcoming = (lives ?? []).filter((l: any) => endOf(l) >= now);
  const past = (lives ?? []).filter((l: any) => endOf(l) < now).reverse();
  const isLiveNow = (l: any) => now >= new Date(l.starts_at).getTime() - 15 * 60000 && now <= endOf(l);

  const next = upcoming[0];
  const rest = upcoming.slice(1);

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-white">Agenda de lives</h1>
      <p className="mt-1 text-sm text-slate-400">Encontros ao vivo e o roadmap de conteúdo da turma.</p>

      {/* Próxima live em destaque */}
      {next ? (
        <div className="mt-6 glow-border overflow-hidden rounded-3xl">
          <div className="glass relative p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              {isLiveNow(next) ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300">
                  <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" /></span>
                  AO VIVO AGORA
                </span>
              ) : (
                <span className="rounded-full bg-brand-green/15 px-3 py-1 text-xs font-semibold text-brand-green">{next.kind === "mentoria" ? "Próxima mentoria" : "Próxima live"} · {countdown(next.starts_at)}</span>
              )}
              {next.kind === "mentoria" && <span className="rounded-full bg-brand-blue/15 px-3 py-1 text-xs font-semibold text-brand-teal">Mentoria</span>}
            </div>
            <h2 className="mt-3 font-display text-2xl font-bold text-white">{next.title}</h2>
            <p className="mt-1 text-sm text-brand-teal">{fmt(next.starts_at)}{next.duration_min ? ` · ${next.duration_min} min` : ""}</p>
            {next.description && <p className="mt-3 max-w-2xl text-sm text-slate-300">{next.description}</p>}
            {next.url && (isLiveNow(next) ? (
              <a href={next.url} target="_blank" rel="noreferrer" className="mt-5 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">Entrar na live →</a>
            ) : (
              <span className="mt-5 inline-block rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-slate-400">O link libera no horário</span>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-white/5 text-brand-green">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <p className="font-medium text-white">Nenhuma live agendada por enquanto.</p>
          <p className="mt-1 text-sm text-slate-400">Fique de olho, o calendário é atualizado toda semana.</p>
        </div>
      )}

      {/* Próximas (roadmap) */}
      {rest.length > 0 && (
        <>
          <h2 className="mt-10 font-display text-lg font-bold text-white">No roadmap</h2>
          <ol className="mt-4 space-y-4 border-l border-white/10 pl-6">
            {rest.map((l: any) => (
              <li key={l.id} className="relative">
                <span className="absolute -left-[31px] top-4 grid h-6 w-6 place-items-center rounded-full border border-white/10 bg-ink-800 text-[0.6rem] font-bold text-brand-green">{shortDate(l.starts_at).split(" ")[0]}</span>
                <div className="glass rounded-2xl border border-white/8 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg font-bold text-white">{l.title}</h3>
                    {l.kind === "mentoria" && <span className="rounded-full bg-brand-blue/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-brand-teal">Mentoria</span>}
                  </div>
                  <p className="mt-1 text-sm text-brand-teal">{fmt(l.starts_at)}{l.duration_min ? ` · ${l.duration_min} min` : ""} <span className="text-slate-500">· {countdown(l.starts_at)}</span></p>
                  {l.description && <p className="mt-2 text-sm text-slate-300">{l.description}</p>}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      {/* Anteriores */}
      {past.length > 0 && (
        <>
          <h2 className="mt-10 font-display text-lg font-bold text-white">Gravações anteriores</h2>
          <div className="mt-4 space-y-3">
            {past.map((l: any) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-slate-300">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1zM10 9l5 3-5 3V9z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  <div>
                    <p className="font-medium text-white">{l.title}</p>
                    <p className="text-xs text-slate-500">{fmt(l.starts_at)}</p>
                  </div>
                </div>
                {l.url && <a href={l.url} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-4 py-2 text-sm text-brand-teal transition-colors hover:border-brand-teal/50">Ver gravação ↗</a>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
