"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveTurma } from "./actions";

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60";
const label = "block text-sm font-medium text-slate-300";
const hint = "text-xs text-slate-500";
const section = "text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500";

const DESC_MAX = 400;
const NOME_FALLBACK = "DriveData Academy";
const DESC_FALLBACK = "Acesso a todos os cursos, avaliações e certificados enquanto sua assinatura estiver ativa.";

// A página pública lê sub_price como número ("129.9"). Na tela o valor é editado em
// centavos, então ele sempre aparece formatado (129,90) em vez do número cru.
function toCents(stored: string) {
  const n = Number(stored || "0");
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}
function centsToBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function onlyDigits(s: string, max: number) {
  return s.replace(/\D/g, "").slice(0, max);
}
function fmtPhone(d: string) {
  if (d.length < 3) return d;
  if (d.length <= 11) {
    const rest = d.slice(2);
    const body = rest.length > 5 ? `${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}` : rest;
    return `(${d.slice(0, 2)}) ${body}`;
  }
  const cc = d.slice(0, d.length - 11);
  const ddd = d.slice(d.length - 11, d.length - 9);
  const rest = d.slice(d.length - 9);
  return `+${cc} (${ddd}) ${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`;
}

function Check({ ok, children, warn }: { ok: boolean; warn?: boolean; children: React.ReactNode }) {
  const tone = ok ? "text-brand-green" : warn ? "text-amber-300" : "text-slate-500";
  return (
    <li className="flex items-start gap-2.5 text-xs">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className={`mt-px shrink-0 ${tone}`}>
        {ok ? (
          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        )}
      </svg>
      <span className={ok ? "text-slate-300" : warn ? "text-amber-200" : "text-slate-400"}>{children}</span>
    </li>
  );
}

function SaveBar({ dirty, blocked }: { dirty: boolean; blocked: string | null }) {
  const { pending } = useFormStatus();
  return (
    <div className="sticky bottom-0 -mx-6 -mb-6 mt-2 flex flex-wrap items-center gap-3 rounded-b-2xl border-t border-white/10 bg-ink-900/95 px-6 py-4 backdrop-blur-md">
      <button
        disabled={pending || !!blocked || !dirty}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-7 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
      >
        {pending && (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="animate-spin">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
            <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )}
        {pending ? "Salvando…" : "Salvar alterações"}
      </button>
      {blocked ? (
        <span className="text-xs text-amber-300">{blocked}</span>
      ) : dirty ? (
        <span className="text-xs text-slate-400">Você tem alterações não salvas.</span>
      ) : (
        <span className="text-xs text-slate-500">Tudo salvo.</span>
      )}
    </div>
  );
}

export default function TurmaForm({
  initial,
  asaasOn,
  currentPrice,
}: {
  initial: Record<string, string>;
  asaasOn: boolean;
  currentPrice: number;
}) {
  const base = useMemo(
    () => ({
      open: initial.sales_open === "1",
      nome: initial.turma_nome || "",
      cents: toCents(initial.sub_price || String(currentPrice || "")),
      desc: initial.turma_descricao || "",
      zap: onlyDigits(initial.checkout_whatsapp || "", 13),
    }),
    [initial, currentPrice]
  );

  const [open, setOpen] = useState(base.open);
  const [nome, setNome] = useState(base.nome);
  const [cents, setCents] = useState(base.cents);
  const [desc, setDesc] = useState(base.desc);
  const [zap, setZap] = useState(base.zap);

  const dirty = open !== base.open || nome !== base.nome || cents !== base.cents || desc !== base.desc || zap !== base.zap;
  const zapOk = zap.length === 0 || (zap.length >= 10 && zap.length <= 13);
  const hasPrice = cents > 0;

  const blocked = !hasPrice && open ? "Defina o valor mensal para abrir as vendas." : !zapOk ? "WhatsApp incompleto." : null;

  const previewNome = nome.trim() || NOME_FALLBACK;
  const previewDesc = desc.trim() || DESC_FALLBACK;

  return (
    <form action={saveTurma} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="glass space-y-7 rounded-2xl border border-white/8 p-6">
        {/* Interruptor da venda */}
        <div
          className={`rounded-xl border p-4 transition-colors ${
            open ? "border-brand-green/40 bg-brand-green/[0.07]" : "border-white/10 bg-white/[0.02]"
          }`}
        >
          <label className="flex cursor-pointer items-start justify-between gap-4">
            <span>
              <span className="block text-sm font-semibold text-white">Vendas abertas</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">
                {open
                  ? "A página /matricula está no ar aceitando novas assinaturas."
                  : "O visitante vê “inscrições fechadas” e o convite para a lista de espera."}
              </span>
            </span>
            <span className="relative mt-0.5 shrink-0">
              <input
                type="checkbox"
                name="sales_open"
                checked={open}
                onChange={(e) => setOpen(e.target.checked)}
                className="peer sr-only"
              />
              <span className="block h-6 w-11 rounded-full bg-white/15 transition-colors peer-checked:bg-brand-green peer-focus-visible:ring-2 peer-focus-visible:ring-brand-green/50" />
              <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
            </span>
          </label>

          {open && !hasPrice && (
            <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
              Sem valor mensal o checkout falha e o aluno vê “a assinatura ainda não foi configurada”. Preencha o valor abaixo.
            </p>
          )}
        </div>

        {/* Oferta */}
        <div className="space-y-4">
          <p className={section}>Oferta</p>

          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <div className="space-y-1.5">
              <label className={label} htmlFor="turma_nome">Nome do plano</label>
              <input
                id="turma_nome"
                name="turma_nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder={NOME_FALLBACK}
                maxLength={80}
                className={field}
              />
              <p className={hint}>Título grande da página de assinatura.</p>
            </div>

            <div className="space-y-1.5">
              <label className={label} htmlFor="sub_price">Valor mensal</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">R$</span>
                <input
                  id="sub_price"
                  name="sub_price"
                  value={cents ? centsToBRL(cents) : ""}
                  onChange={(e) => setCents(Number(onlyDigits(e.target.value, 9)) || 0)}
                  placeholder="0,00"
                  inputMode="numeric"
                  className={`${field} pl-10 tabular-nums`}
                />
              </div>
              <p className={hint}>Cobrado todo mês no cartão.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <label className={label} htmlFor="turma_descricao">Descrição curta</label>
              <span className={`text-xs tabular-nums ${desc.length > DESC_MAX ? "text-red-300" : "text-slate-500"}`}>
                {desc.length}/{DESC_MAX}
              </span>
            </div>
            <textarea
              id="turma_descricao"
              name="turma_descricao"
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value.slice(0, DESC_MAX))}
              placeholder={DESC_FALLBACK}
              className={`${field} resize-y`}
            />
            <p className={hint}>Aparece embaixo do título. Vazio, usamos o texto padrão.</p>
          </div>
        </div>

        {/* Pagamento */}
        <div className="space-y-4 border-t border-white/8 pt-6">
          <p className={section}>Pagamento</p>

          <div
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-xs leading-relaxed ${
              asaasOn ? "border-brand-green/25 bg-brand-green/[0.06] text-slate-300" : "border-amber-400/30 bg-amber-400/10 text-amber-100"
            }`}
          >
            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${asaasOn ? "bg-brand-green" : "bg-amber-400"}`} />
            <span>
              <span className="block font-semibold text-white">
                {asaasOn ? "Cobrança automática ligada (Asaas)" : "Cobrança automática desligada"}
              </span>
              {asaasOn
                ? "A matrícula gera a assinatura no cartão e o acesso é liberado sozinho quando o pagamento confirma."
                : "A matrícula só registra o pedido e manda o aluno para o WhatsApp. Você libera o acesso na aba Acessos depois de confirmar o pagamento."}
            </span>
          </div>

          <div className="space-y-1.5">
            <label className={label} htmlFor="checkout_whatsapp">WhatsApp de contato</label>
            <input
              id="checkout_whatsapp"
              name="checkout_whatsapp"
              value={fmtPhone(zap)}
              onChange={(e) => setZap(onlyDigits(e.target.value, 13))}
              placeholder="+55 (35) 99999-9999"
              inputMode="numeric"
              className={`${field} ${zapOk ? "" : "border-red-400/50"}`}
            />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className={hint}>
                {asaasOn ? "Plano B: usado se a cobrança automática cair." : "Obrigatório: é para cá que o aluno é enviado."}
              </p>
              {!zapOk && <span className="text-xs text-red-300">Faltam dígitos (DDD + número).</span>}
              {zapOk && zap.length >= 10 && (
                <a
                  href={`https://wa.me/${zap}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-brand-teal hover:underline"
                >
                  testar conversa
                </a>
              )}
            </div>
          </div>
        </div>

        <SaveBar dirty={dirty} blocked={blocked} />
      </div>

      {/* Coluna lateral: prévia + checklist */}
      <aside className="space-y-4 lg:sticky lg:top-6">
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <p className={`${section} mb-3`}>Como o aluno vê</p>

          {open ? (
            <div className="rounded-xl border border-white/10 bg-ink-900/60 p-4">
              <p className="text-[0.65rem] font-medium uppercase tracking-wide text-brand-green">Assinatura</p>
              <p className="mt-1 font-display text-lg font-bold leading-tight text-white">{previewNome}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{previewDesc}</p>
              <div className="mt-4 rounded-lg border border-white/10 bg-gradient-to-r from-brand-green/[0.10] to-transparent px-3 py-2.5">
                <span className="block text-[0.65rem] uppercase tracking-wide text-slate-400">Assinatura mensal</span>
                {hasPrice ? (
                  <span className="font-display text-xl font-bold text-white">
                    R$ {centsToBRL(cents)}
                    <span className="text-xs font-normal text-slate-400">/mês</span>
                  </span>
                ) : (
                  <span className="text-xs text-amber-300">preço não definido, o bloco some da página</span>
                )}
                <span className="mt-0.5 block text-[0.65rem] text-brand-teal">no cartão · cancele quando quiser</span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-ink-900/60 px-4 py-8 text-center">
              <p className="text-[0.65rem] font-medium uppercase tracking-wide text-brand-green">Matrículas</p>
              <p className="mt-1 font-display text-base font-bold text-white">Inscrições fechadas no momento</p>
              <p className="mt-2 text-xs text-slate-400">Entre na lista de espera e avisamos assim que abrir.</p>
            </div>
          )}
          <p className="mt-3 text-[0.7rem] text-slate-500">Prévia do topo de /matricula. Atualiza enquanto você digita.</p>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <p className={`${section} mb-3`}>Pronto para vender</p>
          <ul className="space-y-2">
            <Check ok={hasPrice}>Valor mensal definido</Check>
            <Check ok={asaasOn} warn={!asaasOn}>Cobrança automática (Asaas) ativa</Check>
            <Check ok={zap.length >= 10 && zapOk} warn={!asaasOn && zap.length < 10}>WhatsApp de contato</Check>
            <Check ok={open}>Vendas abertas</Check>
          </ul>
        </div>
      </aside>
    </form>
  );
}
