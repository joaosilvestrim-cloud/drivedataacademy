import { Alert, SectionHeader } from "@/components/ui/layout";
import { createAdminClient } from "@/lib/supabase/admin";
import { idsDaEquipe } from "@/lib/community";
import { Kpi, Tabela, dataCurta, horas, n } from "./ui";

/* Engajamento: quem entra, com que frequência e em que horário.

   A unidade é a sessão: uma linha por aluno a cada 30 minutos de atividade na
   área logada. Dia ativo é dia com pelo menos uma sessão. O que mais importa
   aqui é a lista de "sumidos": assinante pagando que não entra há 14 dias é o
   cancelamento do mês que vem.

   A equipe fica de fora de todas as contas. */

const FUSO = "America/Sao_Paulo";
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function partesBR(iso: string) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: FUSO, weekday: "short", hour: "2-digit", hour12: false, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(iso));
  const g = (t: string) => p.find((x) => x.type === t)?.value || "";
  const semana = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(g("weekday"));
  return { dia: `${g("year")}-${g("month")}-${g("day")}`, semana, hora: Number(g("hour")) % 24 };
}

export default async function Engajamento({ dias }: { dias: number }) {
  const admin = createAdminClient();
  const agora = Date.now();
  const inicio = new Date(agora - dias * 864e5).toISOString();

  const [sessoesRes, { data: usuarios }, { data: perfis }, { data: assinaturas }, videosRes, { data: aulas }, equipe] = await Promise.all([
    admin.from("access_events").select("user_id, created_at").eq("tipo", "sessao").gte("created_at", inicio).limit(100000),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("profiles").select("id, full_name"),
    admin.from("memberships").select("user_id, status, expires_at"),
    admin.from("video_progress").select("user_id, watched_s, updated_at").gte("updated_at", inicio),
    admin.from("lesson_progress").select("user_id, updated_at").eq("completed", true).gte("updated_at", inicio),
    idsDaEquipe(admin),
  ]);

  const semSessoes = !!sessoesRes.error;
  const semVideo = !!videosRes.error;
  const sessoes = ((sessoesRes.data ?? []) as { user_id: string; created_at: string }[]).filter((s) => !equipe.has(s.user_id));

  const assinantes = new Set(
    (assinaturas ?? []).filter((m: any) => m.status === "active" && (!m.expires_at || Date.parse(m.expires_at) > agora)).map((m: any) => m.user_id).filter((id: string) => !equipe.has(id))
  );
  const nome = new Map((perfis ?? []).map((p: any) => [p.id, p.full_name || ""]));
  const conta = new Map((usuarios?.users ?? []).map((u: any) => [u.id, u]));

  /* Por aluno */
  type Aluno = { dias: Set<string>; sessoes: number; ultima: string | null; video: number; aulas: number };
  const por = new Map<string, Aluno>();
  const pegar = (id: string) => por.get(id) ?? (por.set(id, { dias: new Set(), sessoes: 0, ultima: null, video: 0, aulas: 0 }), por.get(id)!);
  const mapa = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
  const porDia = new Map<string, Set<string>>();
  for (const s of sessoes) {
    const a = pegar(s.user_id);
    const { dia, semana, hora } = partesBR(s.created_at);
    a.dias.add(dia);
    a.sessoes++;
    if (!a.ultima || s.created_at > a.ultima) a.ultima = s.created_at;
    if (semana >= 0) mapa[semana][hora]++;
    porDia.set(dia, (porDia.get(dia) ?? new Set()).add(s.user_id));
  }
  for (const v of (videosRes.data ?? []) as any[]) if (!equipe.has(v.user_id)) pegar(v.user_id).video += v.watched_s || 0;
  for (const l of (aulas ?? []) as any[]) if (!equipe.has(l.user_id)) pegar(l.user_id).aulas++;
  for (const id of assinantes) pegar(id);

  const ativos = [...por.entries()].filter(([, a]) => a.sessoes > 0);
  const ativos7 = new Set(sessoes.filter((s) => Date.parse(s.created_at) > agora - 7 * 864e5).map((s) => s.user_id)).size;
  const mediaDias = ativos.length ? ativos.reduce((t, [, a]) => t + a.dias.size, 0) / ativos.length : 0;

  const ultimoAcesso = (id: string) => {
    const a = por.get(id)?.ultima;
    const login = conta.get(id)?.last_sign_in_at || null;
    return [a, login].filter(Boolean).sort().at(-1) || null;
  };
  const sumidos = [...assinantes].filter((id) => {
    const u = ultimoAcesso(id);
    return !u || Date.parse(u) < agora - 14 * 864e5;
  });

  // Série de alunos por dia e o horário de pico.
  const serie: { dia: string; alunos: number }[] = [];
  for (let i = dias - 1; i >= 0; i--) {
    const { dia } = partesBR(new Date(agora - i * 864e5).toISOString());
    serie.push({ dia, alunos: porDia.get(dia)?.size ?? 0 });
  }
  const picoSerie = Math.max(1, ...serie.map((s) => s.alunos));
  const picoMapa = Math.max(1, ...mapa.flat());
  let melhor = { semana: 0, hora: 0, v: -1 };
  mapa.forEach((l, s) => l.forEach((v, h) => { if (v > melhor.v) melhor = { semana: s, hora: h, v }; }));

  const linhas = [...por.entries()]
    .filter(([id]) => !equipe.has(id))
    .map(([id, a]) => ({ id, a, ultimo: ultimoAcesso(id), assinante: assinantes.has(id) }))
    .sort((x, y) => (y.ultimo || "").localeCompare(x.ultimo || ""));

  return (
    <div className="flex flex-col gap-8">
      {semSessoes && (
        <Alert tone="attention" title="Falta ligar o registro de sessões">
          Rode supabase/migrations/20260919_analytics.sql no Supabase. A partir daí, dias de acesso, sessões e horários começam a ser contados.
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi rotulo="Ativos em 7 dias" valor={n(ativos7)} detalhe="alunos com pelo menos uma sessão" />
        <Kpi rotulo={`Ativos em ${dias} dias`} valor={n(ativos.length)} detalhe={`de ${n(assinantes.size)} assinantes ativos`} />
        <Kpi rotulo="Dias de acesso por aluno" valor={mediaDias ? mediaDias.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"} detalhe={`média no período de ${dias} dias`} />
        <Kpi rotulo="Horário de pico" valor={melhor.v > 0 ? `${DIAS[melhor.semana]} ${melhor.hora}h` : "—"} detalhe="dia e hora com mais sessões" />
        <Kpi rotulo="Assinantes sumidos" valor={n(sumidos.length)} detalhe="sem entrar há 14 dias ou mais" tom={sumidos.length ? "danger" : undefined} />
      </div>

      <section className="flex flex-col gap-3">
        <SectionHeader title="Alunos por dia" action={<span className="text-meta uppercase text-ds-text-3">pico {n(picoSerie === 1 && !serie.some((s) => s.alunos) ? 0 : picoSerie)}</span>} />
        <div className="rounded-srf border border-ds-line bg-ds-surface p-4">
          <div className="flex h-28 items-end gap-[2px]">
            {serie.map((s) => (
              <div key={s.dia} className="group flex h-full min-w-0 flex-1 items-end" title={`${s.dia.slice(8)}/${s.dia.slice(5, 7)}: ${s.alunos} ${s.alunos === 1 ? "aluno" : "alunos"}`}>
                <div className={`w-full rounded-t-sm ${s.alunos ? "bg-ds-accent/70 group-hover:bg-ds-accent" : "bg-ds-line-soft"}`} style={{ height: s.alunos ? `${Math.max(6, (s.alunos / picoSerie) * 100)}%` : "2px" }} />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between font-mono text-caption tabular-nums text-ds-text-3">
            <span>{serie[0].dia.slice(8)}/{serie[0].dia.slice(5, 7)}</span>
            <span>hoje</span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader title="Quando os alunos entram" action={<span className="text-meta uppercase text-ds-text-3">sessões por dia da semana e hora (Brasília)</span>} />
        <div className="overflow-x-auto rounded-srf border border-ds-line bg-ds-surface p-4">
          <div className="grid min-w-[640px] gap-[3px]" style={{ gridTemplateColumns: "36px repeat(24, minmax(0, 1fr))" }}>
            <span />
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} className="text-center font-mono text-[0.6rem] tabular-nums text-ds-text-3">{h % 3 === 0 ? `${h}h` : ""}</span>
            ))}
            {mapa.map((linha, s) => [
              <span key={`r${s}`} className="text-caption text-ds-text-3">{DIAS[s]}</span>,
              ...linha.map((v, h) => (
                <span
                  key={`${s}-${h}`}
                  title={`${DIAS[s]} ${h}h: ${v} ${v === 1 ? "sessão" : "sessões"}`}
                  className="aspect-square rounded-[3px]"
                  style={{ background: v ? `rgb(var(--ds-accent-c) / ${0.15 + (v / picoMapa) * 0.85})` : "rgb(var(--ds-line-soft-c))" }}
                />
              )),
            ])}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader title="Alunos" action={<span className="text-meta uppercase text-ds-text-3">últimos {dias} dias</span>} />
        <Tabela
          colunas={["Aluno", "Último acesso", "Dias ativos", "Sessões", "Vídeo assistido", "Aulas concluídas", "Situação"]}
          vazio="Sem atividade registrada no período."
          linhas={linhas.map(({ id, a, ultimo, assinante }) => {
            const u = conta.get(id);
            const sumido = assinante && (!ultimo || Date.parse(ultimo) < agora - 14 * 864e5);
            return [
              <div key="a" className="min-w-0"><p className="truncate text-ds-text">{nome.get(id) || "(sem nome)"}</p><p className="truncate text-caption text-ds-text-3">{u?.email || ""}</p></div>,
              <span key="b" className="font-mono tabular-nums">{dataCurta(ultimo)}</span>,
              <span key="c" className="font-mono tabular-nums">{a.dias.size}</span>,
              <span key="d" className="font-mono tabular-nums">{a.sessoes}</span>,
              <span key="e" className="font-mono tabular-nums">{semVideo ? "—" : a.video ? horas(a.video) : "0"}</span>,
              <span key="f" className="font-mono tabular-nums">{a.aulas}</span>,
              <span key="g" className={sumido ? "font-medium text-ds-danger" : assinante ? "text-ds-accent" : "text-ds-text-3"}>
                {sumido ? (ultimo ? "Sumido" : "Nunca entrou") : assinante ? "Assinante ativo" : "Sem assinatura"}
              </span>,
            ];
          })}
        />
        <p className="text-caption text-ds-text-3">
          Sessão é cada bloco de até 30 minutos de uso. O registro de sessões começou em 19/09/2026; antes disso, o último acesso vem do último login.
        </p>
      </section>
    </div>
  );
}
