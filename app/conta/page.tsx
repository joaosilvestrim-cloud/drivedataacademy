import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasFullAccess } from "@/lib/access";
import { knowledgeSummary } from "@/lib/knowledge/summary";
import { COMMUNITY_WHATSAPP_URL } from "@/lib/links";
import { Button, Badge, Status, ICON } from "@/components/ui/primitives";
import { SectionHeader, EmptyState } from "@/components/ui/layout";
import { DataRule, EvidenceBar, FreshnessRing } from "@/components/ui/signature";
import ProximasMentorias from "@/components/mentorias/ProximasMentorias";
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
  if (d >= 1) return `em ${d} dia${d > 1 ? "s" : ""}`;
  const h = Math.floor(diff / 36e5);
  return h >= 1 ? `em ${h}h` : "em minutos";
};

function Thumb({ url, title }: { url: string | null; title: string }) {
  return (
    <span className="relative hidden h-14 w-24 shrink-0 overflow-hidden rounded-ctl border border-ds-line tablet:block">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center bg-ds-raised font-display text-section text-ds-text-3">
          {title.charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}

// Ícone com função: sinaliza que a linha leva a algum lugar. Aparece no hover
// e no foco de teclado, então não vira ruído em lista longa.
function RowArrow() {
  return (
    <ChevronRight
      size={ICON.md}
      strokeWidth={ICON.stroke}
      aria-hidden="true"
      className="shrink-0 text-ds-text-3 opacity-0 transition-opacity duration-fast ease-ds group-hover:opacity-100 group-focus-visible:opacity-100"
    />
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
  const upcoming = (livesData ?? []).filter((l: any) => l.kind !== "mentoria");

  const [{ data: votesData }, { data: myVoteRow }, { data: catalogData }] = await Promise.all([
    admin.from("workshop_votes").select("option"),
    admin.from("workshop_votes").select("option").eq("user_id", user!.id).maybeSingle(),
    admin.from("courses").select("id, slug, title, subtitle, cover_url, coming_soon").eq("published", true).order("position"),
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

  // knowledgeSummary nunca lança: em erro, sem catálogo ou sem acesso devolve
  // vazio, e as seções que dependem dele simplesmente não renderizam.
  const resumo = await knowledgeSummary(user!.id, user!.email);

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

  // Uma ação principal, decidida em cascata pelo estado real do aluno.
  const passo = !full
    ? { rotulo: "Ver a assinatura", titulo: "Seu acesso está inativo", apoio: "Assine para abrir os treinamentos, a comunidade e as ferramentas.", href: "/matricula", curso: null as any }
    : resumo.available && !diag
    ? { rotulo: "Fazer o diagnóstico", titulo: "Comece pelo diagnóstico", apoio: "São 25 perguntas rápidas e você responde uma vez só.", href: "/conta/diagnostico", curso: null as any }
    : retomar
    ? { rotulo: retomar.pct > 0 ? "Continuar" : "Começar", titulo: retomar.title, apoio: `${retomar.done} de ${retomar.total} aulas concluídas.`, href: `/aprender/${retomar.slug}`, curso: retomar }
    : resumo.cooling.length
    ? { rotulo: "Ver desafios", titulo: `Revisar ${resumo.cooling[0].name}`, apoio: `${resumo.cooling[0].days} dias sem prática nessa competência.`, href: "/conta/desafios", curso: null as any }
    : desafiosAbertos
    ? { rotulo: "Ver desafios", titulo: "Prove na prática o que aprendeu", apoio: `${desafiosAbertos} desafios abertos esperando entrega.`, href: "/conta/desafios", curso: null as any }
    : { rotulo: "Abrir o catálogo", titulo: "Escolha por onde começar", apoio: "Seus treinamentos aparecem aqui assim que você iniciar um.", href: "/cursos", curso: null as any };

  const leitura = !full
    ? "Sua assinatura não está ativa no momento."
    : resumo.developed > 0
    ? `Você tem evidência em ${resumo.developed} ${resumo.developed === 1 ? "competência" : "competências"}${resumo.advanced ? `, ${resumo.advanced} no nível avançado` : ""}.${resumo.cooling.length ? ` ${resumo.cooling.length === 1 ? "Uma anda esfriando" : `${resumo.cooling.length} andam esfriando`}.` : ""}`
    : courses.length
    ? "Suas primeiras evidências aparecem conforme você avança nas aulas."
    : "Tudo pronto para começar.";

  return (
    <div className="flex flex-col gap-12 pb-4 tablet:gap-14">

      {/* ── 1 · Contexto. Discreto de propósito. ─────────────────────── */}
      <header>
        <p className="text-meta uppercase text-ds-text-3">
          {hoje(new Date().toISOString())}
          {full && <> · <span className="text-ds-accent">assinatura ativa</span></>}
        </p>
        <h1 className="mt-2.5 text-balance font-display text-title font-semibold text-ds-text">
          Olá{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-1.5 max-w-xl text-body text-ds-text-2">{leitura}</p>
      </header>

      {/* ── 2 · Próximo passo. O elemento mais forte da página. ──────── */}
      <section aria-labelledby="passo" className="border-l-2 border-ds-accent pl-5 tablet:pl-6">
        <p id="passo" className="text-meta uppercase text-ds-text-3">Próximo passo</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div className="min-w-0 max-w-lg">
            <h2 className="text-balance font-display text-section font-semibold text-ds-text">{passo.titulo}</h2>
            <p className="mt-1 text-body-sm text-ds-text-2">{passo.apoio}</p>
            {passo.curso && (
              <div className="mt-3 flex items-center gap-3">
                <span className="h-0.5 w-full max-w-[14rem] bg-ds-line" aria-hidden="true">
                  <span className="block h-0.5 bg-ds-accent" style={{ width: `${Math.max(2, passo.curso.pct)}%` }} />
                </span>
                {/* Percentual é medição: mono. */}
                <span className="font-mono text-meta tabular-nums text-ds-text-3">{passo.curso.pct}%</span>
              </div>
            )}
          </div>
          <Button href={passo.href} size="lg" className="w-full tablet:w-auto">
            {passo.rotulo}
            <ArrowRight size={ICON.md} strokeWidth={ICON.stroke} aria-hidden="true" />
          </Button>
        </div>
      </section>

      {/* ── 3 · Estado atual. ───────────────────────────────────────── */}
      <DataRule
        items={[
          { label: "Treinamentos", value: courses.length },
          { label: "Em andamento", value: emAndamento.length },
          { label: "Concluídos", value: concluidos },
          { label: "Certificados", value: certCount ?? 0 },
          { label: "Competências", value: resumo.developed, hint: resumo.advanced ? `${resumo.advanced} no avançado` : undefined },
        ]}
      />

      {/* ── 4 · Evolução. A composição pertence a UMA competência. ───── */}
      {resumo.top && (
        <section aria-labelledby="evidencia">
          <SectionHeader
            title={`Competência mais forte: ${resumo.top.name}`}
            meta={<span className="font-mono tabular-nums">{resumo.top.score}/100</span>}
          />
          <p className="mt-3 max-w-xl text-body-sm text-ds-text-2">
            Estes são os pontos de <span className="text-ds-text">{resumo.top.name}</span> e de onde cada um veio.
            Cada competência tem a sua própria composição.
          </p>
          <EvidenceBar parts={resumo.top.parts} className="mt-4 max-w-2xl" />
          <Link
            href="/conta/universo"
            className="group mt-4 inline-flex items-center gap-1.5 text-label text-ds-text-2 transition-colors duration-fast ease-ds hover:text-ds-accent"
          >
            Ver todas as competências
            <ChevronRight size={ICON.sm} strokeWidth={ICON.stroke} aria-hidden="true" className="transition-transform duration-fast ease-ds group-hover:translate-x-0.5" />
          </Link>
        </section>
      )}

      {resumo.cooling.length > 0 && (
        <section aria-labelledby="frescor">
          <SectionHeader
            title="Hora de revisar"
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

      {(aprovadas.length > 0 || emCorrecao > 0) && (
        <section aria-labelledby="pratica">
          <SectionHeader title="Sua prática" />
          <ul className="mt-3 flex flex-col">
            {emCorrecao > 0 && (
              <li className="flex items-baseline justify-between gap-4 border-b border-ds-line-soft py-2.5">
                <span className="text-body-sm text-ds-text-2">
                  {emCorrecao === 1 ? "Uma entrega aguardando correção" : `${emCorrecao} entregas aguardando correção`}
                </span>
                <Badge tone="attention">em correção</Badge>
              </li>
            )}
            {aprovadas.slice(0, 3).map((e: any, i: number) => (
              <li key={i} className="flex items-baseline justify-between gap-4 border-b border-ds-line-soft py-2.5">
                <span className="text-body-sm text-ds-text-2">Desafio aprovado, evidência registrada</span>
                {/* Carimbo de quando a evidência entrou: medição, vai em mono. */}
                <span className="shrink-0 font-mono text-meta tabular-nums text-ds-text-3">
                  {e.reviewed_at ? quando(e.reviewed_at) : "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── 5 · Conteúdo e secundários. ─────────────────────────────── */}
      <section aria-labelledby="cursos">
        <SectionHeader
          title="Em curso"
          action={<Link href="/cursos" className="text-label text-ds-text-2 hover:text-ds-text">Catálogo</Link>}
        />
        {withPct.length === 0 ? (
          <EmptyState
            title={full ? "Nenhum treinamento iniciado" : "Você ainda não tem acesso"}
            description={
              full
                ? "Escolha um treinamento no catálogo e ele passa a aparecer aqui."
                : "Assine a Academy para liberar os treinamentos, a comunidade e as ferramentas."
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
                        {/* Contagem de aulas é utilitária: Plex Sans. */}
                        <span className="shrink-0 text-caption text-ds-text-3">{c.done} de {c.total} aulas</span>
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-data tabular-nums text-ds-text-2">
                      {c.pct}<span className="text-meta text-ds-text-3">%</span>
                    </span>
                    <RowArrow />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ProximasMentorias className="" />

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
                  className="group flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-ds-line-soft py-3 transition-colors duration-fast ease-ds hover:bg-ds-raised/50"
                >
                  <span className="flex min-w-0 items-baseline gap-3">
                    {/* Horário de agenda é navegação, não medição: Plex Sans. */}
                    <span className="shrink-0 text-caption tabular-nums text-ds-text-3">{quando(l.starts_at)}</span>
                    <span className="truncate text-body-sm text-ds-text">{l.title}</span>
                    {l.kind === "mentoria" && <Badge>mentoria</Badge>}
                  </span>
                  <span className="flex shrink-0 items-baseline gap-3">
                    <span className="text-caption text-ds-accent">{emQuanto(l.starts_at)}</span>
                    <RowArrow />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="enquete">
        <WorkshopPoll options={WORKSHOP_OPTIONS} counts={voteCounts} myVote={myVote} />
      </section>

      {catalogo.length > 0 && (
        <section aria-labelledby="catalogo">
          <SectionHeader title={full ? "Também disponível" : "Em breve no catálogo"} />
          <ul className="mt-2 flex flex-col">
            {catalogo.slice(0, 6).map((c: any) => (
              <li key={c.id}>
                <Link
                  href={c.coming_soon || !full ? `/cursos/${c.slug}` : `/aprender/${c.slug}`}
                  className="group flex items-center justify-between gap-4 border-b border-ds-line-soft py-3 transition-colors duration-fast ease-ds hover:bg-ds-raised/50"
                >
                  <span className="min-w-0">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-body-sm text-ds-text transition-colors duration-fast group-hover:text-ds-accent">
                        {c.title}
                      </span>
                      {c.coming_soon && <Status tone="attention">Em breve</Status>}
                    </span>
                    {c.subtitle && <span className="block truncate text-caption text-ds-text-3">{c.subtitle}</span>}
                  </span>
                  <RowArrow />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {COMMUNITY_WHATSAPP_URL && (
        <p className="border-t border-ds-line pt-5 text-body-sm text-ds-text-3">
          Avisos das lives saem primeiro no{" "}
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
