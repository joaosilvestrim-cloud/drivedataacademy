import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Status } from "@/components/ui/primitives";
import { PageHeader, SectionHeader, Alert } from "@/components/ui/layout";
import { contarPendencias } from "@/lib/admin-pendencias";
import { checarIntegracoes, checarBanco, checarStorage, resumoOperacao, infoDeploy, type Check } from "@/lib/sistema";

export const dynamic = "force-dynamic";

/* Visão consolidada da saúde da plataforma: serviços externos, estrutura do
   banco, Storage, operação de pagamentos e e-mails, assistente e deploy.
   Cada bloco aponta para a tela onde se age sobre ele. */

const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const quando = (iso: string | null | undefined) =>
  iso ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso)) : "—";

function estado(checks: Check[]) {
  const falhas = checks.filter((c) => c.ok === false).length;
  return { falhas, tom: falhas ? ("danger" as const) : ("accent" as const), rotulo: falhas ? `${falhas} falha${falhas === 1 ? "" : "s"}` : "Tudo certo" };
}

function ListaChecks({ checks }: { checks: Check[] }) {
  return (
    <ul className="mt-3 divide-y divide-ds-line-soft rounded-srf border border-ds-line">
      {checks.map((c) => (
        <li key={c.nome} className="flex flex-wrap items-start gap-x-4 gap-y-1 px-4 py-3">
          <span className="w-56 shrink-0 text-body-sm font-medium text-ds-text">{c.nome}</span>
          <Status tone={c.ok === true ? "accent" : c.ok === false ? "danger" : "neutral"}>{c.ok === true ? "OK" : c.ok === false ? "Falha" : "Opcional"}</Status>
          <span className="min-w-0 flex-1 break-words text-caption text-ds-text-2">{c.detalhe}</span>
        </li>
      ))}
    </ul>
  );
}

function Numero({ rotulo, valor, apoio, tom = "neutral", href }: { rotulo: string; valor: string | number; apoio?: string; tom?: "neutral" | "danger" | "attention" | "accent"; href?: string }) {
  const cor = tom === "danger" ? "text-ds-danger" : tom === "attention" ? "text-ds-attention" : tom === "accent" ? "text-ds-accent" : "text-ds-text";
  const corpo = (
    <>
      <span className="block text-meta uppercase text-ds-text-3">{rotulo}</span>
      <span className={`mt-1 block font-mono text-2xl tabular-nums ${cor}`}>{valor}</span>
      {apoio && <span className="mt-1 block text-caption text-ds-text-3">{apoio}</span>}
    </>
  );
  return href ? (
    <Link href={href} className="block rounded-srf border border-ds-line px-4 py-3 transition-colors duration-fast hover:border-ds-text-3">{corpo}</Link>
  ) : (
    <div className="rounded-srf border border-ds-line px-4 py-3">{corpo}</div>
  );
}

export default async function SistemaAdmin() {
  const admin = createAdminClient();
  const [integracoes, banco, storage, resumo, pendencias] = await Promise.all([
    checarIntegracoes(),
    checarBanco(admin),
    checarStorage(admin),
    resumoOperacao(admin),
    contarPendencias(admin),
  ]);
  const deploy = infoDeploy();

  const eInt = estado(integracoes);
  const eBanco = estado(banco);
  const eStorage = estado(storage);
  const falhasTotais = eInt.falhas + eBanco.falhas + eStorage.falhas;
  const semAcesso = pendencias["/admin/operacao"] ?? 0;

  return (
    <div className="flex max-w-6xl flex-col gap-12">
      <div>
        <PageHeader context="Sistema" title="Visão do sistema" />
        <p className="mt-2 max-w-2xl text-body-sm text-ds-text-2">
          Tudo o que mantém a plataforma de pé, num lugar só: serviços externos, banco, arquivos, pagamentos, e-mails, assistente de IA e a versão publicada. Checado agora, ao abrir a página.
        </p>
      </div>

      {falhasTotais > 0 ? (
        <Alert tone="danger">{falhasTotais} {falhasTotais === 1 ? "item precisa" : "itens precisam"} de atenção. Veja as linhas marcadas como Falha abaixo.</Alert>
      ) : (
        <Alert tone="accent">Integrações, banco e arquivos sem falhas.</Alert>
      )}

      <section aria-labelledby="resumo">
        <SectionHeader title="Operação" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Numero rotulo="Pagos sem acesso" valor={semAcesso} apoio={semAcesso ? "Libere em Pagamentos" : "Todos com acesso"} tom={semAcesso ? "danger" : "accent"} href="/admin/operacao#pagamentos" />
          <Numero rotulo="Pedidos pagos (30 dias)" valor={resumo.pedidosPagos30} apoio={`${brl(resumo.receita30)} · ${resumo.pedidosPendentes30} pendente${resumo.pedidosPendentes30 === 1 ? "" : "s"}`} href="/admin/operacao#pagamentos" />
          <Numero rotulo="E-mails (7 dias)" valor={resumo.emailsEnviados7} apoio={resumo.emailsFalhos7 ? `${resumo.emailsFalhos7} com falha` : "Nenhuma falha"} tom={resumo.emailsFalhos7 ? "danger" : "neutral"} href="/admin/operacao#emails" />
          <Numero rotulo="Chamados abertos" valor={resumo.chamadosAbertos} apoio={`${resumo.conversasIa7} conversas com a IA em 7 dias, ${resumo.encaminhadasIa7} encaminhadas`} tom={resumo.chamadosAbertos ? "attention" : "neutral"} href="/admin/suporte" />
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="rounded-srf border border-ds-line px-4 py-3 text-caption text-ds-text-2">
            <span className="block text-meta uppercase text-ds-text-3">Último pagamento confirmado</span>
            {resumo.ultimoPagamento ? (
              <span className="mt-1 block">{resumo.ultimoPagamento.email} · {brl(Number(resumo.ultimoPagamento.amount || 0))} · {quando(resumo.ultimoPagamento.updated_at)}</span>
            ) : <span className="mt-1 block">Nenhum ainda.</span>}
          </div>
          <div className="rounded-srf border border-ds-line px-4 py-3 text-caption text-ds-text-2">
            <span className="block text-meta uppercase text-ds-text-3">Última falha de e-mail</span>
            {resumo.ultimaFalhaEmail ? (
              <span className="mt-1 block break-words">{resumo.ultimaFalhaEmail.to_email} · {quando(resumo.ultimaFalhaEmail.created_at)} · <span className="text-ds-danger">{resumo.ultimaFalhaEmail.reason}</span></span>
            ) : <span className="mt-1 block">Nenhuma registrada.</span>}
          </div>
        </div>
      </section>

      <section id="integracoes" className="scroll-mt-24">
        <SectionHeader title="Serviços externos" action={<Status tone={eInt.tom}>{eInt.rotulo}</Status>} />
        <ListaChecks checks={integracoes} />
        <p className="mt-2 text-caption text-ds-text-3">As chaves ficam nas variáveis de ambiente da Vercel. Depois de mudar uma, faça um redeploy.</p>
      </section>

      <section id="banco" className="scroll-mt-24">
        <SectionHeader title="Estrutura do banco" action={<Status tone={eBanco.tom}>{eBanco.rotulo}</Status>} />
        <p className="mt-1 text-caption text-ds-text-3">Cada linha confere se a tabela ou coluna que o código usa já existe no Supabase. Falha aqui significa migration que não foi rodada.</p>
        <ListaChecks checks={banco} />
      </section>

      <section id="storage" className="scroll-mt-24">
        <SectionHeader title="Arquivos (Storage)" action={<Status tone={eStorage.tom}>{eStorage.rotulo}</Status>} />
        <ListaChecks checks={storage} />
      </section>

      <section id="deploy" className="scroll-mt-24">
        <SectionHeader title="Versão publicada" />
        <dl className="mt-3 grid gap-x-6 gap-y-2 rounded-srf border border-ds-line px-4 py-3 text-body-sm sm:grid-cols-[10rem_1fr]">
          <dt className="text-ds-text-3">Ambiente</dt><dd className="text-ds-text">{deploy.ambiente}</dd>
          <dt className="text-ds-text-3">Commit</dt><dd className="font-mono text-ds-text">{deploy.commit ?? "—"}{deploy.branch ? ` · ${deploy.branch}` : ""}</dd>
          {deploy.mensagem && (<><dt className="text-ds-text-3">Mensagem</dt><dd className="break-words text-ds-text-2">{deploy.mensagem}</dd></>)}
          <dt className="text-ds-text-3">Região</dt><dd className="text-ds-text">{deploy.regiao ?? "—"}</dd>
          <dt className="text-ds-text-3">Site</dt><dd className="text-ds-text">{deploy.site}</dd>
        </dl>
      </section>

      <section aria-labelledby="atalhos">
        <SectionHeader title="Onde agir" />
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            { href: "/admin/operacao", titulo: "Pagamentos e e-mails", texto: "Consultar cobrança no Asaas, liberar acesso e reenviar código." },
            { href: "/admin/ia", titulo: "Assistente IA", texto: "Conversas com alunos e o que foi encaminhado ao time." },
            { href: "/admin/settings", titulo: "Configurações", texto: "Vídeos, assinatura do certificado e ajustes gerais." },
          ].map((a) => (
            <li key={a.href}>
              <Link href={a.href} className="block h-full rounded-srf border border-ds-line px-4 py-3 transition-colors duration-fast hover:border-ds-text-3">
                <span className="block text-body-sm font-medium text-ds-text">{a.titulo}</span>
                <span className="mt-1 block text-caption text-ds-text-3">{a.texto}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
