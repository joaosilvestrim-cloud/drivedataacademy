import { tr } from "@/lib/i18n/traduzir-servidor";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { usuarioAtual } from "@/lib/sessao";
import { assinaturaDoAluno } from "@/lib/assinatura";
import CancelarForm from "./CancelarForm";
import ReembolsoForm from "./ReembolsoForm";

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

export default async function AssinaturaPage({ searchParams }: { searchParams: { erro?: string; cancelada?: string; reembolsada?: string; reembolso_pendente?: string } }) {
  const user = await usuarioAtual();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  const a = await assinaturaDoAluno(admin, user.id);

  return (
    <div className="max-w-2xl">
      <p className="text-sm font-medium text-ds-text-3">{tr("Sua conta")}</p>
      <h1 className="mt-1 text-[2rem] font-bold leading-tight tracking-tight text-obsidian">{tr("Assinatura")}</h1>

      {searchParams.erro && (
        <p className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          {searchParams.erro}
        </p>
      )}

      {searchParams.cancelada && (
        <div className="mt-5 rounded-2xl border border-tinta/10 bg-tinta/[0.02] p-5">
          <p className="text-sm font-semibold text-tinta">{tr("Cancelamento registrado.")}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {a.acessoAte
              ? `${tr("Não vamos cobrar de novo. Seu acesso continua até")} ${data(a.acessoAte)}.`
              : tr("Não vamos cobrar de novo.")}{" "}
            {tr("Obrigado por ter estado aqui. Se mudar de ideia, é só assinar de novo.")}
          </p>
        </div>
      )}

      {searchParams.reembolsada && (
        <div className="mt-5 rounded-[20px] border border-tinta/10 bg-papel p-5">
          <p className="text-sm font-semibold text-obsidian">{tr("Reembolso solicitado.")}</p>
          <p className="mt-2 text-sm leading-relaxed text-charcoal">
            {tr("O valor volta pelo mesmo meio de pagamento. No Pix costuma cair em poucos minutos; no cartão, o estorno pode aparecer em até duas faturas. Mandamos a confirmação por e-mail.")}
          </p>
        </div>
      )}
      {searchParams.reembolso_pendente && (
        <div className="mt-5 rounded-[20px] border border-amber-400/40 bg-amber-400/[0.08] p-5">
          <p className="text-sm font-semibold text-obsidian">{tr("Recebemos seu pedido de reembolso.")}</p>
          <p className="mt-2 text-sm leading-relaxed text-charcoal">
            {tr("A devolução automática não conseguiu concluir agora. O time faz o reembolso em até 1 dia útil e te avisa por e-mail.")}
          </p>
        </div>
      )}

      {!a.ativa && !searchParams.cancelada ? (
        searchParams.reembolsada ? null : (
        <div className="mt-8 rounded-3xl border border-tinta/8 bg-tinta/[0.02] p-8 text-center">
          <p className="text-sm text-slate-400">{tr("Esta conta não tem assinatura ativa.")}</p>
          <Link
            href="/matricula"
            className="mt-5 inline-block rounded-xl bg-marca-verde px-6 py-3 text-sm font-semibold text-sobre-acento"
          >
            {tr("Ver os planos")}
          </Link>
        </div>
        )
      ) : (
        <>
          <div className="mt-6 rounded-2xl border border-tinta/8 bg-tinta/[0.02] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-xl font-bold text-tinta">{tr(a.rotulo)}</p>
                {a.desde && (
                  <p className="mt-1 text-sm text-slate-400">
                    {tr("Assinante desde")} {data(a.desde)}
                  </p>
                )}
              </div>
              <Selo status={a.status} cancelado={!!a.cancelamentoPedidoEm} />
            </div>

            <dl className="mt-6 grid gap-x-6 gap-y-4 border-t border-tinta/5 pt-5 sm:grid-cols-2">
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
          {/* Dentro de 7 dias úteis da compra, o aluno pode pedir o dinheiro de
              volta sozinho. Depois do prazo este bloco some e fica só cancelar. */}
          {a.reembolso.pode && a.reembolso.ate && (
            <div className="mt-6">
              <ReembolsoForm ate={a.reembolso.ate} valor={dinheiro(a.valor)} />
            </div>
          )}

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
      <dt className="text-xs text-slate-500 font-medium">{rotulo}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-200">{valor}</dd>
    </div>
  );
}

function Selo({ status, cancelado }: { status: string; cancelado: boolean }) {
  const [texto, cor] = cancelado
    ? [tr("Cancelada"), "border-slate-500/40 text-slate-400"]
    : status === "ativa"
      ? [tr("Ativa"), "border-acento/40 text-acento"]
      : [tr("Expirada"), "border-amber-400/40 text-amber-300"];
  return <span className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-medium ${cor}`}>{texto}</span>;
}
