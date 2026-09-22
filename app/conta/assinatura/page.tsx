import { tr } from "@/lib/i18n/traduzir-servidor";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { usuarioAtual } from "@/lib/sessao";
import { assinaturaDoAluno } from "@/lib/assinatura";
import CancelarForm from "./CancelarForm";

export const dynamic = "force-dynamic";

/* A assinatura do aluno, em uma tela.

   Antes disso o aluno não tinha onde ver o que paga, quando vence nem como
   sair: cancelar era abrir chamado e esperar alguém mexer no Asaas. Esconder a
   saída não segura ninguém, só transforma cancelamento em reclamação. */

function data(iso: string | null) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(iso));
}

function dinheiro(v: number | null) {
  if (v == null) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default async function AssinaturaPage({ searchParams }: { searchParams: { erro?: string; cancelada?: string } }) {
  const user = await usuarioAtual();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  const a = await assinaturaDoAluno(admin, user.id);

  return (
    <div className="max-w-2xl">
      <p className="text-sm font-medium uppercase tracking-wide text-brand-green">{tr("Sua conta")}</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-white">{tr("Assinatura")}</h1>

      {searchParams.erro && (
        <p className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          {searchParams.erro}
        </p>
      )}

      {searchParams.cancelada && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-sm font-semibold text-white">{tr("Cancelamento registrado.")}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {a.acessoAte
              ? `${tr("Não vamos cobrar de novo. Seu acesso continua até")} ${data(a.acessoAte)}.`
              : tr("Não vamos cobrar de novo.")}{" "}
            {tr("Obrigado por ter estado aqui. Se mudar de ideia, é só assinar de novo.")}
          </p>
        </div>
      )}

      {!a.ativa && !searchParams.cancelada ? (
        <div className="mt-8 rounded-3xl border border-white/8 bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-slate-400">{tr("Esta conta não tem assinatura ativa.")}</p>
          <Link
            href="/matricula"
            className="mt-5 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900"
          >
            {tr("Ver os planos")}
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.02] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-xl font-bold text-white">{tr(a.rotulo)}</p>
                {a.desde && (
                  <p className="mt-1 text-sm text-slate-400">
                    {tr("Assinante desde")} {data(a.desde)}
                  </p>
                )}
              </div>
              <Selo status={a.status} cancelado={!!a.cancelamentoPedidoEm} />
            </div>

            <dl className="mt-6 grid gap-x-6 gap-y-4 border-t border-white/5 pt-5 sm:grid-cols-2">
              {a.valor != null && (
                <Linha rotulo={a.plano === "anual" ? tr("Valor pago") : tr("Mensalidade")} valor={dinheiro(a.valor)!} />
              )}
              {a.plano === "mensal" && !a.cancelamentoPedidoEm && (
                <Linha rotulo={tr("Renovação")} valor={tr("Automática, no cartão")} />
              )}
              {a.acessoAte && (
                <Linha
                  rotulo={a.cancelamentoPedidoEm || a.plano === "anual" ? tr("Acesso até") : tr("Próxima cobrança")}
                  valor={data(a.acessoAte)!}
                />
              )}
            </dl>
          </div>

          {/* Quem já cancelou não vê o formulário de novo: não há o que cancelar
              duas vezes, e repetir o botão sugere que o primeiro não funcionou. */}
          {a.ativa && !a.cancelamentoPedidoEm && (
            <div className="mt-6">
              <CancelarForm acessoAte={a.acessoAte} recorrente={a.recorrente} />
            </div>
          )}

          <p className="mt-8 text-sm leading-relaxed text-slate-500">
            {tr("Nota fiscal, troca de cartão ou qualquer coisa fora daqui:")}{" "}
            <Link href="/conta/ajuda" className="text-brand-teal underline underline-offset-4">
              {tr("fale com o time")}
            </Link>
            .
          </p>
        </>
      )}
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{rotulo}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-200">{valor}</dd>
    </div>
  );
}

function Selo({ status, cancelado }: { status: string; cancelado: boolean }) {
  const [texto, cor] = cancelado
    ? [tr("Cancelada"), "border-slate-500/40 text-slate-400"]
    : status === "ativa"
      ? [tr("Ativa"), "border-brand-green/40 text-brand-green"]
      : [tr("Expirada"), "border-amber-400/40 text-amber-300"];
  return <span className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-medium ${cor}`}>{texto}</span>;
}
