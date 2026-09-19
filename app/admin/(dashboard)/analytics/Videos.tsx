import Link from "next/link";
import { Alert, SectionHeader } from "@/components/ui/layout";
import { createAdminClient } from "@/lib/supabase/admin";
import { idsDaEquipe } from "@/lib/community";
import { Curva, Kpi, Tabela, horas, n } from "./ui";

/* Vídeos: quantos assistem, quanto assistem e onde param.

   "Assistiu" vem de dois lugares. A conclusão da aula (lesson_progress) existe
   desde o começo. O tempo assistido e a curva de retenção (video_progress)
   começaram agora: o player do Panda manda, a cada 20 segundos, quais trechos
   de 5% do vídeo passaram na tela.

   Retenção da aula = em cada trecho, quantos % dos alunos que deram play
   chegaram a ver aquele trecho. O "ponto de queda" é o primeiro trecho em que
   menos da metade continua: é ali que vale olhar o vídeo. */

type Aula = { id: string; title: string; course_id: string; module_id: string | null; position: number | null; type: string | null };

export default async function Videos({ dias, cursoSel }: { dias: number; cursoSel?: string }) {
  const admin = createAdminClient();
  const inicio = new Date(Date.now() - dias * 864e5).toISOString();
  const [{ data: cursos }, { data: aulasRaw }, { data: modulos }, vpRes, { data: concl }, { data: mats }, equipe] = await Promise.all([
    admin.from("courses").select("id, title, slug, published").order("position"),
    admin.from("lessons").select("id, title, course_id, module_id, position, type"),
    admin.from("course_modules").select("id, position"),
    admin.from("video_progress").select("user_id, lesson_id, course_id, duration_s, watched_s, max_pos_s, buckets, updated_at").gte("updated_at", inicio).limit(100000),
    admin.from("lesson_progress").select("user_id, lesson_id, course_id, updated_at").eq("completed", true).limit(100000),
    admin.from("enrollments").select("course_id, user_id").neq("source", "free"),
    idsDaEquipe(admin),
  ]);

  const semTabela = !!vpRes.error;
  const vp = ((vpRes.data ?? []) as any[]).filter((v) => !equipe.has(v.user_id));
  const conclusoes = ((concl ?? []) as any[]).filter((c) => !equipe.has(c.user_id));
  const conclPeriodo = conclusoes.filter((c) => c.updated_at >= inicio);
  const aulas = ((aulasRaw ?? []) as Aula[]).filter((a) => (a.type || "video") === "video");
  const ordemModulo = new Map((modulos ?? []).map((m: any) => [m.id, m.position ?? 0]));

  /* --------------------------------------------------------- por curso */
  const porCurso = (cursos ?? []).map((c: any) => {
    const suas = aulas.filter((a) => a.course_id === c.id);
    const ids = new Set(suas.map((a) => a.id));
    const vistas = vp.filter((v) => ids.has(v.lesson_id));
    const cc = conclusoes.filter((x) => ids.has(x.lesson_id));
    const alunos = new Set([...vistas.map((v) => v.user_id), ...conclPeriodo.filter((x) => ids.has(x.lesson_id)).map((x) => x.user_id)]);
    const matriculados = new Set(((mats ?? []) as any[]).filter((m) => m.course_id === c.id && !equipe.has(m.user_id)).map((m) => m.user_id)).size;
    // Conclusão do curso: média, entre quem começou, da fração de aulas concluídas.
    const porAluno = new Map<string, number>();
    for (const x of cc) porAluno.set(x.user_id, (porAluno.get(x.user_id) || 0) + 1);
    const media = porAluno.size && suas.length ? [...porAluno.values()].reduce((t, k) => t + Math.min(1, k / suas.length), 0) / porAluno.size : 0;
    return {
      id: c.id, titulo: c.title, publicado: c.published, aulas: suas.length, matriculados, alunos: alunos.size,
      segundos: vistas.reduce((t, v) => t + (v.watched_s || 0), 0), media, concluiram: [...porAluno.values()].filter((k) => k >= suas.length && suas.length).length,
    };
  }).filter((c) => c.aulas > 0);

  const sel = porCurso.find((c) => c.id === cursoSel) ?? [...porCurso].sort((a, b) => b.alunos - a.alunos || b.matriculados - a.matriculados)[0];

  /* ------------------------------------------------ aulas do curso escolhido */
  const aulasSel = sel
    ? aulas.filter((a) => a.course_id === sel.id).sort((a, b) => (ordemModulo.get(a.module_id || "") ?? 0) - (ordemModulo.get(b.module_id || "") ?? 0) || (a.position ?? 0) - (b.position ?? 0))
    : [];
  const linhasAula = aulasSel.map((a, idx) => {
    const vs = vp.filter((v) => v.lesson_id === a.id);
    const curva = Array.from({ length: 20 }, (_, i) => (vs.length ? Math.round((vs.filter((v) => v.buckets?.[i] === "1").length / vs.length) * 100) : 0));
    const media = vs.length ? vs.reduce((t, v) => t + (v.buckets?.split("").filter((x: string) => x === "1").length || 0), 0) / vs.length / 20 : 0;
    const queda = vs.length ? curva.findIndex((p) => p < 50) : -1;
    const duracao = Math.max(0, ...vs.map((v) => v.duration_s || 0));
    return { a, idx, vs, curva, media, queda, duracao, concluiram: conclusoes.filter((c) => c.lesson_id === a.id).length, segundos: vs.reduce((t, v) => t + (v.watched_s || 0), 0) };
  });

  const totalSeg = vp.reduce((t, v) => t + (v.watched_s || 0), 0);
  const quemAssistiu = new Set(vp.map((v) => v.user_id)).size;
  const mediaGeral = vp.length ? vp.reduce((t, v) => t + (v.buckets?.split("").filter((x: string) => x === "1").length || 0), 0) / vp.length / 20 : 0;

  return (
    <div className="flex flex-col gap-8">
      {semTabela && (
        <Alert tone="attention" title="Falta ligar a medição de retenção">
          Rode supabase/migrations/20260919_analytics.sql no Supabase. Conclusões de aula já aparecem; tempo assistido e curva de retenção começam a ser medidos a partir daí.
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi rotulo="Horas assistidas" valor={horas(totalSeg)} detalhe={`nos últimos ${dias} dias`} />
        <Kpi rotulo="Alunos que deram play" valor={n(quemAssistiu)} detalhe={`nos últimos ${dias} dias`} />
        <Kpi rotulo="Quanto do vídeo assistem" valor={vp.length ? `${Math.round(mediaGeral * 100)}%` : "—"} detalhe="média por aula aberta" />
        <Kpi rotulo="Aulas concluídas" valor={n(conclPeriodo.length)} detalhe={`nos últimos ${dias} dias`} />
      </div>

      <section className="flex flex-col gap-3">
        <SectionHeader title="Cursos" action={<span className="text-meta uppercase text-ds-text-3">clique para ver as aulas</span>} />
        <Tabela
          colunas={["Curso", "Matriculados", "Assistiram no período", "Horas assistidas", "Progresso médio", "Concluíram tudo"]}
          vazio="Nenhum curso com aula em vídeo."
          linhas={porCurso.map((c) => [
            <Link key="a" href={`/admin/analytics?aba=videos&periodo=${dias}&curso=${c.id}`} className={`hover:underline ${c.id === sel?.id ? "font-semibold text-ds-accent" : "text-ds-text"}`}>
              {c.titulo}{!c.publicado && <span className="ml-1.5 text-caption text-ds-text-3">(rascunho)</span>}
            </Link>,
            <span key="b" className="font-mono tabular-nums">{c.matriculados}</span>,
            <span key="c" className="font-mono tabular-nums">{c.alunos}</span>,
            <span key="d" className="font-mono tabular-nums">{c.segundos ? horas(c.segundos) : "—"}</span>,
            <span key="e" className="font-mono tabular-nums">{c.media ? `${Math.round(c.media * 100)}%` : "—"}</span>,
            <span key="f" className="font-mono tabular-nums">{c.concluiram}</span>,
          ])}
        />
      </section>

      {sel && (
        <section className="flex flex-col gap-3">
          <SectionHeader title={`Aulas · ${sel.titulo}`} action={<span className="text-meta uppercase text-ds-text-3">retenção em 20 trechos de 5%</span>} />
          <Tabela
            colunas={["Aula", "Deram play", "Assistem em média", "Retenção", "Ponto de queda", "Concluíram", "Horas"]}
            vazio="Esse curso não tem aula em vídeo."
            linhas={linhasAula.map((l) => [
              <span key="a" className="text-ds-text"><span className="mr-1.5 font-mono text-caption tabular-nums text-ds-text-3">{l.idx + 1}</span>{l.a.title}</span>,
              <span key="b" className="font-mono tabular-nums">{l.vs.length}</span>,
              <span key="c" className="font-mono tabular-nums">{l.vs.length ? `${Math.round(l.media * 100)}%` : "—"}</span>,
              l.vs.length ? <Curva key="d" valores={l.curva} /> : <span key="d" className="text-ds-text-3">sem dados ainda</span>,
              <span key="e" className="font-mono tabular-nums">
                {l.queda < 0 ? (l.vs.length ? <span className="text-ds-accent">não cai</span> : "—") : (
                  <span className={l.queda < 6 ? "text-ds-danger" : "text-ds-attention"}>
                    {l.duracao ? `${Math.floor((l.duracao * l.queda) / 20 / 60)}:${String(Math.floor(((l.duracao * l.queda) / 20) % 60)).padStart(2, "0")}` : `${l.queda * 5}%`}
                  </span>
                )}
              </span>,
              <span key="f" className="font-mono tabular-nums">{l.concluiram}</span>,
              <span key="g" className="font-mono tabular-nums">{l.segundos ? horas(l.segundos) : "—"}</span>,
            ])}
          />
          <p className="text-caption text-ds-text-3">
            Ponto de queda é o minuto em que menos da metade de quem deu play continua assistindo. Em vermelho, quando isso acontece no primeiro terço da aula.
            Aulas do YouTube não entram na retenção: só as do Panda mandam o tempo assistido.
          </p>
        </section>
      )}
    </div>
  );
}
