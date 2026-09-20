import { tr } from "@/lib/i18n/traduzir-servidor";
import Link from "next/link";
import { tamanhoLegivel, extensao } from "@/lib/materiais";
import ContagemLiberacao from "@/components/ContagemLiberacao";
import { DIAS_CARENCIA } from "@/lib/carencia";

/* Formato de biblioteca: curso feito só de aulas de materiais. Não tem vídeo,
   progresso, avaliação nem certificado, então o player não faz sentido. Cada
   módulo vira uma seção e cada aula um grupo de arquivos para baixar. Os links
   passam pela rota protegida /aprender/[slug]/material/[id]. */

type Arquivo = { id: string; title: string; description: string | null; file_name: string | null; file_size: number | null; external_url: string | null; cover_url: string | null };
type Aula = { id: string; title: string; content: string | null };
type Modulo = { id: string; title: string; locked: boolean; releaseLabel: string | null; lessons: Aula[] };

export default function Biblioteca({
  slug,
  titulo,
  modulos,
  arquivosPorAula,
  liberado = true,
  liberaEm = null,
  agoraInicial,
}: {
  slug: string;
  titulo: string;
  modulos: Modulo[];
  arquivosPorAula: Record<string, Arquivo[]>;
  liberado?: boolean;
  liberaEm?: string | null;
  agoraInicial: number;
}) {
  const dataLiberacao = liberaEm
    ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(liberaEm))
    : null;
  const total = modulos.flatMap((m) => m.lessons).reduce((t, a) => t + (arquivosPorAula[a.id]?.length || 0), 0);

  return (
    <div className="min-h-screen bg-ink-900">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/conta" aria-label={tr("Minha conta")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt={tr("Drive Data Academy")} className="h-8 w-auto" />
            </Link>
            <span className="truncate text-sm font-medium text-slate-300">{titulo}</span>
          </div>
          <Link href="/conta/cursos" className="text-sm text-slate-400 transition-colors hover:text-white">{tr("← Cursos")}</Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <div className="grid items-center gap-8 md:grid-cols-[1fr_20rem]">
          <div>
            <p className="text-sm text-slate-400">{tr("Biblioteca · incluída na assinatura")}</p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">{titulo}</h1>
            <p className="mt-3 max-w-xl text-slate-400">
              {liberado
                ? tr("Arquivos prontos para baixar, abrir no seu computador e adaptar ao seu projeto.")
                : tr("Dê uma olhada em tudo que tem aqui. O download abre quando a contagem terminar.")}
              <span className="font-mono tabular-nums text-slate-300">{total}</span> {total === 1 ? tr("arquivo disponível") : tr("arquivos disponíveis")}.
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/banners/cases-reais-prontos.png" alt={tr("Cases reais prontos, disponíveis para download")} className="hidden aspect-video w-full rounded-2xl border border-white/10 object-cover md:block" />
        </div>

        {/* Enquanto a carência corre, a pessoa navega pela biblioteca inteira e
            vê exatamente quando o download abre. */}
        {!liberado && liberaEm && (
          <div className="mt-10 rounded-2xl border border-amber-300/25 bg-amber-300/[0.06] p-6">
            <p className="text-sm font-semibold text-amber-200">{tr("Seus downloads abrem em")}</p>
            <div className="mt-3">
              <ContagemLiberacao liberaEm={liberaEm} agoraInicial={agoraInicial} />
            </div>
            <p className="mt-4 max-w-2xl text-sm text-slate-300/90">
              {tr("O download dos arquivos libera")} {DIAS_CARENCIA} dias depois da assinatura, em {dataLiberacao}{tr(". Até lá você navega pela biblioteca inteira e vê a prévia de cada material, para já escolher por onde começar.")}
            </p>
          </div>
        )}

        <div className="mt-12 flex flex-col gap-12">
          {modulos.map((m) => (
            <section key={m.id} aria-labelledby={`mod-${m.id}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-white/10 pb-3">
                <h2 id={`mod-${m.id}`} className="font-display text-xl font-semibold text-white">{m.title}</h2>
                {m.locked && <span className="text-sm text-amber-300/90">{tr("Libera em")} {m.releaseLabel}</span>}
              </div>

              {m.locked ? (
                <p className="py-6 text-sm text-slate-500">{tr("Os arquivos deste módulo aparecem na data de liberação.")}</p>
              ) : (
                m.lessons.map((a) => {
                  const arquivos = arquivosPorAula[a.id] ?? [];
                  return (
                    <div key={a.id} className="border-b border-white/5 py-6 last:border-b-0">
                      <h3 className="font-semibold text-white">{a.title}</h3>
                      {a.content && <p className="mt-1 max-w-2xl whitespace-pre-line text-sm text-slate-400">{a.content}</p>}

                      {arquivos.length === 0 ? (
                        <p className="mt-3 text-sm text-slate-500">{tr("Os arquivos desta seção estão sendo preparados.")}</p>
                      ) : (
                        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {arquivos.map((f) => {
                            const ext = f.file_name ? extensao(f.file_name) : "LINK";
                            const Cartao = liberado ? "a" : "div";
                            return (
                              <li key={f.id}>
                                <Cartao
                                  {...(liberado
                                    ? { href: `/aprender/${slug}/material/${f.id}`, target: f.file_name ? undefined : "_blank", rel: "noreferrer" }
                                    : { "aria-disabled": true })}
                                  className={`group flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] ${
                                    liberado ? "transition-colors hover:border-brand-green/40 hover:bg-white/[0.04]" : ""
                                  }`}
                                >
                                  {/* A prévia mostra o relatório pronto: é o que faz a pessoa
                                      escolher um arquivo entre vários. Sem prévia, a extensão. */}
                                  {f.cover_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={f.cover_url} alt={`Prévia de ${f.title}`} className="aspect-[16/9] w-full border-b border-white/10 object-cover" />
                                  ) : (
                                    <span className="grid aspect-[16/9] w-full place-items-center border-b border-white/10 bg-ink-800 font-mono text-sm font-bold text-brand-green">{ext || "ARQ"}</span>
                                  )}
                                  <span className="flex min-w-0 flex-1 flex-col p-4">
                                    <span className="block font-medium text-white">{f.title}</span>
                                    {f.description && <span className="mt-1 block text-sm text-slate-400">{f.description}</span>}
                                    <span className="mt-3 flex items-center gap-3 pt-1 text-xs text-slate-500">
                                      <span className="font-mono text-brand-green/80">{ext}</span>
                                      {f.file_size ? <span className="font-mono tabular-nums">{tamanhoLegivel(f.file_size)}</span> : null}
                                      {liberado ? (
                                        <span className="ml-auto font-semibold text-brand-green group-hover:underline">{f.file_name ? "Baixar" : "Abrir link"}</span>
                                      ) : (
                                        <span className="ml-auto inline-flex items-center gap-2 text-amber-300/90">
                                          <span className="font-semibold">{tr("Libera em")}</span>
                                          {liberaEm && <ContagemLiberacao liberaEm={liberaEm} agoraInicial={agoraInicial} compacto />}
                                        </span>
                                      )}
                                    </span>
                                  </span>
                                </Cartao>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })
              )}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
