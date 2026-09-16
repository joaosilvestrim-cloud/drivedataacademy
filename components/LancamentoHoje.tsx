import { createAdminClient } from "@/lib/supabase/admin";
import Cronometro from "@/components/Cronometro";

/* Abertura da home no formato de grade de programação: o próximo encontro ao
   vivo em destaque e a grade dos seguintes logo abaixo. Os dados vêm de
   live_events, então a grade acompanha o admin sozinha.

   No dia da estreia (DATA_ESTREIA) o título fala de estreia. Depois disso
   vira um convite geral às aulas ao vivo, para a home não mentir. */

const FUSO = "America/Sao_Paulo";
const DATA_ESTREIA = "2026-09-15";

type Evento = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  duration_min: number | null;
  url: string | null;
  cover_url: string | null;
  kind: string | null;
};

const diaISO = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: FUSO }).format(d);
const hora = (iso: string) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: FUSO }).format(new Date(iso));
const dataLonga = (d: Date) => new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: FUSO }).format(d);

function rotuloDia(iso: string, agora: Date) {
  const alvo = diaISO(new Date(iso));
  const hoje = diaISO(agora);
  const amanha = diaISO(new Date(agora.getTime() + 864e5));
  if (alvo === hoje) return "Hoje";
  if (alvo === amanha) return "Amanhã";
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: FUSO }).format(new Date(iso)).replace(".", "");
}

function subtitulo(d: string | null) {
  const linhas = (d || "").split("\n").map((l) => l.trim()).filter(Boolean);
  return linhas.length > 1 ? linhas.slice(1).join(" ") : linhas[0] || null;
}

export default async function LancamentoHoje() {
  let eventos: Evento[] = [];
  try {
    const { data } = await createAdminClient()
      .from("live_events")
      .select("id, title, description, starts_at, duration_min, url, cover_url, kind")
      .eq("published", true)
      // Busca o dia inteiro para trás e descarta abaixo o que já terminou: o
      // destaque acompanha a transmissão e sai do ar junto com ela.
      .gte("starts_at", new Date(Date.now() - 24 * 3600e3).toISOString())
      .order("starts_at")
      .limit(10);
    const fim = (e: Evento) => new Date(e.starts_at).getTime() + (e.duration_min || 60) * 60e3;
    eventos = (data ?? []).filter((e) => fim(e) >= Date.now()).slice(0, 6);
  } catch {
    eventos = [];
  }
  if (!eventos.length) return null;

  const agoraMs = Date.now();
  const agora = new Date(agoraMs);
  const [destaque, ...grade] = eventos;
  const estreia = diaISO(agora) === DATA_ESTREIA;
  const destaqueHoje = rotuloDia(destaque.starts_at, agora) === "Hoje";

  return (
    <section id="inicio" className="relative mx-auto max-w-7xl scroll-mt-28 px-6 pb-12 pt-32 sm:pt-40">
      <div id="ao-vivo" className="absolute -top-4" aria-hidden />

      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
        <div>
          {/* A live é a porta de entrada. O convite para assinar vem antes do
              título, senão a pessoa assiste e vai embora sem saber que existe
              uma plataforma atrás. */}
          <a
            href="/matricula"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-5 py-3 text-sm font-semibold text-ink-900 transition-colors hover:bg-white"
          >
            Faça parte da Academy
            <span aria-hidden="true">→</span>
          </a>
          <p className="mt-6 text-sm text-slate-400">
            {estreia ? `${dataLonga(agora)} · estreia da DriveData Academy` : "DriveData Academy · aulas abertas no YouTube"}
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
            {estreia ? (
              <>A Academy estreia hoje, <span className="text-brand-green">ao vivo.</span></>
            ) : (
              <>Aula aberta, <span className="text-brand-green">ao vivo</span>, toda semana.</>
            )}
          </h1>
          <p className="mt-5 max-w-lg text-lg text-slate-300/90">
            {estreia
              ? "Duas noites de aula aberta no YouTube, com quem entrega projeto de dados todo dia. Sem inscrição: é só entrar no horário."
              : "Lives e mentorias com quem faz dados de verdade. Sem inscrição: é só entrar no horário."}
          </p>

          <div className="mt-8 border-t border-white/10 pt-6">
            <p className="text-sm text-slate-400">
              {destaqueHoje ? "Hoje às" : `${rotuloDia(destaque.starts_at, agora)} às`}{" "}
              <span className="font-mono tabular-nums text-white">{hora(destaque.starts_at)}</span>
            </p>
            <p className="mt-1 font-display text-2xl font-semibold leading-snug text-white">{destaque.title}</p>
            {subtitulo(destaque.description) && <p className="mt-1 text-slate-400">{subtitulo(destaque.description)}</p>}
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Cronometro inicio={destaque.starts_at} duracaoMin={destaque.duration_min} agoraInicial={agoraMs} />
              {destaque.url && (
                <a
                  href={destaque.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-ink-900 transition-colors hover:bg-brand-green"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                  Assistir no YouTube
                </a>
              )}
            </div>
          </div>
        </div>

        {/* A capa da transmissão, como a tela do estúdio. */}
        <a
          href={destaque.url || "#ao-vivo"}
          target={destaque.url ? "_blank" : undefined}
          rel="noreferrer"
          className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-ink-800"
        >
          <span className="relative block aspect-[16/9]">
            {destaque.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={destaque.cover_url} alt={`Capa da live ${destaque.title}`} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
            ) : (
              <span className="absolute inset-0 bg-[linear-gradient(135deg,#0d2b3f,#071019_60%,#0a1f2e)]" />
            )}
            <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-ink-900/90 via-ink-900/40 to-transparent px-5 pb-4 pt-16">
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/80">
                {destaqueHoje ? "hoje" : rotuloDia(destaque.starts_at, agora)} · {hora(destaque.starts_at)} · youtube
              </span>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-ink-900 transition-transform group-hover:scale-105">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
              </span>
            </span>
          </span>
        </a>
      </div>

      {grade.length > 0 && (
        <div className="mt-14">
          <h2 className="font-display text-lg font-semibold text-white">Na grade</h2>
          <ol className="mt-3 border-t border-white/10">
            {grade.map((e) => (
              <li key={e.id} className="grid grid-cols-[5.5rem_1fr] items-baseline gap-x-5 gap-y-1 border-b border-white/10 py-4 sm:grid-cols-[7rem_4rem_1fr_auto]">
                <span className="font-mono text-sm text-brand-green">{rotuloDia(e.starts_at, agora)}</span>
                <span className="font-mono text-sm tabular-nums text-slate-400 sm:order-none">{hora(e.starts_at)}</span>
                <span className="col-span-2 min-w-0 sm:col-span-1">
                  <span className="block font-medium text-white">{e.title}</span>
                  <span className="block text-sm text-slate-500">{e.kind === "mentoria" ? "Mentoria" : "Live no YouTube"}</span>
                </span>
                {e.url ? (
                  <a href={e.url} target="_blank" rel="noreferrer" className="col-span-2 text-sm text-slate-300 underline decoration-white/20 underline-offset-4 transition-colors hover:text-brand-green hover:decoration-brand-green sm:col-span-1">
                    Lembrar no YouTube
                  </a>
                ) : (
                  <span className="col-span-2 text-sm text-slate-600 sm:col-span-1">link em breve</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
