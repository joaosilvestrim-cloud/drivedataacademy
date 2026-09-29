import { tr } from "@/lib/i18n/traduzir-servidor";
import { listaTraduzida } from "@/lib/i18n/conteudo";
import { createAdminClient } from "@/lib/supabase/admin";
import Cronometro from "@/components/Cronometro";
import CupomDestaque from "@/components/CupomDestaque";

/* Abertura da home: a temporada de lives, que agora acontecem DENTRO da
   plataforma, e não mais no YouTube.

   Três peças, todas alimentadas por live_events, então a home acompanha o
   admin sozinha:
   - à esquerda, o convite e o próximo encontro com a contagem;
   - à direita, os cartazes das próximas lives em leque, o da vez na frente;
   - embaixo, a temporada inteira como uma faixa de cartazes.

   O link de entrada da live (url_alunos) é credencial e nunca aparece aqui:
   quem não assina é levado à matrícula, quem assina entra pela agenda. */

const FUSO = "America/Sao_Paulo";

type Evento = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  duration_min: number | null;
  cover_url: string | null;
  kind: string | null;
  mentor_nome: string | null;
  certificate_enabled: boolean | null;
};

const diaISO = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: FUSO }).format(d);
const hora = (iso: string) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: FUSO }).format(new Date(iso));
const mes = (iso: string) => new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: FUSO }).format(new Date(iso));

function rotuloDia(iso: string, agora: Date) {
  const alvo = diaISO(new Date(iso));
  if (alvo === diaISO(agora)) return "Hoje";
  if (alvo === diaISO(new Date(agora.getTime() + 864e5))) return "Amanhã";
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: FUSO }).format(new Date(iso)).replace(".", "");
}

function subtitulo(d: string | null) {
  const linhas = (d || "").split("\n").map((l) => l.trim()).filter(Boolean);
  return linhas.length > 1 ? linhas.slice(1).join(" ") : linhas[0] || null;
}

const tipo = (k: string | null) => (k === "mentoria" ? "Mentoria" : "Live");

function Cartaz({ e, className = "" }: { e: Evento; className?: string }) {
  return e.cover_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={e.cover_url} alt="" className={`h-full w-full object-cover ${className}`} loading="lazy" />
  ) : (
    <span className={`flex h-full w-full items-end bg-[linear-gradient(135deg,#0d2b3f,#071019_60%,#0a1f2e)] p-4 font-display text-lg font-bold leading-tight text-white ${className}`}>{e.title}</span>
  );
}

export default async function LancamentoHoje() {
  let eventos: Evento[] = [];
  try {
    const { data } = await createAdminClient()
      .from("live_events")
      .select("id, title, description, starts_at, duration_min, cover_url, kind, mentor_nome, certificate_enabled")
      .eq("published", true)
      // O dia inteiro para trás: o destaque acompanha a transmissão e sai
      // da home junto com ela.
      .gte("starts_at", new Date(Date.now() - 24 * 3600e3).toISOString())
      .order("starts_at")
      .limit(16);
    const fim = (e: Evento) => new Date(e.starts_at).getTime() + (e.duration_min || 60) * 60e3;
    const vivos = (data ?? []).filter((e) => fim(e as Evento) >= Date.now()).slice(0, 12);
    // Primeira coisa da home, inclusive para quem chega de fora: o título acompanha o idioma.
    eventos = await listaTraduzida("live_events", vivos as any[]);
  } catch {
    eventos = [];
  }
  if (!eventos.length) return null;

  const agoraMs = Date.now();
  const agora = new Date(agoraMs);
  const [destaque] = eventos;
  const leque = eventos.slice(0, 4);
  const comCertificado = eventos.some((e) => e.certificate_enabled);

  return (
    <section id="inicio" className="relative mx-auto max-w-7xl scroll-mt-28 overflow-x-clip px-6 pb-12 pt-32 sm:pt-40">
      <div id="ao-vivo" className="absolute -top-4" aria-hidden />
      <style>{`
        .leque { perspective: 1400px; }
        .leque .cartaz { transition: transform .6s cubic-bezier(.2,.8,.2,1), opacity .6s, filter .6s; transform-origin: 50% 110%; }
        .leque .c0 { transform: translate3d(0,0,0) rotate(0deg); z-index: 4; }
        .leque .c1 { transform: translate3d(9%, -6%, -60px) rotate(5deg) scale(.94); z-index: 3; filter: brightness(.7); }
        .leque .c2 { transform: translate3d(17%, -11%, -120px) rotate(10deg) scale(.88); z-index: 2; filter: brightness(.5); }
        .leque .c3 { transform: translate3d(24%, -15%, -180px) rotate(15deg) scale(.82); z-index: 1; filter: brightness(.35); }
        .leque:hover .c0, .leque:focus-within .c0 { transform: translate3d(-6%, 2%, 0) rotate(-3deg); }
        .leque:hover .c1, .leque:focus-within .c1 { transform: translate3d(14%, -10%, -40px) rotate(6deg) scale(.95); filter: brightness(.85); }
        .leque:hover .c2, .leque:focus-within .c2 { transform: translate3d(30%, -18%, -80px) rotate(14deg) scale(.9); filter: brightness(.7); }
        .leque:hover .c3, .leque:focus-within .c3 { transform: translate3d(44%, -24%, -120px) rotate(22deg) scale(.85); filter: brightness(.55); }
        @media (prefers-reduced-motion: reduce) { .leque .cartaz { transition: none; } }
      `}</style>

      <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
        <div>
          {/* O convite para assinar vem antes do título: a live é a porta de
              entrada, e ela agora fica dentro da plataforma. */}
          <a
            href="/matricula"
            className="group inline-flex rounded-2xl bg-gradient-to-r from-brand-green via-brand-teal to-brand-blue p-[2px] shadow-[0_18px_44px_-20px_rgba(52,232,160,0.85)] transition-transform duration-300 hover:scale-[1.02]"
          >
            <span className="inline-flex items-center gap-3 rounded-[14px] bg-ink-900 px-8 py-4 text-base font-bold text-white transition-colors duration-300 group-hover:bg-transparent group-hover:text-ink-900 sm:text-lg">
              {tr("Faça parte da Academy")}
              <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </span>
          </a>
          <p className="mt-3 text-sm text-slate-400">{tr("Comunidade, lives, gravações e biblioteca de materiais no mesmo lugar.")}</p>

          {/* Cupom de lançamento: sai sozinho da home quando vence. */}
          <CupomDestaque />

          <h1 className="mt-10 font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
            {tr("Aula ao vivo toda semana,")} <span className="text-brand-green">{tr("dentro da Academy.")}</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-slate-300/90">
            {comCertificado
              ? tr("Lives e mentorias com quem faz dados de verdade. Você assiste pela plataforma, pergunta ao vivo e fica com a gravação e o certificado de participação.")
              : tr("Lives e mentorias com quem faz dados de verdade. Você assiste pela plataforma, pergunta ao vivo e fica com a gravação.")}
          </p>

          <div className="mt-8 border-t border-white/10 pt-6">
            <p className="text-sm text-slate-400">
              {rotuloDia(destaque.starts_at, agora) === "Hoje" ? tr("Hoje às") : `${rotuloDia(destaque.starts_at, agora)} às`}{" "}
              <span className="font-mono tabular-nums text-white">{hora(destaque.starts_at)}</span>
              <span className="text-slate-500"> · {tipo(destaque.kind)}{destaque.mentor_nome ? ` com ${destaque.mentor_nome}` : ""}</span>
            </p>
            <p className="mt-1 font-display text-2xl font-semibold leading-snug text-white">{destaque.title}</p>
            {subtitulo(destaque.description) && <p className="mt-1 text-slate-400">{subtitulo(destaque.description)}</p>}
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-4">
              <Cronometro inicio={destaque.starts_at} duracaoMin={destaque.duration_min} agoraInicial={agoraMs} />
              <div className="flex flex-col gap-1.5">
                <a href="/matricula" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-ink-900 transition-colors hover:bg-brand-green">
                  {tr("Assine para entrar na live")}
                </a>
                <a href="/conta/agenda" className="text-xs text-slate-400 underline decoration-white/20 underline-offset-4 hover:text-white">
                  {tr("Já é assinante? Entre pela sua agenda")}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Os cartazes da temporada em leque, o da vez na frente. Ao passar o
            mouse o leque abre e mostra o que vem depois. */}
        <a href="#temporada" className="leque relative mx-auto block w-[88%] outline-none sm:w-[82%] lg:mr-[10%]" aria-label={tr("Ver a temporada de lives")}>
          <span className="relative block aspect-[16/10]">
            {leque
              .slice()
              .reverse()
              .map((e) => {
                const i = leque.indexOf(e);
                return (
                  <span key={e.id} className={`cartaz c${i} absolute inset-0 overflow-hidden rounded-2xl border border-white/10 bg-ink-800 shadow-[0_30px_60px_-30px_rgba(0,0,0,.9)]`}>
                    <Cartaz e={e} />
                    {i === 0 && (
                      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-ink-900/95 via-ink-900/50 to-transparent px-5 pb-4 pt-16">
                        <span className="font-mono text-xs uppercase tracking-[0.18em] text-white/85">
                          {rotuloDia(e.starts_at, agora)} · {hora(e.starts_at)} · {tr("na plataforma")}
                        </span>
                      </span>
                    )}
                  </span>
                );
              })}
          </span>
          {eventos.length > 1 && (
            <span className="mt-6 block text-right text-sm text-slate-400">
              {eventos.length} {tr("encontros até")} {mes(eventos[eventos.length - 1].starts_at)} <span aria-hidden>↓</span>
            </span>
          )}
        </a>
      </div>

      {/* A temporada: todos os encontros como cartazes, em ordem. No celular a
          faixa desliza de lado. */}
      {eventos.length > 1 && (
        <div id="temporada" className="mt-16 scroll-mt-28">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-semibold text-white">{tr("A temporada")}</h2>
            <p className="text-sm text-slate-400">{tr("Toda semana às")} {hora(destaque.starts_at)}, {tr("ao vivo para assinantes")}</p>
          </div>
          <ol className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:thin]">
            {eventos.map((e, i) => {
              const novoMes = i === 0 || mes(e.starts_at) !== mes(eventos[i - 1].starts_at);
              return (
                <li key={e.id} className="flex shrink-0 snap-start gap-4">
                  {novoMes && (
                    <span className="flex w-8 shrink-0 items-end justify-center pb-2">
                      <span className="whitespace-nowrap font-mono text-xs uppercase tracking-[0.2em] text-brand-green [writing-mode:vertical-rl] rotate-180">{mes(e.starts_at)}</span>
                    </span>
                  )}
                  <a href={i === 0 ? "#inicio" : "/matricula"} className="group block w-[17rem] sm:w-[19rem]">
                    <span className="block aspect-[16/10] overflow-hidden rounded-xl border border-white/10 bg-ink-800 transition-transform duration-300 group-hover:-translate-y-1">
                      <Cartaz e={e} className="transition-transform duration-500 group-hover:scale-[1.04]" />
                    </span>
                    <span className="mt-3 flex items-baseline gap-2 text-sm">
                      <span className="font-mono text-brand-green">{rotuloDia(e.starts_at, agora)}</span>
                      <span className="font-mono tabular-nums text-slate-400">{hora(e.starts_at)}</span>
                      <span className="text-slate-500">· {tipo(e.kind)}</span>
                    </span>
                    <span className="mt-1 block font-medium leading-snug text-white">{e.title}</span>
                    {e.mentor_nome && <span className="mt-0.5 block text-sm text-slate-400">{tr("com")} {e.mentor_nome}</span>}
                  </a>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
