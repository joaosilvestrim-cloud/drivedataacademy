import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { caLista, caPost, config, ligado } from "@/lib/conta-azul";

/* Transforma uma cobrança paga do Asaas numa venda no Conta Azul.

   O contrato da API está em docs/CONTA-AZUL-API.md, e ele não é o que a
   documentação oficial diz. Em especial: o endpoint é /v1/venda no singular,
   e a condição de pagamento quer o texto "À vista", com acento.

   A unidade aqui é a COBRANÇA, não o pedido. A assinatura reusa o mesmo
   pedido todo mês, então marcar o pedido faria a receita recorrente sumir a
   partir do segundo mês. */

const ASAAS = process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";

export type CobrancaParaCA = {
  paymentId: string;
  orderId?: string | null;
  valor: number;
  /* Data em que o dinheiro entrou. Vira a data da venda e o vencimento da
     parcela: a competência tem que ser a do recebimento, não a de hoje, senão
     o backfill joga meses antigos todos para o mês corrente. */
  pagoEm: string;
  cliente: { nome: string; documento: string; email?: string | null; telefone?: string | null };
  descricao?: string | null;
};

// ------------------------------------------------------------------- CPF

/* A Conta Azul aceita CPF inventado sem reclamar. Descobri criando um por
   engano numa sondagem, e ele entrou no cadastro de verdade.

   Documento errado não fica só feio no ERP: ele vai para a nota fiscal, e aí
   o problema é da prefeitura. Então a validação é aqui. */
export function documentoValido(bruto: string): boolean {
  const d = (bruto || "").replace(/\D/g, "");
  if (d.length === 11) return cpfValido(d);
  if (d.length === 14) return cnpjValido(d);
  return false;
}

function cpfValido(c: string): boolean {
  if (/^(\d)\1{10}$/.test(c)) return false;
  for (const [ate, pos] of [[9, 10], [10, 11]] as const) {
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(c[i]) * (pos - i);
    const dig = (soma * 10) % 11 % 10;
    if (dig !== Number(c[ate])) return false;
  }
  return true;
}

function cnpjValido(c: string): boolean {
  if (/^(\d)\1{13}$/.test(c)) return false;
  for (const tamanho of [12, 13]) {
    let soma = 0;
    let peso = tamanho - 7;
    for (let i = 0; i < tamanho; i++) {
      soma += Number(c[i]) * peso;
      peso = peso - 1 < 2 ? 9 : peso - 1;
    }
    const dig = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (dig !== Number(c[tamanho])) return false;
  }
  return true;
}

// ---------------------------------------------------------------- numero

/* O número da venda.

   Não existe GET de venda na API, então não dá para perguntar onde a
   numeração está: a Academy guarda o próprio contador. O valor inicial saiu
   do painel, onde a tela de nova venda mostra o próximo número.

   O incremento é por troca condicional. Dois webhooks simultâneos leem o
   mesmo valor, os dois tentam gravar, e só o primeiro casa com o `valor`
   antigo. O segundo relê e pega o número seguinte, em vez de os dois
   mandarem a mesma numeração e a Conta Azul recusar uma. */
async function proximoNumero(): Promise<number> {
  const admin = createAdminClient();
  for (let tentativa = 0; tentativa < 8; tentativa++) {
    const { data } = await admin
      .from("integracao_config")
      .select("valor")
      .eq("chave", "ca_proximo_numero")
      .maybeSingle();

    const atual = Number(data?.valor || 0);
    if (!atual) throw new Error("ca_proximo_numero não está configurado.");

    const { data: gravou } = await admin
      .from("integracao_config")
      .update({ valor: String(atual + 1), atualizado: new Date().toISOString() })
      .eq("chave", "ca_proximo_numero")
      .eq("valor", String(atual))
      .select("chave");

    if (gravou?.length) return atual;
  }
  throw new Error("não consegui reservar um número de venda: disputa demais no contador.");
}

// ---------------------------------------------------------------- pessoa

/* Acha o cliente pelo documento, ou cria.

   A busca por documento funciona; por e-mail não. Sem essa procura, cada
   mensalidade criaria um cadastro novo do mesmo aluno. */
export async function acharOuCriarPessoa(c: CobrancaParaCA["cliente"]): Promise<string> {
  const doc = (c.documento || "").replace(/\D/g, "");
  if (!documentoValido(doc)) throw new Error(`documento inválido: ${c.documento || "(vazio)"}`);

  const { itens } = await caLista<any>("/v1/pessoas", { tamanho_pagina: 10, busca: doc });
  const achado = itens.find((p) => (p.documento || "").replace(/\D/g, "") === doc);
  if (achado?.id) return achado.id;

  const criada = await caPost<any>("/v1/pessoas", {
    tipo_pessoa: doc.length === 14 ? "Jurídica" : "Física",
    nome: (c.nome || "").trim().slice(0, 120) || `Aluno ${doc.slice(0, 6)}`,
    documento: doc,
    // Array de objeto, não de string. A mensagem de erro da API só revela
    // isso depois de alguns palpites.
    perfis: [{ tipo_perfil: "Cliente" }],
    ...(c.email ? { email: c.email.toLowerCase().slice(0, 120) } : {}),
    ...(c.telefone ? { telefone: c.telefone.replace(/\D/g, "").slice(0, 15) } : {}),
  });

  if (!criada?.id) throw new Error("a Conta Azul criou a pessoa mas não devolveu o id");
  return criada.id;
}

// ----------------------------------------------------------------- venda

/* Cria a venda de uma cobrança. Idempotente pela cobrança do Asaas.

   A ordem importa. A linha em ca_venda nasce ANTES do POST, funcionando como
   reserva: se dois processos pegarem a mesma cobrança, o segundo esbarra na
   chave primária e desiste. Como a API não tem endpoint para apagar venda,
   é melhor uma reserva a mais do que uma venda duplicada. */
export async function enviarCobranca(c: CobrancaParaCA): Promise<{ ok: boolean; vendaId?: string; erro?: string }> {
  const admin = createAdminClient();

  const { data: jaTem } = await admin
    .from("ca_venda")
    .select("venda_id, erro")
    .eq("asaas_payment_id", c.paymentId)
    .maybeSingle();
  if (jaTem?.venda_id) return { ok: true, vendaId: jaTem.venda_id };

  if (!jaTem) {
    const { error } = await admin.from("ca_venda").insert({
      asaas_payment_id: c.paymentId,
      order_id: c.orderId ?? null,
      valor: c.valor,
      competencia: c.pagoEm.slice(0, 10),
    });
    if (error) return { ok: false, erro: "outra execução já pegou esta cobrança" };
  }

  const falhar = async (erro: string) => {
    await admin.from("ca_venda").update({ erro: erro.slice(0, 500) }).eq("asaas_payment_id", c.paymentId);
    return { ok: false as const, erro };
  };

  try {
    const cfg = await config();
    if (!cfg.ca_categoria_id || !cfg.ca_servico_id) return falhar("categoria ou serviço não configurados");

    const pessoaId = await acharOuCriarPessoa(c.cliente);
    const numero = await proximoNumero();
    const dia = c.pagoEm.slice(0, 10);
    const valor = Number(c.valor.toFixed(2));

    const venda = await caPost<any>("/v1/venda", {
      id_cliente: pessoaId,
      numero,
      situacao: "APROVADO",
      data_venda: dia,
      id_categoria: cfg.ca_categoria_id,
      ...(cfg.ca_centro_custo_id ? { id_centro_custo: cfg.ca_centro_custo_id } : {}),
      ...(c.descricao ? { observacoes: c.descricao.slice(0, 400) } : {}),
      itens: [{ id: cfg.ca_servico_id, quantidade: 1, valor, ...(c.descricao ? { descricao: c.descricao.slice(0, 200) } : {}) }],
      condicao_pagamento: {
        // Texto, com acento. Código como A_VISTA é recusado.
        opcao_condicao_pagamento: "À vista",
        parcelas: [{ data_vencimento: dia, valor }],
      },
    });

    const vendaId = String(venda?.id ?? venda?.id_venda ?? "");
    await admin
      .from("ca_venda")
      .update({ venda_id: vendaId || "sem-id", numero, pessoa_id: pessoaId, erro: null })
      .eq("asaas_payment_id", c.paymentId);

    return { ok: true, vendaId };
  } catch (e) {
    return falhar((e as Error).message);
  }
}

/* Chamado pelo webhook. Nunca deixa a contabilidade derrubar o aluno: se algo
   falhar aqui, o erro fica gravado em ca_venda para a tela de pendentes, e o
   webhook segue como se nada fosse. */
export async function enviarCobrancaDoWebhook(payment: any, orderId?: string | null): Promise<void> {
  try {
    if (!(await ligado())) return;
    const valor = Number(payment?.value ?? 0);
    if (!payment?.id || !(valor > 0)) return;

    const cliente = await clienteDoAsaas(payment.customer);
    if (!cliente) return;

    await enviarCobranca({
      paymentId: payment.id,
      orderId: orderId ?? null,
      valor,
      pagoEm: payment.paymentDate || payment.confirmedDate || payment.dateCreated || new Date().toISOString(),
      cliente,
      descricao: payment.description || null,
    });
  } catch (e) {
    console.warn("[ca] envio falhou, seguindo sem travar o webhook:", (e as Error).message);
  }
}

// -------------------------------------------------------------- backfill

export type Pendente = {
  paymentId: string;
  valor: number;
  pagoEm: string;
  nome: string;
  documento: string;
  email: string | null;
  telefone: string | null;
  descricao: string | null;
  orderId: string | null;
  motivo: string | null; // por que não dá para enviar, quando não dá
  erro: string | null; // falha da tentativa anterior
};

const PAGO = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH", "DUNNING_RECEIVED"]);

async function asaas<T>(caminho: string): Promise<T[]> {
  const chave = process.env.ASAAS_API_KEY;
  if (!chave) return [];
  const lista: T[] = [];
  for (let offset = 0; offset < 5000; offset += 100) {
    const sep = caminho.includes("?") ? "&" : "?";
    const r = await fetch(`${ASAAS}${caminho}${sep}limit=100&offset=${offset}`, {
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

/* O que já foi recebido e ainda não virou venda.

   A fonte é o Asaas, não a nossa tabela de pedidos, e isso não é detalhe. A
   assinatura reusa o mesmo pedido todo mês, então o banco daqui só conhece a
   última cobrança de cada aluno. O histórico mês a mês só existe lá. */
export async function cobrancasPendentes(): Promise<Pendente[]> {
  const admin = createAdminClient();

  const [pagamentos, clientes, { data: enviadas }, { data: pedidos }] = await Promise.all([
    asaas<any>("/payments"),
    asaas<any>("/customers"),
    admin.from("ca_venda").select("asaas_payment_id, venda_id, erro"),
    admin.from("orders").select("id, gateway_id"),
  ]);

  const porCliente = new Map(clientes.map((c) => [c.id, c]));
  const jaFoi = new Map((enviadas ?? []).map((e: any) => [e.asaas_payment_id, e]));
  const pedidoDe = new Map((pedidos ?? []).filter((o: any) => o.gateway_id).map((o: any) => [o.gateway_id, o.id]));

  const fora: Pendente[] = [];
  for (const p of pagamentos) {
    if (!PAGO.has(p.status)) continue;
    const registro = jaFoi.get(p.id);
    if (registro?.venda_id) continue; // já virou venda

    const c = porCliente.get(p.customer);
    const documento = (c?.cpfCnpj || "").replace(/\D/g, "");
    const valor = Number(p.value ?? 0);

    let motivo: string | null = null;
    if (!c) motivo = "cliente não encontrado no Asaas";
    else if (!documento) motivo = "cliente sem CPF no Asaas";
    else if (!documentoValido(documento)) motivo = "CPF do cliente não é válido";
    else if (!(valor > 0)) motivo = "valor zero";

    fora.push({
      paymentId: p.id,
      valor,
      pagoEm: p.paymentDate || p.confirmedDate || p.dateCreated || "",
      nome: c?.name || "(sem nome)",
      documento,
      email: c?.email || null,
      telefone: c?.mobilePhone || c?.phone || null,
      descricao: p.description || null,
      orderId: pedidoDe.get(p.id) ?? null,
      motivo,
      erro: registro?.erro ?? null,
    });
  }

  fora.sort((a, b) => (a.pagoEm < b.pagoEm ? 1 : -1));
  return fora;
}

/* Envia um lote do que está pendente.

   O teto existe porque a API da Conta Azul limita vazão e porque uma tela de
   admin não pode ficar dez minutos girando. Rodar de novo continua de onde
   parou, já que a idempotência é por cobrança. */
export async function enviarPendentes(limite = 25): Promise<{ enviadas: number; falhas: number; puladas: number }> {
  const lista = await cobrancasPendentes();
  let enviadas = 0;
  let falhas = 0;
  let puladas = 0;

  for (const p of lista.slice(0, limite)) {
    if (p.motivo) {
      puladas++;
      continue;
    }
    const r = await enviarCobranca({
      paymentId: p.paymentId,
      orderId: p.orderId,
      valor: p.valor,
      pagoEm: p.pagoEm,
      cliente: { nome: p.nome, documento: p.documento, email: p.email, telefone: p.telefone },
      descricao: p.descricao,
    });
    if (r.ok) enviadas++;
    else falhas++;
  }

  return { enviadas, falhas, puladas };
}

/* O CPF não é guardado na Academy: ele é pedido no checkout, mandado ao Asaas
   e descartado. Buscar de lá na hora evita a plataforma passar a guardar dado
   sensível que já tem dono. */
export async function clienteDoAsaas(customerId: string): Promise<CobrancaParaCA["cliente"] | null> {
  const chave = process.env.ASAAS_API_KEY;
  if (!chave || !customerId) return null;
  const r = await fetch(`${ASAAS}/customers/${customerId}`, {
    headers: { access_token: chave, "User-Agent": "drivedata-academy" },
    cache: "no-store",
  });
  if (!r.ok) return null;
  const c = await r.json();
  return { nome: c.name || "", documento: c.cpfCnpj || "", email: c.email || null, telefone: c.mobilePhone || c.phone || null };
}
