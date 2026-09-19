import { Alert, SectionHeader } from "@/components/ui/layout";
import { historicoAsaas, PAGO, type Cobranca } from "@/lib/asaas-historico";
import { Kpi, Tabela, brl, dataCurta, n } from "./ui";

/* Recorrência: quem continua pagando e quem parou.

   Mensal: agrupa as cobranças do Asaas por assinatura e classifica cada uma.
   A classe que importa para a operação é "pagou 1x e parou": gente que entrou,
   pagou o primeiro mês e não pagou o segundo. É a lista para ligar.

   Anual: cobrança única, então a pergunta é outra, quando vence a renovação. */

type Classe = "em_dia" | "atrasada" | "parou_1x" | "cancelada" | "nunca_pagou";
const CLASSE: Record<Classe, { rotulo: string; cor: string; ordem: number }> = {
  parou_1x: { rotulo: "Pagou 1x e parou", cor: "text-ds-danger", ordem: 0 },
  atrasada: { rotulo: "Atrasada", cor: "text-ds-attention", ordem: 1 },
  cancelada: { rotulo: "Cancelada", cor: "text-ds-text-3", ordem: 2 },
  nunca_pagou: { rotulo: "Não pagou a 1ª (checkout abandonado)", cor: "text-ds-text-3", ordem: 3 },
  em_dia: { rotulo: "Em dia", cor: "text-ds-accent", ordem: 4 },
};

export default async function Pagamentos() {
  let dados;
  try {
    dados = await historicoAsaas();
  } catch (e) {
    return <Alert tone="danger" title="Não consegui ler o Asaas">{e instanceof Error ? e.message : "Erro desconhecido."}</Alert>;
  }
  const { cobrancas, assinaturas, clientes } = dados;
  const cliente = new Map(clientes.map((c) => [c.id, c]));
  const hoje = new Date().toISOString().slice(0, 10);

  /* ------------------------------------------------------------- mensal */
  const porAssinatura = new Map<string, Cobranca[]>();
  for (const c of cobrancas) if (c.assinatura) porAssinatura.set(c.assinatura, [...(porAssinatura.get(c.assinatura) ?? []), c]);

  const linhas = assinaturas
    .filter((a) => a.ciclo === "MONTHLY" || porAssinatura.has(a.id))
    .map((a) => {
      const cs = (porAssinatura.get(a.id) ?? []).sort((x, y) => x.vencimento.localeCompare(y.vencimento));
      const pagas = cs.filter((c) => PAGO.has(c.status));
      const atrasadas = cs.filter((c) => c.status === "OVERDUE");
      const ativa = a.status === "ACTIVE" && !a.excluida;
      // A próxima é a cobrança em aberto mais antiga que ainda não venceu. O
      // nextDueDate do Asaas aponta para a seguinte à que já foi gerada.
      const emAberto = cs.filter((c) => c.status === "PENDING" && c.vencimento >= hoje);
      let classe: Classe;
      if (!pagas.length) classe = "nunca_pagou";
      else if (pagas.length === 1 && (atrasadas.length || !ativa)) classe = "parou_1x";
      else if (!ativa) classe = "cancelada";
      else if (atrasadas.length) classe = "atrasada";
      else classe = "em_dia";
      const cli = cliente.get(a.cliente);
      return {
        id: a.id,
        nome: cli?.nome || "(sem nome)",
        email: cli?.email || "",
        valor: a.valor,
        pagas: pagas.length,
        total: pagas.reduce((s, c) => s + c.valor, 0),
        primeira: pagas[0]?.pagoEm || null,
        ultima: pagas.at(-1)?.pagoEm || null,
        atrasadaDesde: atrasadas[0]?.vencimento || null,
        proxima: ativa ? emAberto[0]?.vencimento ?? a.proxima : null,
        classe,
      };
    })
    .sort((x, y) => CLASSE[x.classe].ordem - CLASSE[y.classe].ordem || (y.ultima || "").localeCompare(x.ultima || ""));

  const conta = (c: Classe) => linhas.filter((l) => l.classe === c).length;
  const pagantes = linhas.filter((l) => l.pagas > 0);
  const mrr = linhas.filter((l) => l.classe === "em_dia").reduce((s, l) => s + l.valor, 0);
  const renovaram = pagantes.filter((l) => l.pagas >= 2).length;
  const elegiveis = pagantes.filter((l) => l.pagas >= 2 || l.classe !== "em_dia").length; // já tiveram a 2ª cobrança vencida
  const mediaMeses = pagantes.length ? pagantes.reduce((s, l) => s + l.pagas, 0) / pagantes.length : 0;

  // Coorte: mês da primeira mensalidade paga, e quantos chegaram a pagar 2, 3, 4... meses.
  const coortes = new Map<string, number[]>();
  for (const l of pagantes) {
    const mes = (l.primeira || "").slice(0, 7);
    if (!mes) continue;
    const arr = coortes.get(mes) ?? [];
    arr.push(l.pagas);
    coortes.set(mes, arr);
  }
  const meses = [...coortes.keys()].sort();
  const maxMeses = Math.min(6, Math.max(1, ...pagantes.map((l) => l.pagas)));

  /* -------------------------------------------------------------- anual */
  const anuais = cobrancas
    .filter((c) => c.ref.startsWith("anual:") && PAGO.has(c.status) && c.pagoEm)
    .map((c) => {
      const renova = new Date(Date.parse(c.pagoEm!) + 365 * 864e5).toISOString().slice(0, 10);
      const cli = cliente.get(c.cliente);
      return { nome: cli?.nome || "(sem nome)", email: cli?.email || "", valor: c.valor, pagoEm: c.pagoEm!, renova, dias: Math.round((Date.parse(renova) - Date.parse(hoje)) / 864e5) };
    })
    .sort((a, b) => a.renova.localeCompare(b.renova));
  const anualAbandonado = cobrancas.filter((c) => c.ref.startsWith("anual:") && (c.status === "OVERDUE" || (c.status === "PENDING" && c.vencimento < hoje))).length;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi rotulo="Mensalidades em dia" valor={n(conta("em_dia"))} detalhe={`${brl(mrr)} por mês`} />
        <Kpi rotulo="Pagou 1x e parou" valor={n(conta("parou_1x"))} detalhe="lista abaixo para contato" tom={conta("parou_1x") ? "danger" : undefined} />
        <Kpi rotulo="Atrasadas" valor={n(conta("atrasada"))} detalhe="têm cobrança vencida" tom={conta("atrasada") ? "attention" : undefined} />
        <Kpi rotulo="Renovaram o 2º mês" valor={elegiveis ? `${Math.round((renovaram / elegiveis) * 100)}%` : "—"} detalhe={`${renovaram} de ${elegiveis} que já tiveram a 2ª cobrança`} />
        <Kpi rotulo="Meses pagos em média" valor={mediaMeses ? mediaMeses.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"} detalhe={`${n(pagantes.length)} assinantes mensais`} />
      </div>

      <section className="flex flex-col gap-3">
        <SectionHeader title="Assinaturas mensais" action={<span className="text-meta uppercase text-ds-text-3">{n(linhas.length)} no Asaas</span>} />
        <Tabela
          colunas={["Aluno", "Situação", "Meses pagos", "Total pago", "1º pagamento", "Último pagamento", "Próxima / atraso"]}
          vazio="Nenhuma assinatura mensal no Asaas."
          linhas={linhas.map((l) => [
            <div key="a" className="min-w-0"><p className="truncate text-ds-text">{l.nome}</p><p className="truncate text-caption text-ds-text-3">{l.email}</p></div>,
            <span key="b" className={`font-medium ${CLASSE[l.classe].cor}`}>{CLASSE[l.classe].rotulo}</span>,
            <span key="c" className="font-mono tabular-nums">{l.pagas}</span>,
            <span key="d" className="font-mono tabular-nums">{brl(l.total)}</span>,
            <span key="e" className="font-mono tabular-nums">{dataCurta(l.primeira)}</span>,
            <span key="f" className="font-mono tabular-nums">{dataCurta(l.ultima)}</span>,
            <span key="g" className="font-mono tabular-nums">
              {l.atrasadaDesde ? <span className="text-ds-attention">venceu {dataCurta(l.atrasadaDesde)}</span> : l.proxima ? dataCurta(l.proxima) : "—"}
            </span>,
          ])}
        />
      </section>

      {meses.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Coorte: quantos continuam pagando" action={<span className="text-meta uppercase text-ds-text-3">pelo mês do 1º pagamento</span>} />
          <Tabela
            colunas={["Entrou em", "Assinantes", ...Array.from({ length: maxMeses }, (_, i) => `${i + 1}º mês`)]}
            vazio=""
            linhas={meses.map((mes) => {
              const arr = coortes.get(mes)!;
              return [
                <span key="m" className="font-mono tabular-nums">{mes.slice(5, 7)}/{mes.slice(0, 4)}</span>,
                <span key="t" className="font-mono tabular-nums">{arr.length}</span>,
                ...Array.from({ length: maxMeses }, (_, i) => {
                  const k = arr.filter((p) => p >= i + 1).length;
                  const pct = Math.round((k / arr.length) * 100);
                  return (
                    <span key={i} className="font-mono tabular-nums" style={{ color: pct >= 80 ? "rgb(var(--ds-accent-c))" : pct >= 50 ? "rgb(var(--ds-attention-c))" : "rgb(var(--ds-danger-c))" }}>
                      {pct}% <span className="text-ds-text-3">({k})</span>
                    </span>
                  );
                }),
              ];
            })}
          />
          <p className="text-caption text-ds-text-3">Mês que ainda não chegou para a turma aparece como queda: leia a coorte mais recente com esse desconto.</p>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <SectionHeader title="Plano anual: renovações" action={<span className="text-meta uppercase text-ds-text-3">{n(anuais.length)} pagos · {n(anualAbandonado)} boletos/pix não pagos</span>} />
        <Tabela
          colunas={["Aluno", "Valor", "Pago em", "Renova em", "Faltam"]}
          vazio="Nenhum anual pago ainda."
          linhas={anuais.map((a) => [
            <div key="a" className="min-w-0"><p className="truncate text-ds-text">{a.nome}</p><p className="truncate text-caption text-ds-text-3">{a.email}</p></div>,
            <span key="b" className="font-mono tabular-nums">{brl(a.valor)}</span>,
            <span key="c" className="font-mono tabular-nums">{dataCurta(a.pagoEm)}</span>,
            <span key="d" className="font-mono tabular-nums">{dataCurta(a.renova)}</span>,
            <span key="e" className={`font-mono tabular-nums ${a.dias <= 30 ? "text-ds-attention" : "text-ds-text-2"}`}>{a.dias} dias</span>,
          ])}
        />
      </section>
      <p className="text-caption text-ds-text-3">Fonte: Asaas, lido na hora (guardado por até 5 minutos).</p>
    </div>
  );
}
