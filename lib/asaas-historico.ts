import "server-only";
import { unstable_cache } from "next/cache";

/* Histórico de cobranças direto do Asaas.

   O banco da Academy guarda um pedido por assinatura e só atualiza ele a cada
   mensalidade paga: não sobra rastro mês a mês. O Asaas guarda cada cobrança,
   paga, pendente ou atrasada. Para responder "quem pagou uma vez e parou", a
   fonte é ele. Leitura só, guardada 5 minutos para o painel abrir rápido. */

const BASE = process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";

export type Cobranca = {
  id: string;
  cliente: string;
  assinatura: string | null;
  valor: number;
  status: string;
  vencimento: string;
  pagoEm: string | null;
  ref: string;
};
export type Assinatura = { id: string; cliente: string; valor: number; status: string; ciclo: string; proxima: string | null; excluida: boolean };
export type Cliente = { id: string; nome: string; email: string };

async function todas<T>(caminho: string, chave: string): Promise<T[]> {
  const lista: T[] = [];
  for (let offset = 0; offset < 5000; offset += 100) {
    const sep = caminho.includes("?") ? "&" : "?";
    const r = await fetch(`${BASE}${caminho}${sep}limit=100&offset=${offset}`, {
      headers: { access_token: chave, "User-Agent": "drivedata-academy" },
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`Asaas respondeu ${r.status} em ${caminho}`);
    const j = await r.json();
    lista.push(...(j.data ?? []));
    if (!j.hasMore) break;
  }
  return lista;
}

export const PAGO = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH", "DUNNING_RECEIVED"]);

export const historicoAsaas = unstable_cache(
  async () => {
    const chave = process.env.ASAAS_API_KEY;
    if (!chave) throw new Error("ASAAS_API_KEY não configurada.");
    const [pagamentos, assinaturas, clientes] = await Promise.all([
      todas<any>("/payments", chave),
      todas<any>("/subscriptions?includeDeleted=true", chave),
      todas<any>("/customers", chave),
    ]);
    return {
      cobrancas: pagamentos.map((p): Cobranca => ({
        id: p.id,
        cliente: p.customer,
        assinatura: p.subscription ?? null,
        valor: Number(p.value) || 0,
        status: p.status,
        vencimento: p.dueDate,
        pagoEm: p.clientPaymentDate || p.paymentDate || p.confirmedDate || null,
        ref: p.externalReference || "",
      })),
      assinaturas: assinaturas.map((a): Assinatura => ({
        id: a.id,
        cliente: a.customer,
        valor: Number(a.value) || 0,
        status: a.status,
        ciclo: a.cycle,
        proxima: a.nextDueDate ?? null,
        excluida: !!a.deleted,
      })),
      clientes: clientes.map((c): Cliente => ({ id: c.id, nome: c.name || "", email: (c.email || "").toLowerCase() })),
      lidoEm: new Date().toISOString(),
    };
  },
  ["asaas-historico-v1"],
  { revalidate: 300 }
);
