import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, SectionHeader, Alert } from "@/components/ui/layout";
import { LinkFilter } from "@/components/ui/filter";
import { FERRAMENTAS } from "@/lib/uso";
import { nomesDasFerramentas, CHAVE_DA_VITRINE } from "@/lib/ferramentas-nomes";

export const dynamic = "force-dynamic";

/* Uso da plataforma: o que os alunos abrem de verdade.

   Duas perguntas, lado a lado. Quais ferramentas puxam o aluno de volta, e em
   quais cursos ele passa o tempo. O número principal é "alunos", e não
   "acessos": uma pessoa que abre a mesma ferramenta vinte vezes é uma pessoa
   fiel, não vinte pessoas. Acessos entram como segunda coluna, porque é ela
   que mostra hábito.

   Ferramenta que ninguém abriu também aparece, com zero. Ferramenta ignorada é
   informação, e sumir com ela da lista esconderia exatamente o que interessa.

   Nos cursos entra uma terceira medida que não depende do rastreio novo: aulas
   concluídas no período, que já existiam em lesson_progress. Abrir o curso é
   intenção; concluir aula é uso. */

const PERIODOS = [
  { key: "7", label: "7 dias" },
  { key: "30", label: "30 dias" },
  { key: "90", label: "90 dias" },
];

const FUSO = "America/Sao_Paulo";
const diaChave = (iso: string | number) => new Intl.DateTimeFormat("sv-SE", { timeZone: FUSO }).format(new Date(iso));
const diaCurto = (chave: string) => chave.slice(8, 10) + "/" + chave.slice(5, 7);
const n = (v: number) => v.toLocaleString("pt-BR");

type Evento = { user_id: string; tipo: string; chave: string; created_at: string };
type Linha = { chave: string; nome: string; href?: string; alunos: number; acessos: number; antes: number; extra?: number; extraAlunos?: number };

function agrupa(eventos: Evento[], tipo: string) {
  const mapa = new Map<string, { alunos: Set<string>; acessos: number }>();
  for (const e of eventos) {
    if (e.tipo !== tipo) continue;
    const g = mapa.get(e.chave) ?? { alunos: new Set<string>(), acessos: 0 };
    g.alunos.add(e.user_id);
    g.acessos++;
    mapa.set(e.chave, g);
  }
  return mapa;
}

function Tendencia({ agora, antes }: { agora: number; antes: number }) {
  if (!antes && !agora) return <span className="text-ds-text-3">—</span>;
  if (!antes) return <span className="text-ds-accent">novo</span>;
  const pct = Math.round(((agora - antes) / antes) * 100);
  if (pct === 0) return <span className="text-ds-text-3">0%</span>;
  return <span className={pct > 0 ? "text-ds-accent" : "text-ds-danger"}>{pct > 0 ? "▲" : "▼"} {Math.abs(pct)}%</span>;
}

function Ranking({ titulo, linhas, rotuloExtra, vazio }: { titulo: string; linhas: Linha[]; rotuloExtra?: string; vazio: string }) {
  const maior = Math.max(1, ...linhas.map((l) => l.alunos));
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <SectionHeader title={titulo} />
      <div className="overflow-x-auto rounded-srf border border-ds-line bg-ds-surface">
        <table className="w-full min-w-[520px] text-body-sm">
          <thead>
            <tr className="border-b border-ds-line text-left text-meta uppercase text-ds-text-3">
              <th className="px-4 py-2.5 font-medium">#</th>
              <th className="px-2 py-2.5 font-medium">Nome</th>
              <th className="px-2 py-2.5 text-right font-medium">Alunos</th>
              <th className="px-2 py-2.5 text-right font-medium">Acessos</th>
              {rotuloExtra && <th className="px-2 py-2.5 text-right font-medium">{rotuloExtra}</th>}
              <th className="px-4 py-2.5 text-right font-medium">vs. antes</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={l.chave} className="border-b border-ds-line-soft last:border-0">
                <td className="px-4 py-2.5 font-mono tabular-nums text-ds-text-3">{i + 1}</td>
                <td className="px-2 py-2.5">
                  <div className="flex flex-col gap-1.5">
                    {l.href ? (
                      <Link href={l.href} className="text-ds-text hover:underline">{l.nome}</Link>
                    ) : (
                      <span className="text-ds-text">{l.nome}</span>
                    )}
                    <span className="block h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-ds-line-soft">
                      <span className="block h-full rounded-full bg-ds-accent" style={{ width: `${(l.alunos / maior) * 100}%` }} />
                    </span>
                  </div>
                </td>
                <td className={`px-2 py-2.5 text-right font-mono tabular-nums ${l.alunos ? "text-ds-text" : "text-ds-text-3"}`}>{n(l.alunos)}</td>
                <td className="px-2 py-2.5 text-right font-mono tabular-nums text-ds-text-2">{n(l.acessos)}</td>
                {rotuloExtra && (
                  <td className="px-2 py-2.5 text-right font-mono tabular-nums text-ds-text-2" title={l.extraAlunos != null ? `${l.extraAlunos} alunos concluíram aula` : undefined}>
                    {n(l.extra ?? 0)}
                  </td>
                )}
                <td className="px-4 py-2.5 text-right font-mono text-caption tabular-nums"><Tendencia agora={l.alunos} antes={l.antes} /></td>
              </tr>
            ))}
            {!linhas.length && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-ds-text-3">{vazio}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function UsoAdmin({ searchParams }: { searchParams: { periodo?: string } }) {
  const periodo = PERIODOS.some((p) => p.key === searchParams?.periodo) ? searchParams.periodo! : "30";
  const dias = Number(periodo);
  const agora = Date.now();
  const inicio = new Date(agora - dias * 864e5).toISOString();
  const inicioAntes = new Date(agora - 2 * dias * 864e5).toISOString();

  const admin = createAdminClient();
  const nomes = await nomesDasFerramentas();
  const [evRes, cursosRes, progRes, matRes] = await Promise.all([
    admin.from("access_events").select("user_id, tipo, chave, created_at").gte("created_at", inicioAntes).order("created_at", { ascending: false }).limit(50000),
    admin.from("courses").select("id, slug, title, published"),
    admin.from("lesson_progress").select("user_id, course_id, updated_at").eq("completed", true).gte("updated_at", inicio).limit(50000),
    admin.from("enrollments").select("course_id"),
  ]);

  const semTabela = !!evRes.error;
  const todos = (evRes.data ?? []) as Evento[];
  const atuais = todos.filter((e) => e.created_at >= inicio);
  const anteriores = todos.filter((e) => e.created_at < inicio);

  /* ----------------------------------------------------------- ferramentas */
  const fAgora = agrupa(atuais, "ferramenta");
  const fAntes = agrupa(anteriores, "ferramenta");
  const ferramentas: Linha[] = FERRAMENTAS.map((f) => ({
    chave: f.chave,
    nome: nomes[CHAVE_DA_VITRINE[f.chave] ?? f.chave]?.nome ?? f.nome,
    href: f.prefixos[0],
    alunos: fAgora.get(f.chave)?.alunos.size ?? 0,
    acessos: fAgora.get(f.chave)?.acessos ?? 0,
    antes: fAntes.get(f.chave)?.alunos.size ?? 0,
  })).sort((a, b) => b.alunos - a.alunos || b.acessos - a.acessos || a.nome.localeCompare(b.nome, "pt-BR"));

  /* ---------------------------------------------------------------- cursos */
  const cursos = (cursosRes.data ?? []) as { id: string; slug: string; title: string; published: boolean }[];
  const porSlug = new Map(cursos.map((c) => [c.slug, c]));
  const cAgora = agrupa(atuais, "curso");
  const cAntes = agrupa(anteriores, "curso");
  const aulas = new Map<string, { n: number; alunos: Set<string> }>();
  for (const p of (progRes.data ?? []) as any[]) {
    const g = aulas.get(p.course_id) ?? { n: 0, alunos: new Set<string>() };
    g.n++;
    g.alunos.add(p.user_id);
    aulas.set(p.course_id, g);
  }
  const matriculas = new Map<string, number>();
  for (const m of (matRes.data ?? []) as any[]) matriculas.set(m.course_id, (matriculas.get(m.course_id) || 0) + 1);

  // Entra todo curso publicado, mais qualquer slug que tenha acesso registrado
  // (curso despublicado depois ainda conta a história do período).
  const slugs = new Set<string>([...cursos.filter((c) => c.published).map((c) => c.slug), ...cAgora.keys()]);
  const cursosLinhas: Linha[] = [...slugs].map((slug) => {
    const c = porSlug.get(slug);
    return {
      chave: slug,
      nome: c?.title ?? slug,
      href: c ? `/admin/cursos/${c.id}` : undefined,
      alunos: cAgora.get(slug)?.alunos.size ?? 0,
      acessos: cAgora.get(slug)?.acessos ?? 0,
      antes: cAntes.get(slug)?.alunos.size ?? 0,
      extra: c ? aulas.get(c.id)?.n ?? 0 : 0,
      extraAlunos: c ? aulas.get(c.id)?.alunos.size ?? 0 : 0,
    };
  }).sort((a, b) => b.alunos - a.alunos || (b.extra ?? 0) - (a.extra ?? 0) || a.nome.localeCompare(b.nome, "pt-BR"));

  /* ------------------------------------------------------------ resumo */
  const alunosAtivos = new Set(atuais.map((e) => e.user_id)).size;
  const alunosAntes = new Set(anteriores.map((e) => e.user_id)).size;
  const aulasConcluidas = (progRes.data ?? []).length;
  const campea = ferramentas.find((f) => f.alunos > 0);
  const cursoCampeao = cursosLinhas.find((c) => c.alunos > 0);

  // Série diária para o gráfico: alunos únicos por dia.
  const serie: { dia: string; alunos: number }[] = [];
  const porDia = new Map<string, Set<string>>();
  for (const e of atuais) {
    const k = diaChave(e.created_at);
    const s = porDia.get(k) ?? new Set<string>();
    s.add(e.user_id);
    porDia.set(k, s);
  }
  for (let i = dias - 1; i >= 0; i--) {
    const k = diaChave(agora - i * 864e5);
    serie.push({ dia: k, alunos: porDia.get(k)?.size ?? 0 });
  }
  const pico = Math.max(1, ...serie.map((s) => s.alunos));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        context="Administração"
        title="Uso da plataforma"
        lede="Quais ferramentas e quais cursos os alunos abrem. Cada aluno conta uma vez por ferramenta a cada 30 minutos, então recarregar a página não infla o número."
      />

      {semTabela && (
        <Alert tone="attention" title="O rastreio ainda não foi ligado">
          Rode o arquivo supabase/migrations/20260918_acessos.sql no SQL Editor do Supabase. Os acessos começam a ser
          contados a partir desse momento. Enquanto isso, a coluna de aulas concluídas dos cursos já funciona.
        </Alert>
      )}

      <LinkFilter label="Período" basePath="/admin/uso" param="periodo" options={PERIODOS} active={periodo} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-srf border border-ds-line bg-ds-surface px-4 py-3">
          <span className="block text-meta uppercase tracking-wide text-ds-text-3">Alunos ativos</span>
          <span className="mt-1 block font-mono text-data tabular-nums text-ds-text">{n(alunosAtivos)}</span>
          <span className="mt-0.5 block font-mono text-caption tabular-nums"><Tendencia agora={alunosAtivos} antes={alunosAntes} /> <span className="text-ds-text-3">vs. {dias} dias antes</span></span>
        </div>
        <div className="rounded-srf border border-ds-line bg-ds-surface px-4 py-3">
          <span className="block text-meta uppercase tracking-wide text-ds-text-3">Ferramenta mais usada</span>
          <span className="mt-1 block truncate text-body font-semibold text-ds-text">{campea?.nome ?? "—"}</span>
          <span className="mt-0.5 block text-caption text-ds-text-3">{campea ? `${n(campea.alunos)} alunos · ${n(campea.acessos)} acessos` : "nenhum acesso no período"}</span>
        </div>
        <div className="rounded-srf border border-ds-line bg-ds-surface px-4 py-3">
          <span className="block text-meta uppercase tracking-wide text-ds-text-3">Curso mais visto</span>
          <span className="mt-1 block truncate text-body font-semibold text-ds-text">{cursoCampeao?.nome ?? "—"}</span>
          <span className="mt-0.5 block text-caption text-ds-text-3">{cursoCampeao ? `${n(cursoCampeao.alunos)} alunos · ${n(cursoCampeao.acessos)} acessos` : "nenhum acesso no período"}</span>
        </div>
        <div className="rounded-srf border border-ds-line bg-ds-surface px-4 py-3">
          <span className="block text-meta uppercase tracking-wide text-ds-text-3">Aulas concluídas</span>
          <span className="mt-1 block font-mono text-data tabular-nums text-ds-text">{n(aulasConcluidas)}</span>
          <span className="mt-0.5 block text-caption text-ds-text-3">nos últimos {dias} dias</span>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <SectionHeader title="Alunos por dia" action={<span className="text-meta uppercase text-ds-text-3">pico: {n(pico === 1 && !serie.some((s) => s.alunos) ? 0 : pico)}</span>} />
        <div className="rounded-srf border border-ds-line bg-ds-surface p-4">
          <div className="flex h-28 items-end gap-[2px]">
            {serie.map((s) => (
              <div key={s.dia} className="group relative flex h-full min-w-0 flex-1 items-end" title={`${diaCurto(s.dia)}: ${s.alunos} ${s.alunos === 1 ? "aluno" : "alunos"}`}>
                <div className={`w-full rounded-t-sm ${s.alunos ? "bg-ds-accent/70 group-hover:bg-ds-accent" : "bg-ds-line-soft"}`} style={{ height: s.alunos ? `${Math.max(6, (s.alunos / pico) * 100)}%` : "2px" }} />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between font-mono text-caption tabular-nums text-ds-text-3">
            <span>{diaCurto(serie[0].dia)}</span>
            <span>hoje</span>
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-2">
        <Ranking titulo="Ferramentas" linhas={ferramentas} vazio="Nenhuma ferramenta cadastrada." />
        <Ranking titulo="Cursos" linhas={cursosLinhas} rotuloExtra="Aulas concluídas" vazio="Nenhum curso publicado." />
      </div>

      <p className="text-caption text-ds-text-3">
        {n(matriculas.size)} cursos com matrícula · o rastreio conta quem está logado; visitante e páginas de demonstração ficam de fora.
      </p>
    </div>
  );
}
