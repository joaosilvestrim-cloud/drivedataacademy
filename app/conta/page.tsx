import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasFullAccess } from "@/lib/access";
import { knowledgeSummary } from "@/lib/knowledge/summary";
import { COMMUNITY_WHATSAPP_URL } from "@/lib/links";
import { Button, Badge } from "@/components/ui/primitives";
import { SectionHeader, EmptyState } from "@/components/ui/layout";
import { DataRule, EvidenceBar, FreshnessRing } from "@/components/ui/signature";
import WorkshopPoll from "./WorkshopPoll";
import { WORKSHOP_OPTIONS } from "./workshop";

export const dynamic = "force-dynamic";

const TZ = "America/Sao_Paulo";
const hoje = (iso: string) => {
  const d = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: TZ }).format(new Date(iso));
  // Só a primeira letra. A classe capitalize do Tailwind deixava
  // "Quinta-Feira, 11 De Setembro".
  return d.charAt(0).toUpperCase() + d.slice(1);
};
const quando = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(iso));
const emQuanto = (iso: string) => {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "agora";
  const d = Math.floor(diff / 864e5);
  if (d >= 1) return `em ${d}d`;
  const h = Math.floor(diff / 36e5);
  return h >= 1 ? `em ${h}h` : `em ${Math.max(1, Math.floor(diff / 6e4))}min`;
};

// Capa em faixa estreita. A imagem é conteúdo real do curso, então continua,
// mas para de ocupar meia tela em grade de cards.
function Thumb({ url, title }: { url: string | null; title: string }) {
  return (
    <span className="relative hidden h-14 w-24 shrink-0 overflow-hidden rounded-ctl border border-ds-line tablet:block">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center bg-ds-raised font-display text-section text-ds-text-3">
          {title.charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}

export default async function ContaHome() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();

  const [{ data: profile }, { data: enrolls }, full, { count: certCount }] = await Promise.all([
    admin.from("profiles").select("full_name").eq("id", user!.id).maybeSingle(),
    admin.from("enrollments").select("course_id").eq("user_id", user!.id),
    hasFullAccess(admin, user!.id),
    admin.from("certificates").select("*", { count: "exact", head: true }).eq("user_id", user!.id),
  ]);

  const { data: livesData } = await admin
    .from("live_events")
    .select("id, title, starts_at, kind")
    .eq("published", true)
    .gte("starts_at", new Date(Date.now() - 2 * 3600e3).toISOString())
    .order("starts_at")
    .limit(3);
  const upcoming = livesData ?? [];

  const [{ data: votesData }, { data: myVoteRow }, { data: catalogData }] = await Promise.all([
    admin.from("workshop_votes").select("option"),
    admin.from("workshop_votes").select("option").eq("user_id", user!.id).maybeSingle(),
    admin.from("courses").select("id, slug, title, subtitle, cover_url").eq("published", true).order("position"),
  ]);
  const voteCounts: Record<string, number> = {};
  for (const v of votesData ?? []) voteCounts[v.option] = (voteCounts[v.option] || 0) + 1;
  const myVote = myVoteRow?.option ?? null;

  const courseIds = (enrolls ?? []).map((e: any) => e.course_id);
  let courses: any[] = [];
  const lessonTotals: Record<string, number> = {};
  const doneCounts: Record<string, number> = {};

  if (courseIds.length) {
    const [{ data: cs }, { data: ls }, { data: pr }] = await Promise.all([
      admin.from("courses").select("id, slug, title, subtitle, cover_url").in("id", courseIds),
      admin.from("lessons").select("course_id").in("course_id", courseIds),
      admin.from("lesson_progress").select("course_id").eq("user_id", user!.id).eq("completed", true).in("course_id", courseIds),
    ]);
    courses = cs ?? [];
    for (const l of ls ?? []) lessonTotals[l.course_id] = (lessonTotals[l.course_id] || 0) + 1;
    for (const p of pr ?? []) doneCounts[p.course_id] = (doneCounts[p.course_id] || 0) + 1;
  }

  // Estado do Knowledge Universe: competências, composição da evidência e o
  // que anda esfriando. Lê o snapshot, não recalcula o universo inteiro.
  const resumo = await knowledgeSummary(user!.id, user!.email);

  // Sinais do percurso prático. Consultas rasas, com contagem apenas.
  const [{ data: diag }, { data: entregas }, { count: desafiosAbertos }] = await Promise.all([
    admin.from("ku_diagnostic_attempts").select("user_id").eq("user_id", user!.id).maybeSingle(),
    admin.from("ku_challenge_submissions").select("status, reviewed_at").eq("user_id", user!.id),
    admin.from("ku_challenges").select("*", { count: "exact", head: true }).eq("published", true),
  ]);
  const aprovadas = (entregas ?? []).filter((e: any) => e.status === "approved");
  const emCorrecao = (entregas ?? []).filter((e: any) => e.status === "pending").length;

  const fullName = profile?.full_name || "";
  const firstName = fullName.split(" ")[0];
  const withPct = courses.map((c) => {
    const total = lessonTotals[c.id] || 0;
    const done = doneCounts[c.id] || 0;
    return { ...c, total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  });
  const concluidos = withPct.filter((c) => c.total > 0 && c.pct === 100).length;
  const emAndamento = withPct.filter((c) => c.pct > 0 && c.pct < 100);
  const retomar = emAndamento[0] || withPct.find((c) => c.pct === 0) || null;
  const enrolledSet = new Set(courseIds);
  const catalogo = (catalogData ?? []).filter((c: any) => !enrolledSet.has(c.id));

  // ------------------------------------------------------------------
  // Próximo passo. Uma ação principal, decidida pelo estado real do aluno.
  // É o que responde "o que eu preciso fazer" em menos de cinco segundos.
  // ------------------------------------------------------------------
  const passo = !full
    ? { rotulo: "Liberar meu acesso", titulo: "Sua assinatura não está ativa", apoio: "Assine para abrir os treinamentos, a comunidade e as ferramentas.", href: "/matricula", curso: null as any }
    : resumo.available && !diag
    ? { rotulo: "Começar o diagnóstico", titulo: "Dê o ponto de partida do seu mapa", apoio: "São 25 perguntas rápidas. Você responde uma vez só.", href: "/conta/diagnostico", curso: null as any }
    : retomar
    ? { rotulo: retomar.pct > 0 ? "Continuar" : "Começar", titulo: retomar.title, apoio: `${retomar.done} de ${retomar.total} aulas concluídas.`, href: `/aprender/${retomar.slug}`, curso: retomar }
    : resumo.cooling.length
    ? { rotulo: "Ver desafios", titulo: `Revisar ${resumo.cooling[0].name}`, apoio: `São ${resumo.cooling[0].days} dias sem atividade nessa competência.`, href: "/conta/desafios", curso: null as any }
    : desafiosAbertos
    ? { rotulo: "Ver desafios", titulo: "Prove na prática o que você aprendeu", apoio: `${desafiosAbertos} desafios abertos esperando sua entrega.`, href: "/conta/desafios", curso: null as any }
    : { rotulo: "Abrir o catálogo", titulo: "Escolha por onde começar", apoio: "Seus treinamentos aparecem aqui assim que você iniciar um.", href: "/cursos", curso: null as any };

  // Uma frase que diz como o aluno está, em vez de só empilhar números.
  const leitura = !full
    ? "Seu acesso está inativo no momento."
    : resumo.developed > 0
    ? `${resumo.developed} ${resumo.developed === 1 ? "competência tem" : "competências têm"} evidência registrada${resumo.advanced ? `, ${resumo.advanced} em nível avançado` : ""}.${resumo.cooling.length ? ` ${resumo.cooling.length} ${resumo.cooling.length === 1 ? "está esfriando" : "estão esfriando"}.` : ""}`
    : courses.length
    ? "Suas primeiras evidências aparecem conforme você avança nas aulas."
    : "Tudo pronto para começar.";

  const temEvidencia = Object.values(resumo.parts).some((v) => v > 0);

  return (
    <div className="flex flex-col gap-12 pb-4 tablet:gap-14">

      {/* ─── Leitura. Nível 1 e 2, sem card. ─────────────────────────── */}
      <header>
        <p className="font-mono text-meta uppercase text-ds-text-3">
          {hoje(new Date().toISOString())}
          {full && <> · <span className="text-ds-accent">assinatura ativa</span></>}
        </p>
        <h1 className="mt-3 text-balance font-display text-display font-semibold text-ds-text">
          Olá{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-2 max-w-xl text-body text-ds-text-2">{leitura}</p>
      </header>

      {/* ─── Próximo passo. A única ação principal da tela. ───────────── */}
      <section aria-labelledby="passo" className="border-l-2 border-ds-accent pl-5 tablet:pl-6">
        <p id="passo" className="font-mono text-meta uppercase text-ds-text-3">Próximo passo</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="min-w-0 max-w-lg">
            <h2 className="text-balance font-display text-section font-semibold text-ds-text">{passo.titulo}</h2>
            <p className="mt-1 text-body-sm text-ds-text-2">{passo.apoio}</p>
            {passo.curso && (
              <div className="mt-3 flex items-center gap-3">
                <span className="h-0.5 w-full max-w-[14rem] bg-ds-line" aria-hidden="true">
                  <span className="block h-0.5 bg-ds-accent" style={{ width: `${Math.max(2, passo.curso.pct)}%` }} />
                </span>
                <span className="font-mono text-meta tabular-nums text-ds-text-3">{passo.curso.pct}%</span>
              </div>
            )}
          </div>
          <Button href={passo.href} size="lg" className="w-full tablet:w-auto">{passo.rotulo}</Button>
        </div>
      </section>

      {/* ─── Régua de Dados. Substitui os quatro KPI cards. ───────────── */}
      <DataRule
        items={[
          { label: "Treinamentos", value: courses.length },
          { label: "Em andamento", value: emAndamento.length },
          { label: "Concluídos", value: concluidos },
          { label: "Certificados", value: certCount ?? 0 },
          { label: "Competências", value: resumo.developed, hint: resumo.advanced ? `${resumo.advanced} avançadas` : undefined },
        ]}
      />

      {/* ─── Barra de Evidência. Dado que o motor já calculava. ───────── */}
      {temEvidencia && (
        <section aria-labelledby="evidencia">
          <SectionHeader
            title="De onde vem o seu conhecimento"
            meta={resumo.best ? `melhor competência ${resumo.best}/100` : undefined}
          />
          <p className="mt-3 max-w-xl text-body-sm text-ds-text-2">
            Cada competência soma cinco tipos de evidência. Esta é a sua composição mais forte hoje.
          </p>
          <EvidenceBar parts={resumo.parts} className="mt-4 max-w-2xl" />
        </section>
      )}

      {/* ─── Halo de Frescor. Só aparece quando há decaimento real. ───── */}
      {resumo.cooling.length > 0 && (
        <section aria-labelledby="frescor">
          <SectionHeader
            title="Hora de revisar"
            meta="frescor em queda"
            action={<Link href="/conta/desafios" className="text-label text-ds-accent hover:underline">Ver desafios</Link>}
          />
          <p className="mt-3 max-w-xl text-body-sm text-ds-text-2">
            O conhecimento continua seu. O que caiu foi o frescor, por falta de prática recente.
          </p>
          <div className="mt-5 grid gap-6 tablet:grid-cols-2 lg:grid-cols-4">
            {resumo.cooling.map((c) => (
              <FreshnessRing key={c.id} value={c.freshness} name={c.name} days={c.days} />
            ))}
          </div>
        </section>
      )}

      {/* ─── Percurso prático. Só renderiza com fato real. ────────────── */}
      {(aprovadas.length > 0 || emCorrecao > 0) && (
        <section aria-labelledby="pratica">
          <SectionHeader title="Sua prática" meta={`${aprovadas.length} ${aprovadas.length === 1 ? "aprovada" : "aprovadas"}`} />
          <ul className="mt-4 flex flex-col">
            {emCorrecao > 0 && (
              <li className="flex items-baseline justify-between gap-4 border-b border-ds-line-soft py-2.5">
                <span className="text-body-sm text-ds-text-2">
                  {emCorrecao} {emCorrecao === 1 ? "entrega aguardando correção" : "entregas aguardando correção"}
                </span>
                <Badge tone="attention">em correção</Badge>
              </li>
            )}
            {aprovadas.slice(0, 3).map((e: any, i: number) => (
              <li key={i} className="flex items-baseline justify-between gap-4 border-b border-ds-line-soft py-2.5">
                <span className="text-body-sm text-ds-text-2">Desafio aprovado, evidência registrada no seu universo</span>
                <span className="shrink-0 font-mono text-meta uppercase text-ds-text-3">
                  {e.reviewed_at ? quando(e.reviewed_at) : "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ─── Em curso. Lista editorial, não grade de cards. ───────────── */}
      <section aria-labelledby="cursos">
        <SectionHeader
          title="Em curso"
          meta={courses.length ? `${courses.length} ${courses.length === 1 ? "treinamento" : "treinamentos"}` : undefined}
          action={<Link href="/cursos" className="text-label text-ds-text-2 hover:text-ds-text">Catálogo</Link>}
        />
        {withPct.length === 0 ? (
          <EmptyState
            title={full ? "Nenhum treinamento iniciado ainda" : "Você ainda não tem acesso"}
            description={
              full
                ? "Seu acesso está ativo. Escolha um treinamento no catálogo e ele aparece aqui."
                : "Assine a Academy para liberar todos os treinamentos, a comunidade e as ferramentas."
            }
            action={<Button href={full ? "/cursos" : "/matricula"} variant={full ? "secondary" : "primary"}>{full ? "Abrir catálogo" : "Ver assinatura"}</Button>}
          />
        ) : (
          <ul className="mt-2 flex flex-col">
            {withPct.map((c) => {
              const completo = c.total > 0 && c.pct === 100;
              return (
                <li key={c.id}>
                  <Link
                    href={`/aprender/${c.slug}`}
                    className="group flex items-center gap-4 border-b border-ds-line-soft py-4 transition-colors duration-fast ease-ds hover:bg-ds-raised/50"
                  >
                    <Thumb url={c.cover_url} title={c.title} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="truncate font-display text-component font-medium text-ds-text transition-colors duration-fast group-hover:text-ds-accent">
                          {c.title}
                        </span>
                        {completo && <Badge tone="accent">concluído</Badge>}
                      </span>
                      <span className="mt-2 flex items-center gap-3">
                        <span className="h-0.5 w-full max-w-[16rem] bg-ds-line" aria-hidden="true">
                          <span
                            className={`block h-0.5 ${completo ? "bg-ds-accent" : "bg-ds-text-3"}`}
                            style={{ width: `${Math.max(2, c.pct)}%` }}
                          />
                        </span>
                        <span className="shrink-0 font-mono text-meta tabular-nums text-ds-text-3">
                          {c.done}/{c.total}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-data tabular-nums text-ds-text-2">{c.pct}<span className="text-meta text-ds-text-3">%</span></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ─── Agenda. Datas em mono, sem card. ─────────────────────────── */}
      {upcoming.length > 0 && (full || courses.length > 0) && (
        <section aria-labelledby="agenda">
          <SectionHeader
            title="Próximos ao vivo"
            action={<Link href="/conta/agenda" className="text-label text-ds-text-2 hover:text-ds-text">Agenda</Link>}
          />
          <ul className="mt-2 flex flex-col">
            {upcoming.map((l: any) => (
              <li key={l.id}>
                <Link
                  href="/conta/agenda"
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-ds-line-soft py-3 transition-colors duration-fast ease-ds hover:bg-ds-raised/50"
                >
                  <span className="flex min-w-0 items-baseline gap-3">
                    <span className="shrink-0 font-mono text-meta uppercase text-ds-text-3">{quando(l.starts_at)}</span>
                    <span className="truncate text-body-sm text-ds-text">{l.title}</span>
                  </span>
                  <span className="flex shrink-0 items-baseline gap-3">
                    <span className="text-caption text-ds-text-3">{l.kind === "mentoria" ? "Mentoria" : "Live"}</span>
                    <span className="font-mono text-meta text-ds-accent">{emQuanto(l.starts_at)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ─── Enquete. Função preservada, linguagem nova. ──────────────── */}
      <section aria-labelledby="enquete">
        <WorkshopPoll options={WORKSHOP_OPTIONS} counts={voteCounts} myVote={myVote} />
      </section>

      {/* ─── Catálogo. Secundário de propósito. ───────────────────────── */}
      {catalogo.length > 0 && (
        <section aria-labelledby="catalogo">
          <SectionHeader
            title={full ? "Também disponível" : "Em breve no catálogo"}
            meta={`${catalogo.length} ${catalogo.length === 1 ? "treinamento" : "treinamentos"}`}
          />
          <ul className="mt-2 flex flex-col">
            {catalogo.slice(0, 6).map((c: any) => (
              <li key={c.id}>
                <Link
                  href={full ? `/aprender/${c.slug}` : "/cursos"}
                  className="group flex items-baseline justify-between gap-4 border-b border-ds-line-soft py-3 transition-colors duration-fast ease-ds hover:bg-ds-raised/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-body-sm text-ds-text transition-colors duration-fast group-hover:text-ds-accent">
                      {c.title}
                    </span>
                    {c.subtitle && <span className="block truncate text-caption text-ds-text-3">{c.subtitle}</span>}
                  </span>
                  <span className="shrink-0 font-mono text-meta uppercase text-ds-text-3">
                    {full ? "acessar" : "em breve"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ─── Rodapé útil. Era um banner verde; virou uma linha. ───────── */}
      {COMMUNITY_WHATSAPP_URL && (
        <p className="border-t border-ds-line pt-5 text-body-sm text-ds-text-3">
          Avisos das lives e novidades saem primeiro no{" "}
          <a
            href={COMMUNITY_WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="text-ds-text-2 underline decoration-ds-line underline-offset-4 transition-colors duration-fast ease-ds hover:text-ds-accent hover:decoration-ds-accent"
          >
            grupo do WhatsApp
          </a>
          .
        </p>
      )}
    </div>
  );
}
