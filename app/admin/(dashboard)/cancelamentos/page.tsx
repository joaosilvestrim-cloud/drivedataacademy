import { createAdminClient } from "@/lib/supabase/admin";
import { MOTIVOS } from "@/lib/assinatura";

export const dynamic = "force-dynamic";

/* Quem saiu, e por quê.

   Vale a tela porque o motivo é o único dado de churn que a Academy tem. O
   resto do painel conta quem entrou; aqui é o contrário.

   O primeiro bloco não é estatística: é fila. Cancelamento em que a chamada ao
   Asaas falhou significa que a cobrança continua de pé no cartão de alguém que
   pediu para sair. Isso precisa de mão, e por isso vem antes de tudo. */

const ROTULO = Object.fromEntries(MOTIVOS.map((m) => [m.id, m.label]));

function data(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export default async function CancelamentosPage() {
  const admin = createAdminClient();
  const { data: linhas } = await admin
    .from("subscription_cancellations")
    .select("id, email, plano, motivo, detalhe, acesso_ate, asaas_ok, asaas_resposta, asaas_subscription_id, created_at")
    .order("created_at", { ascending: false })
    .limit(400);

  const lista = linhas ?? [];
  const presos = lista.filter((c) => c.asaas_ok === false);

  const trintaDias = Date.now() - 30 * 864e5;
  const recentes = lista.filter((c) => Date.parse(c.created_at) > trintaDias);
  const porMotivo = MOTIVOS.map((m) => ({
    label: m.label,
    n: recentes.filter((c) => c.motivo === m.id).length,
  })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  const maior = porMotivo[0]?.n || 1;

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-brand-green">Assinatura</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-white">Cancelamentos</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        O aluno cancela pela própria tela e o Asaas é avisado na hora. Aqui fica o registro, com o motivo que ele deu.
      </p>

      {presos.length > 0 && (
        <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-500/[0.07] p-5">
          <p className="text-sm font-semibold text-red-300">
            {presos.length === 1 ? "1 cancelamento não saiu no Asaas" : `${presos.length} cancelamentos não saíram no Asaas`}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            A cobrança continua ativa para estas pessoas. Cancele a assinatura no painel do Asaas.
          </p>
          <ul className="mt-4 space-y-2">
            {presos.map((c) => (
              <li key={c.id} className="rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-sm">
                <p className="font-medium text-white">{c.email}</p>
                <p className="mt-0.5 font-mono text-xs text-slate-400">
                  {c.asaas_subscription_id || "sem id de assinatura"} · {data(c.created_at)}
                </p>
                {c.asaas_resposta && <p className="mt-1 text-xs text-slate-500">{c.asaas_resposta}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {porMotivo.length > 0 && (
        <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <p className="text-sm font-semibold text-white">Motivos nos últimos 30 dias</p>
          <ul className="mt-4 space-y-2.5">
            {porMotivo.map((m) => (
              <li key={m.label} className="flex items-center gap-3">
                <span className="w-56 shrink-0 truncate text-sm text-slate-300">{m.label}</span>
                <span className="h-1.5 rounded-full bg-brand-green/60" style={{ width: `${Math.round((m.n / maior) * 60)}%`, minWidth: 6 }} />
                <span className="font-mono text-xs tabular-nums text-slate-500">{m.n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {lista.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-slate-500">
          Ninguém cancelou ainda.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-white/5 rounded-2xl border border-white/8 bg-white/[0.02]">
          {lista.map((c) => (
            <li key={c.id} className="px-5 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="min-w-0 truncate text-sm font-medium text-white">{c.email}</p>
                <p className="shrink-0 font-mono text-xs tabular-nums text-slate-500">{data(c.created_at)}</p>
              </div>
              <p className="mt-1 text-sm text-slate-300">
                {ROTULO[c.motivo] ?? c.motivo}
                {c.plano ? <span className="text-slate-500"> · {c.plano}</span> : null}
                {c.acesso_ate ? <span className="text-slate-500"> · acesso até {c.acesso_ate.slice(0, 10)}</span> : null}
              </p>
              {c.detalhe && (
                <p className="mt-2 border-l-2 border-white/10 pl-3 text-sm leading-relaxed text-slate-400">{c.detalhe}</p>
              )}
              {c.asaas_ok === null && (
                <p className="mt-1.5 text-xs text-slate-500">Plano sem recorrência no Asaas: não havia cobrança para interromper.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
