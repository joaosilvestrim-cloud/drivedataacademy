import { listaTraduzida } from "@/lib/i18n/conteudo";
import { tr } from "@/lib/i18n/traduzir-servidor";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity } from "@/lib/community";
import Cronometro from "@/components/Cronometro";
import RoadmapInterativo from "@/components/RoadmapInterativo";
import AgendaAtualizacao from "@/components/AgendaAtualizacao";
import { usuarioAtual } from "@/lib/sessao";

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
  const user = await usuarioAtual();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  if (!(await canUseCommunity(admin, user.id, user.email))) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.02] px-6 py-20 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-green to-brand-blue text-ink-900">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h1 className="font-display text-2xl font-bold text-white">{tr("Agenda de lives")}</h1>
        <p className="mt-2 text-slate-400">{tr("Exclusivo para alunos com acesso ativo.")}</p>
        <Link href="/matricula" className="mt-6 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">{tr("Garantir meu acesso")}</Link>
      </div>
    );
  }

  const { data: livesRaw } = await admin.from("live_events").select("*").eq("published", true).order("starts_at");
  const lives = await listaTraduzida("live_events", (livesRaw ?? []) as any[]);
  const now = Date.now();
  const endOf = (l: any) => new Date(l.starts_at).getTime() + (l.duration_min || 60) * 60000;
  const upcoming = (lives ?? []).filter((l: any) => endOf(l) >= now);
  const past = (lives ?? []).filter((l: any) => endOf(l) < now).reverse();
  const isLiveNow = (l: any) => now >= new Date(l.starts_at).getTime() - 15 * 60000 && now <= endOf(l);

  const next = upcoming[0];
  const rest = upcoming.slice(1);

  return (
    <div>
      <AgendaAtualizacao />
      <h1 className="font-display text-3xl font-bold text-white">{tr("Agenda de lives")}</h1>
      <p className="mt-1 text-sm text-slate-400">{tr("Encontros ao vivo e o roadmap de conteúdo da turma.")}</p>

      {/* Próxima live em destaque */}
      {next ? (
        <div className="mt-6 glow-border overflow-hidden rounded-3xl">
          <div className={`glass relative p-6 sm:p-8 ${next.cover_url ? "grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-center" : ""}`}>
            <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {isLiveNow(next) ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300">
                  <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" /></span>
                  {tr("AO VIVO AGORA")}
                </span>
              ) : (
                <span className="rounded-full bg-brand-green/15 px-3 py-1 text-xs font-semibold text-brand-green">{next.kind === "mentoria" ? tr("Próxima mentoria") : tr("Próxima live")} · {countdown(next.starts_at)}</span>
              )}
              {next.kind === "mentoria" && <span className="rounded-full bg-brand-blue/15 px-3 py-1 text-xs font-semibold text-brand-teal">{tr("Mentoria")}</span>}
            </div>
            <h2 className="mt-3 font-display text-2xl font-bold text-white">{next.title}</h2>
            <p className="mt-1 text-sm text-brand-teal">{fmt(next.starts_at)}{next.duration_min ? ` · ${next.duration_min} min` : ""}</p>
            <div className="mt-4"><Cronometro inicio={next.starts_at} duracaoMin={next.duration_min} agoraInicial={now} /></div>
            {next.description && <p className="mt-3 max-w-2xl text-sm text-slate-300">{next.description}</p>}
            {/* Link restrito primeiro. Esta é rota do middleware, e é o único
                lugar da plataforma que pode mostrar url_alunos: a home e
                /cursos são públicas, e lá o endereço do Teams seria o mesmo
                que deixar a sala destrancada. */}
            {next.url_alunos ? (
              <div className="mt-5">
                <a href={next.url_alunos} target="_blank" rel="noreferrer" className="inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
                  {isLiveNow(next) ? tr("Entrar na reunião →") : tr("Abrir a reunião ↗")}
                </a>
                <p className="mt-2 text-xs text-slate-500">{tr("Encontro fechado, só para alunos. Não compartilhe este link.")}</p>
                {next.acesso_alunos && (
                  <p className="mt-2 whitespace-pre-line font-mono text-xs leading-relaxed text-slate-400">{next.acesso_alunos}</p>
                )}
              </div>
            ) : next.url ? (isLiveNow(next) ? (
              <a href={next.url} target="_blank" rel="noreferrer" className="mt-5 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">{tr("Entrar na live →")}</a>
            ) : (
              /youtu/.test(next.url) ? (
                <a href={next.url} target="_blank" rel="noreferrer" className="mt-5 inline-block rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-500">{tr("Abrir no YouTube ↗")}</a>
              ) : (
                <span className="mt-5 inline-block rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-slate-400">{tr("O link libera no horário")}</span>
              )
            )) : null}
            </div>
            {next.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={next.cover_url} alt={`Banner: ${next.title}`} className="order-first aspect-[16/9] w-full rounded-2xl border border-white/10 object-cover lg:order-last" />
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-white/5 text-brand-green">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <p className="font-medium text-white">{tr("Nenhuma live agendada por enquanto.")}</p>
          <p className="mt-1 text-sm text-slate-400">{tr("Fique de olho, o calendário é atualizado toda semana.")}</p>
        </div>
      )}

      {/* Próximas (roadmap) */}
      {rest.length > 0 && (
        <>
          <h2 className="mt-10 font-display text-lg font-bold text-white">{tr("No roadmap")}</h2>
          <p className="mt-1 text-sm text-slate-400">{tr("Explore os próximos encontros e reserve sua próxima data.")}</p>
          <RoadmapInterativo
            agoraInicial={now}
            eventos={rest.map((l: any) => ({
              id: l.id,
              title: l.title,
              description: l.description ?? null,
              starts_at: l.starts_at,
              duration_min: l.duration_min ?? null,
              cover_url: l.cover_url ?? null,
              url: l.url ?? null,
              kind: l.kind ?? null,
            }))}
          />
        </>
      )}

      {/* Anteriores */}
      {past.length > 0 && (
        <>
          <h2 className="mt-10 font-display text-lg font-bold text-white">{tr("Gravações anteriores")}</h2>
          <div className="mt-4 space-y-3">
            {past.map((l: any) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-4">
                <div className="flex items-center gap-3">
                  {l.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.cover_url} alt="" className="aspect-[16/9] w-24 shrink-0 rounded-lg border border-white/10 object-cover sm:w-32" />
                  ) : (
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-slate-300">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1zM10 9l5 3-5 3V9z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  )}
                  <div>
                    <p className="font-medium text-white">{l.title}</p>
                    <p className="text-xs text-slate-500">{fmt(l.starts_at)}</p>
                  </div>
                </div>
                {l.recording_url ? (
                  <Link href={`/conta/gravacoes/${l.id}`} className="rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">{tr("Assistir gravação")}</Link>
                ) : (
                  <span className="text-xs text-slate-500">{tr("Gravação em breve")}</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
