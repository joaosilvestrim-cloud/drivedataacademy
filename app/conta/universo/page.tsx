import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { knowledgeAccess } from "@/lib/knowledge/server";
import { knowledgeSummary } from "@/lib/knowledge/summary";

export const dynamic = "force-dynamic";

type Estado = "feito" | "agora" | "depois";

function Passo({
  numero, titulo, estado, children, acao, href, externo,
}: {
  numero: number; titulo: string; estado: Estado; children: React.ReactNode;
  acao: string; href: string; externo?: boolean;
}) {
  const feito = estado === "feito";
  const agora = estado === "agora";
  const anel = feito
    ? "border-brand-green/40 bg-brand-green/[0.06]"
    : agora
    ? "border-white/15 bg-white/[0.04]"
    : "border-white/8 bg-white/[0.02]";
  const bola = feito
    ? "bg-brand-green text-ink-900"
    : agora
    ? "bg-gradient-to-br from-brand-green to-brand-blue text-ink-900"
    : "bg-white/10 text-slate-400";
  const botao = feito
    ? "border border-white/12 text-slate-300 hover:border-brand-green/50 hover:text-brand-green"
    : agora
    ? "bg-gradient-to-r from-brand-green to-brand-blue text-ink-900"
    : "border border-white/12 text-slate-300 hover:border-white/25 hover:text-white";

  return (
    <div className={`flex gap-4 rounded-2xl border p-5 transition-colors ${anel}`}>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${bola}`}>
        {feito ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        ) : numero}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-lg font-bold text-white">{titulo}</h3>
          {feito && <span className="rounded-full bg-brand-green/15 px-2 py-0.5 text-[0.6rem] font-bold uppercase text-brand-green">Concluído</span>}
          {agora && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase text-slate-200">Comece por aqui</span>}
        </div>
        <div className="mt-1.5 text-sm leading-relaxed text-slate-400">{children}</div>
        <Link
          href={href}
          {...(externo ? { target: "_blank", rel: "noreferrer" } : {})}
          className={`mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${botao}`}
        >
          {acao}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </Link>
      </div>
    </div>
  );
}

export default async function UniversoHub() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?next=/conta/universo");

  let liberado = false;
  try { liberado = await knowledgeAccess(user.id, user.email); } catch { liberado = false; }

  if (!liberado) {
    return (
      <div className="max-w-xl">
        <p className="text-sm font-medium uppercase tracking-wide text-brand-green">Knowledge Universe 4D</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-white">Seu mapa de competências</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Está incluído na assinatura ativa da Academy. Enquanto isso, você pode explorar a demonstração.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/matricula" className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900">Conhecer a assinatura</Link>
          <Link href="/universo/demo" target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-slate-200 hover:border-brand-green/50 hover:text-brand-green">Ver a demonstração</Link>
        </div>
      </div>
    );
  }

  const admin = createAdminClient();
  const [{ data: tentativa }, { count: abertos }, { data: entregas }, resumo] = await Promise.all([
    admin.from("ku_diagnostic_attempts").select("completed_at").eq("user_id", user.id).maybeSingle(),
    admin.from("ku_challenges").select("*", { count: "exact", head: true }).eq("published", true),
    admin.from("ku_challenge_submissions").select("status").eq("user_id", user.id),
    knowledgeSummary(user.id, user.email),
  ]);

  const fezDiagnostico = !!tentativa;
  const enviadas = (entregas ?? []).length;
  const aprovadas = (entregas ?? []).filter((e: any) => e.status === "approved").length;
  const temEvidencia = resumo.developed > 0;

  const passo1: Estado = fezDiagnostico ? "feito" : "agora";
  const passo2: Estado = temEvidencia ? "feito" : fezDiagnostico ? "agora" : "depois";
  const passo3: Estado = aprovadas > 0 ? "feito" : fezDiagnostico ? "agora" : "depois";

  return (
    <div className="max-w-3xl">
      <p className="text-sm font-medium uppercase tracking-wide text-brand-green">Knowledge Universe 4D</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-white">Seu mapa de competências</h1>
      <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-slate-300">
        Tudo que você faz na Academy vira um mapa em 3D do seu conhecimento. Cada estrela é uma competência,
        e ela cresce conforme você acumula evidências: aulas assistidas, avaliações feitas e desafios entregues.
      </p>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
        A quarta dimensão é o tempo. Dá para voltar no calendário e ver como seu conhecimento evoluiu, e o que
        anda esfriando por falta de prática.
      </p>

      {temEvidencia && (
        <div className="mt-6 flex flex-wrap gap-3">
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-3">
            <p className="font-display text-2xl font-bold text-white">{resumo.developed}</p>
            <p className="text-xs text-slate-400">competências com evidência</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-3">
            <p className="font-display text-2xl font-bold text-white">{resumo.advanced}</p>
            <p className="text-xs text-slate-400">em nível avançado</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-3">
            <p className="font-display text-2xl font-bold text-white">{aprovadas}</p>
            <p className="text-xs text-slate-400">desafios aprovados</p>
          </div>
        </div>
      )}

      <h2 className="mt-10 font-display text-lg font-bold text-white">Como começar</h2>
      <div className="mt-4 space-y-3">
        <Passo numero={1} titulo="Faça o diagnóstico" estado={passo1}
          acao={fezDiagnostico ? "Ver meu resultado" : "Começar o diagnóstico"} href="/conta/diagnostico">
          {fezDiagnostico
            ? "Você já respondeu. Ele deu o ponto de partida do seu mapa."
            : "São 25 perguntas rápidas. Servem só para dar um ponto de partida ao seu mapa. Você responde uma vez, então faça com calma."}
        </Passo>

        <Passo numero={2} titulo="Abra o seu universo" estado={passo2} externo
          acao="Abrir o mapa 3D" href="/universo">
          {temEvidencia
            ? `Seu mapa já tem ${resumo.developed} competências com evidência. Gire, clique numa estrela e veja de onde veio cada ponto.`
            : "Aqui você vê o mapa. Estrela apagada não quer dizer que você não sabe: quer dizer que ainda não há registro na plataforma."}
        </Passo>

        <Passo numero={3} titulo="Entregue um desafio" estado={passo3}
          acao={enviadas ? "Ver minhas entregas" : "Ver desafios abertos"} href="/conta/desafios">
          {aprovadas > 0
            ? `Você já teve ${aprovadas} ${aprovadas === 1 ? "entrega aprovada" : "entregas aprovadas"}. Cada uma virou evidência no seu mapa.`
            : enviadas > 0
            ? "Sua entrega está na fila de correção. A gente te avisa por e-mail assim que revisar."
            : `Temos ${abertos ?? 0} desafios abertos. É aqui que você prova na prática o que aprendeu, e a equipe corrige.`}
        </Passo>
      </div>

      <h2 className="mt-10 font-display text-lg font-bold text-white">Como a pontuação funciona</h2>
      <div className="mt-4 space-y-3 rounded-2xl border border-white/8 bg-white/[0.02] p-5 text-sm leading-relaxed text-slate-400">
        <p>
          Cada competência vai de 0 a 100 e soma cinco tipos de evidência:
          <span className="text-slate-200"> aulas (25), avaliações (35), exercícios (15), desafios (20) e revisões (5)</span>.
        </p>
        <p>
          <span className="text-white">Concluir um curso contribui, mas não significa dominar o assunto.</span> Por isso
          uma competência só passa de 79 pontos quando você tem também uma avaliação avançada aprovada e um desafio
          avançado com boa qualidade. É proposital: o número precisa significar alguma coisa.
        </p>
        <p>
          O tempo derruba o <span className="text-slate-200">frescor</span>, não a sua pontuação. Uma competência
          parada há meses continua sua, mas aparece esfriando na sua home como lembrete de revisar.
        </p>
        <p className="text-slate-500">
          Um detalhe honesto: 68 pontos não quer dizer que você sabe 68% de tudo sobre um assunto. Quer dizer que
          você cumpriu 68% dos critérios que a Academy consegue evidenciar hoje.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/universo" target="_blank" rel="noreferrer" className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900">Abrir meu universo ↗</Link>
        <Link href="/conta/ranking" className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-slate-200 hover:border-brand-green/50 hover:text-brand-green">Ver meus pontos</Link>
      </div>
    </div>
  );
}
