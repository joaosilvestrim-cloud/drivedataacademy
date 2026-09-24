import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { caGet, config } from "@/lib/conta-azul";
import { desconectarContaAzul, salvarConfigCA, enviarPendentesCA, ignorarCobrancaCA } from "./actions";
import { cobrancasPendentes, type Pendente } from "@/lib/conta-azul-venda";

export const dynamic = "force-dynamic";

/* Integrações. Por ora só o Conta Azul, mas a tela já nasce com o nome no
   plural porque o Asaas e o Panda cabem aqui no dia que precisarem de algo
   além de chave no ambiente. */

type Opcao = { id: string; nome: string };

function fmt(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

/* O cadastro só é lido quando a conexão está de pé. Numa tela que também
   serve para diagnosticar conexão caída, deixar a leitura derrubar a página
   seria esconder justamente a informação que a pessoa veio buscar. */
async function cadastro(): Promise<{ ok: true; cat: Opcao[]; cc: Opcao[]; serv: Opcao[] } | { ok: false; erro: string }> {
  try {
    const [cats, ccs, servs] = await Promise.all([
      caGet<any>("/v1/categorias", { tamanho_pagina: 100 }),
      caGet<any>("/v1/centro-de-custo", { tamanho_pagina: 100 }),
      caGet<any>("/v1/servicos", { tamanho_pagina: 50 }),
    ]);
    const lista = (d: any) => (Array.isArray(d) ? d : d?.itens ?? d?.items ?? []);
    return {
      ok: true,
      cat: lista(cats)
        .filter((c: any) => c.tipo === "RECEITA")
        .map((c: any) => ({ id: c.id, nome: c.nome })),
      cc: lista(ccs)
        .filter((c: any) => c.ativo !== false)
        .map((c: any) => ({ id: c.id, nome: `${c.codigo} · ${c.nome}` })),
      serv: lista(servs).map((s: any) => ({
        id: s.id,
        nome: String(s.descricao || s.nome || "sem descrição").replace(/\s+/g, " ").slice(0, 70),
      })),
    };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

const campo =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none focus:border-brand-green/60";

function Seletor({ nome, label, opcoes, atual, ajuda }: { nome: string; label: string; opcoes: Opcao[]; atual: string; ajuda: string }) {
  const sumiu = atual && !opcoes.some((o) => o.id === atual);
  return (
    <label className="block">
      <span className="text-sm font-medium text-white">{label}</span>
      <select name={nome} defaultValue={atual} className={`mt-1.5 ${campo}`}>
        <option value="">Não definido</option>
        {opcoes.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nome}
          </option>
        ))}
        {/* Se o id guardado não está mais na lista, mostrar assim mesmo. Some
            da lista quando alguém apaga a categoria no Conta Azul, e sumir da
            tela em silêncio faria a venda falhar sem explicação. */}
        {sumiu && <option value={atual}>{atual} (não existe mais no Conta Azul)</option>}
      </select>
      <span className="mt-1 block text-xs text-slate-500">{ajuda}</span>
    </label>
  );
}

export default async function IntegracoesPage({ searchParams }: { searchParams: { ok?: string; erro?: string } }) {
  const admin = createAdminClient();
  const { data: conexao } = await admin.from("integracao_conta_azul").select("*").eq("id", 1).maybeSingle();
  const cfg = await config();
  const conectado = !!conexao?.refresh_token_enc;
  const dados = conectado ? await cadastro() : null;

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-white">Integrações</h1>
      <p className="mt-1 text-sm text-slate-400">
        Conexões com sistemas de fora. Cada venda paga no Asaas vira uma venda no Conta Azul, pronta para
        a nota ser emitida lá.
      </p>

      {searchParams.ok && (
        <p className="mt-5 rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-3 text-sm text-brand-green">{searchParams.ok}</p>
      )}
      {searchParams.erro && (
        <p className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{searchParams.erro}</p>
      )}

      <section className="glass mt-6 rounded-2xl border border-white/8 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Conta Azul</p>
            <p className="mt-0.5 text-xs text-slate-400">
              {conectado ? `Conectado em ${fmt(conexao!.conectado_em)}` : "Nunca conectado."}
              {conexao?.expira_em && conectado ? ` · token renova até ${fmt(conexao.expira_em)}` : ""}
            </p>
          </div>
          {conectado ? (
            <form action={desconectarContaAzul}>
              <button className="rounded-xl border border-white/12 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-red-400/50 hover:text-red-300">
                Desconectar
              </button>
            </form>
          ) : (
            <Link
              href="/api/oauth/conta-azul"
              className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]"
            >
              Conectar
            </Link>
          )}
        </div>

        {conexao?.ultimo_erro && (
          <p className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs text-amber-200">
            Última falha: {conexao.ultimo_erro}
          </p>
        )}

        {conectado && dados && !dados.ok && (
          <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
            Conectado, mas a API não respondeu: {dados.erro}
          </p>
        )}

        {conectado && dados?.ok && (
          <form action={salvarConfigCA} className="mt-6 space-y-4">
            <Seletor
              nome="ca_categoria_id"
              label="Categoria da receita"
              opcoes={dados.cat}
              atual={cfg.ca_categoria_id || ""}
              ajuda="Onde a venda entra no DRE. Só aparecem categorias do tipo receita."
            />
            <Seletor
              nome="ca_centro_custo_id"
              label="Centro de custo"
              opcoes={dados.cc}
              atual={cfg.ca_centro_custo_id || ""}
              ajuda="Opcional. Serve para separar o resultado da Academy do resto da empresa."
            />
            <Seletor
              nome="ca_servico_id"
              label="Serviço da nota"
              opcoes={dados.serv}
              atual={cfg.ca_servico_id || ""}
              ajuda="O item que vai na venda e na NFS-e. Precisa ser um serviço de ensino, com o código de tributação certo."
            />

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-4">
              <input type="checkbox" name="ca_ativo" defaultChecked={cfg.ca_ativo === "true"} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-green" />
              <span className="text-sm text-slate-300">
                Criar a venda no Conta Azul quando o pagamento confirmar
                <span className="mt-0.5 block text-xs text-slate-500">
                  Desligado, nada é enviado e o pagamento segue como sempre foi. A emissão da nota continua
                  sendo um clique dentro do Conta Azul: a API deles ainda não emite NFS-e.
                </span>
              </span>
            </label>

            <button className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
              Salvar
            </button>
          </form>
        )}
      </section>

      {conectado && <Pendentes />}
    </div>
  );
}

const dinheiro = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* O que já foi recebido e ainda não virou venda.

   A lista vem do Asaas, não da nossa tabela de pedidos. A assinatura reusa o
   mesmo pedido a cada renovação, então o banco daqui só conhece a última
   cobrança de cada aluno: o histórico mês a mês só existe lá. */
async function Pendentes() {
  let lista: Pendente[] = [];
  let erro: string | null = null;
  try {
    lista = await cobrancasPendentes();
  } catch (e) {
    erro = (e as Error).message;
  }

  const prontas = lista.filter((p) => !p.motivo);
  const travadas = lista.filter((p) => p.motivo);

  return (
    <section className="glass mt-6 rounded-2xl border border-white/8 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Já vendido, ainda não enviado</p>
          <p className="mt-0.5 text-xs text-slate-400">
            Cobranças pagas no Asaas que ainda não viraram venda no Conta Azul, inclusive as de antes
            desta integração existir.
          </p>
        </div>
        {prontas.length > 0 && (
          <form action={enviarPendentesCA}>
            <button className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
              Enviar {Math.min(prontas.length, 25)}
            </button>
          </form>
        )}
      </div>

      {erro && (
        <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          Não consegui listar: {erro}
        </p>
      )}

      {!erro && lista.length === 0 && (
        <p className="mt-4 text-sm text-slate-400">Nada pendente. Tudo que foi pago já está no Conta Azul.</p>
      )}

      {prontas.length > 0 && (
        <ul className="mt-4 divide-y divide-white/5 rounded-xl border border-white/8">
          {prontas.slice(0, 40).map((p) => (
            <li key={p.paymentId} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm">
              <span className="w-20 shrink-0 font-mono text-xs text-slate-500">{p.pagoEm.slice(0, 10)}</span>
              <span className="min-w-0 flex-1 truncate text-slate-200">{p.nome}</span>
              <span className="shrink-0 font-mono text-xs tabular-nums text-slate-300">{dinheiro(p.valor)}</span>
              <form action={ignorarCobrancaCA} className="shrink-0">
                <input type="hidden" name="payment_id" value={p.paymentId} />
                <input type="hidden" name="valor" value={p.valor} />
                <input type="hidden" name="competencia" value={p.pagoEm.slice(0, 10)} />
                <input type="hidden" name="motivo" value="Dispensada no painel" />
                <button
                  title="Nunca virar venda: teste, estorno, cobranca duplicada"
                  className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-400 transition-colors hover:border-amber-400/50 hover:text-amber-300"
                >
                  Dispensar
                </button>
              </form>
              {p.erro && <span className="w-full text-xs text-amber-300">tentativa anterior: {p.erro}</span>}
            </li>
          ))}
        </ul>
      )}

      {travadas.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">
            {travadas.length} não dá para enviar
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Falta dado no Asaas. Corrigir lá e recarregar esta página resolve.
          </p>
          <ul className="mt-3 space-y-1">
            {travadas.slice(0, 15).map((p) => (
              <li key={p.paymentId} className="flex flex-wrap gap-x-3 text-xs text-slate-400">
                <span className="font-mono text-slate-500">{p.pagoEm.slice(0, 10)}</span>
                <span className="min-w-0 flex-1 truncate text-slate-300">{p.nome}</span>
                <span className="text-amber-300">{p.motivo}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
