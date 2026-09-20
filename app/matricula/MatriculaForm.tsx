"use client";

import { usarTraducao } from "@/lib/i18n/usarTraducao";

import { useEffect, useState } from "react";
import { createMatricula, previewCupom, type MatriculaResult, type PreviaCupom } from "./actions";

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";
const rotulo = "mb-1.5 block text-sm font-medium text-slate-300";
const dica = "mt-1 block text-xs text-slate-500";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Etapa({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-white/10 text-[0.65rem] text-white">{n}</span>
        {titulo}
      </legend>
      {children}
    </fieldset>
  );
}

export default function MatriculaForm({
  turmaNome = "DriveData Academy",
  mensal = 0,
  anual = 0,
  desconto = 0,
}: {
  turmaNome?: string;
  mensal?: number;
  anual?: number;
  desconto?: number;
}) {
  const tr = usarTraducao();
  const [result, setResult] = useState<MatriculaResult | null>(null);
  // Sem anual configurado a escolha nem aparece e tudo segue como mensal.
  const [plano, setPlano] = useState<"mensal" | "anual">(anual > 0 ? "anual" : "mensal");
  // Anual aceita só Pix ou cartão. Boleto ficou de fora de propósito.
  const [forma, setForma] = useState<"pix" | "cartao">("pix");
  const [loading, setLoading] = useState(false);
  const [cupomTexto, setCupomTexto] = useState("");
  const [cupom, setCupom] = useState<Extract<PreviaCupom, { ok: true }> | null>(null);
  const [erroCupom, setErroCupom] = useState("");
  const [aplicando, setAplicando] = useState(false);
  // Tela de transição antes do Asaas: explica o que acontece depois de pagar.
  const [indo, setIndo] = useState<{ url: string; email: string } | null>(null);
  const [segundos, setSegundos] = useState(8);

  useEffect(() => {
    if (!indo) return;
    if (segundos <= 0) {
      window.location.href = indo.url;
      return;
    }
    const t = setTimeout(() => setSegundos((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [indo, segundos]);

  async function aplicar(e: React.MouseEvent<HTMLButtonElement>) {
    const form = e.currentTarget.form;
    const email = form ? String(new FormData(form).get("email") || "") : "";
    setAplicando(true);
    setErroCupom("");
    const r = await previewCupom(cupomTexto, plano, email);
    setAplicando(false);
    if (r.ok) setCupom(r);
    else {
      setCupom(null);
      setErroCupom(r.erro);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const dados = new FormData(e.currentTarget);
    const res = await createMatricula(dados);
    setResult(res);
    setLoading(false);
    if (res.ok && res.mode === "asaas") {
      setSegundos(8);
      setIndo({ url: res.url, email: String(dados.get("email") || "").trim().toLowerCase() });
    }
  }

  if (indo) {
    const pix = plano === "anual" && forma === "pix";
    return (
      <div className="text-center" role="status">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-green/15 text-brand-green">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <p className="mt-4 font-display text-2xl font-bold text-white">{tr("Pedido registrado")}</p>
        <p className="mt-1 text-sm text-slate-300">{tr("Falta só pagar. Veja o que acontece a seguir:")}</p>

        <ol className="mt-6 space-y-3 text-left">
          {[
            { t: tr("Pague na página do Asaas"), d: pix ? tr("Copie o código Pix ou leia o QR Code no app do seu banco.") : tr("Informe os dados do cartão na página segura do Asaas.") },
            { t: tr("Receba o código de acesso"), d: <>{tr("Enviamos para")} <b className="text-white">{indo.email}</b> {tr("assim que o pagamento confirmar. Olhe também o lixo eletrônico.")}</> },
            { t: tr("Crie sua senha"), d: tr("Clique em Criar minha senha no e-mail, digite o código e escolha a senha.") },
          ].map((s, i) => (
            <li key={i} className="flex gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-green to-brand-blue text-xs font-bold text-ink-900">{i + 1}</span>
              <span>
                <span className="block text-sm font-semibold text-white">{s.t}</span>
                <span className="block text-xs text-slate-400">{s.d}</span>
              </span>
            </li>
          ))}
        </ol>

        <a href={indo.url} className="mt-6 block w-full rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
          {tr("Ir para o pagamento agora")}
        </a>
        <p className="mt-2 text-xs text-slate-500">{tr("Abrindo sozinho em")} {Math.max(segundos, 0)}s.</p>
      </div>
    );
  }

  if (result?.ok && result.mode === "manual") {
    const digits = (result.whatsapp || "").replace(/\D/g, "");
    const msg = encodeURIComponent(`Olá! Quero assinar a ${turmaNome}.`);
    return (
      <div className="rounded-2xl border border-brand-green/30 bg-brand-green/10 p-6 text-center">
        <p className="text-lg font-semibold text-white">{tr("Recebemos seu pedido!")}</p>
        <p className="mt-2 text-sm text-slate-300">{tr("Fale com a gente pelo WhatsApp pra finalizar a assinatura. Sua conta é criada assim que o pagamento é confirmado.")}</p>
        {digits && (
          <a href={`https://wa.me/${digits}?text=${msg}`} target="_blank" rel="noreferrer" className="mt-5 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900">{tr("Falar no WhatsApp")}</a>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-7">
      <input type="hidden" name="plano" value={plano} />
      <input type="hidden" name="forma" value={forma} />
      <input type="hidden" name="cupom" value={cupom?.codigo || ""} />

      <Etapa n={1} titulo={tr("Plano e pagamento")}>
        {anual > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {([
              { k: "anual" as const, titulo: "Anual", valor: brl(anual), nota: `${desconto}% OFF · pagamento único` },
              { k: "mensal" as const, titulo: "Mensal", valor: `${brl(mensal)}/mês`, nota: tr("no cartão · cancele quando quiser") },
            ]).map((p) => {
              const ativo = plano === p.k;
              return (
                <label
                  key={p.k}
                  className={`relative cursor-pointer rounded-xl border px-3 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-green/60 ${ativo ? "border-brand-green/60 bg-brand-green/10" : "border-white/10 bg-white/[0.03] hover:border-white/25"}`}
                >
                  <input type="radio" name="plano_ui" value={p.k} checked={ativo} onChange={() => { setPlano(p.k); setCupom(null); setErroCupom(""); }} className="sr-only" />
                  {p.k === "anual" && (
                    <span className="absolute -top-2.5 right-2 rounded-full bg-gradient-to-r from-brand-green to-brand-blue px-2 py-0.5 text-[0.6rem] font-bold uppercase text-ink-900">{tr("Mais vantajoso")}</span>
                  )}
                  <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{p.titulo}</span>
                  <span className="block font-display text-lg font-bold text-white">{p.valor}</span>
                  <span className="block text-[0.7rem] text-brand-teal">{p.nota}</span>
                </label>
              );
            })}
          </div>
        )}
        {plano === "anual" ? (
          <div className="flex flex-wrap items-center gap-2">
            {([
              { k: "pix" as const, rotulo: "Pix", nota: tr("confirma na hora") },
              { k: "cartao" as const, rotulo: tr("Cartão de crédito"), nota: tr("à vista") },
            ]).map((f) => {
              const ativo = forma === f.k;
              return (
                <label
                  key={f.k}
                  className={`cursor-pointer rounded-xl border px-4 py-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-green/60 ${ativo ? "border-brand-green/60 bg-brand-green/10 text-white" : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25"}`}
                >
                  <input type="radio" name="forma_ui" value={f.k} checked={ativo} onChange={() => setForma(f.k)} className="sr-only" />
                  <span className="font-semibold">{f.rotulo}</span> <span className="text-xs text-slate-400">· {f.nota}</span>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-500">{tr("O mensal é cobrado no cartão de crédito, todo mês, até você cancelar.")}</p>
        )}
      </Etapa>

      <Etapa n={2} titulo={tr("Seus dados")}>
        <div>
          <label htmlFor="mat-name" className={rotulo}>{tr("Nome completo")}</label>
          <input id="mat-name" name="name" required autoComplete="name" placeholder={tr("Como vai aparecer no certificado")} className={field} />
        </div>
        <div>
          <label htmlFor="mat-email" className={rotulo}>{tr("E-mail")}</label>
          <input id="mat-email" name="email" type="email" required autoComplete="email" placeholder={tr("voce@email.com")} className={field} />
          <span className={dica}>{tr("Use o e-mail que você mais abre. É para ele que enviamos o código de acesso, e ele vira o seu login.")}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="mat-cpf" className={rotulo}>CPF</label>
            <input id="mat-cpf" name="cpf" required inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" className={field} />
            <span className={dica}>{tr("Exigido pelo Asaas para emitir a cobrança.")}</span>
          </div>
          <div>
            <label htmlFor="mat-phone" className={rotulo}>{tr("WhatsApp")} <span className="font-normal text-slate-500">(opcional)</span></label>
            <input id="mat-phone" name="phone" inputMode="tel" autoComplete="tel" placeholder="(11) 90000-0000" className={field} />
            <span className={dica}>{tr("Para avisos das lives.")}</span>
          </div>
        </div>

        <details className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2">
          <summary className="cursor-pointer text-sm text-slate-300">{tr("Endereço")} <span className="text-slate-500">(opcional)</span></summary>
          <div className="mt-3 space-y-3 pb-1">
            <div className="grid grid-cols-3 gap-3">
              <input name="cep" inputMode="numeric" aria-label="CEP" placeholder="CEP" className={field} />
              <input name="endereco" aria-label={tr("Endereço")} placeholder={tr("Endereço")} className={`${field} col-span-2`} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <input name="numero" aria-label={tr("Número")} placeholder={tr("Número")} className={field} />
              <input name="bairro" aria-label={tr("Bairro")} placeholder={tr("Bairro")} className={`${field} col-span-2`} />
            </div>
          </div>
        </details>
      </Etapa>

      <Etapa n={3} titulo={tr("Cupom e confirmação")}>
        {/* Cupom. O desconto mostrado vem do servidor e é conferido de novo ao pagar. */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <label htmlFor="cupom-codigo" className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{tr("Cupom de desconto")} <span className="normal-case tracking-normal text-slate-500">(opcional)</span></label>
          {cupom ? (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-200">
                <span className="font-mono font-semibold text-brand-green">{cupom.codigo}</span> aplicado: {cupom.rotulo}.{" "}
                {plano === "anual"
                  ? <>{tr("Você paga")} <b className="text-white">{brl(cupom.final)}</b> {tr("em vez de")} {brl(cupom.original)}.</>
                  : cupom.recorrente
                  ? <>{tr("Você paga")} <b className="text-white">{brl(cupom.final)}{tr("/mês")}</b> {tr("em vez de")} {brl(cupom.original)}.</>
                  : <>{tr("A 1ª mensalidade sai por")} <b className="text-white">{brl(cupom.final)}</b>, depois {brl(cupom.original)}{tr("/mês.")}</>}
              </p>
              <button type="button" onClick={() => { setCupom(null); setCupomTexto(""); }} className="text-xs text-slate-400 underline underline-offset-2 hover:text-white">{tr("remover")}</button>
            </div>
          ) : (
            <div className="mt-2 flex gap-2">
              <input
                id="cupom-codigo"
                value={cupomTexto}
                onChange={(e) => { setCupomTexto(e.target.value.toUpperCase()); setErroCupom(""); }}
                placeholder={tr("Tem um cupom? Digite aqui")}
                autoComplete="off"
                className={`${field} uppercase`}
              />
              <button
                type="button"
                onClick={aplicar}
                disabled={aplicando || !cupomTexto.trim()}
                className="shrink-0 rounded-xl border border-brand-green/50 px-4 text-sm font-semibold text-brand-green transition-colors hover:bg-brand-green/10 disabled:opacity-40"
              >
                {aplicando ? "..." : "Aplicar"}
              </button>
            </div>
          )}
          {erroCupom && <p className="mt-2 text-xs text-red-300" role="alert">{erroCupom}</p>}
        </div>

        {/* Resumo do que vai ser cobrado, antes do clique. */}
        <div className="rounded-xl border border-white/10 bg-ink-900/40 px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-400">{plano === "anual" ? `Plano anual · ${forma === "pix" ? "Pix" : "cartão"}` : tr("Plano mensal · cartão")}</span>
            <span className="font-display text-lg font-bold text-white">
              {plano === "anual" ? brl(cupom ? cupom.final : anual) : `${brl(cupom ? cupom.final : mensal)}${cupom && !cupom.recorrente ? tr("no 1º mês") : "/mês"}`}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {plano === "anual" ? tr("Cobrança única. Acesso por 12 meses a partir da confirmação.") : tr("Renova todo mês. Cancele quando quiser.")}
          </p>
        </div>

        {result && !result.ok && (
          <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">{result.error}</p>
        )}
        <button
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02] disabled:opacity-60"
        >
          {loading ? tr("Gerando pagamento...") : tr("Continuar para o pagamento")}
        </button>
        <p className="text-center text-xs text-slate-500">
          {tr("Depois de pagar, você recebe por e-mail um código para criar a senha. Não precisa criar conta antes.")}
        </p>
      </Etapa>
    </form>
  );
}
