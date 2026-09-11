"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check as CheckMark, Circle, Loader2 } from "lucide-react";
import { Button, ICON } from "@/components/ui/primitives";
import { Field, TextareaField, FormSection } from "@/components/ui/form";
import { Alert } from "@/components/ui/layout";
import { saveTurma } from "./actions";

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

// Item da checklist. O ícone tem função aqui: separa pronto de pendente sem
// depender só da cor, que é a regra do Design System para estado.
function Check({ ok, children, warn }: { ok: boolean; warn?: boolean; children: React.ReactNode }) {
  const Icone = ok ? CheckMark : Circle;
  const tone = ok ? "text-ds-accent" : warn ? "text-ds-attention" : "text-ds-text-3";
  return (
    <li className="flex items-start gap-2.5 text-caption">
      <Icone size={ICON.sm} strokeWidth={ICON.stroke} aria-hidden="true" className={`mt-0.5 shrink-0 ${tone}`} />
      <span className={ok ? "text-ds-text-2" : warn ? "text-ds-attention" : "text-ds-text-3"}>{children}</span>
      <span className="sr-only">{ok ? "pronto" : "pendente"}</span>
    </li>
  );
}

// Barra de ação fixa. Não é card: é régua no topo e o fundo da própria página,
// para o botão não sumir num formulário longo.
function SaveBar({ dirty, blocked }: { dirty: boolean; blocked: string | null }) {
  const { pending } = useFormStatus();
  return (
    <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-ds-line bg-ds-bg py-4">
      {/* O texto ao lado explica por que o botão está desligado. Vai por
          aria-describedby, e não por role="status": assim é lido quando a
          pessoa chega ao botão, sem anunciar a cada tecla digitada. */}
      <Button type="submit" disabled={pending || !!blocked || !dirty} aria-describedby="salvar-estado">
        {pending && <Loader2 size={ICON.sm} strokeWidth={ICON.stroke} aria-hidden="true" className="animate-spin" />}
        {pending ? "Salvando" : "Salvar alterações"}
      </Button>
      <span id="salvar-estado" className="text-caption text-ds-text-3">
        {blocked ? (
          <span className="text-ds-attention">{blocked}</span>
        ) : dirty ? (
          <span className="text-ds-text-2">Você tem alterações não salvas.</span>
        ) : (
          "Tudo salvo."
        )}
      </span>
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
  const restantes = DESC_MAX - desc.length;

  return (
    <form action={saveTurma} className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-8">
        {/* Interruptor da venda. Controle especializado de propósito: é o estado
            que governa a página pública inteira, então não vira mais uma caixa
            de seleção no meio da lista de campos. */}
        <div
          className={`rounded-srf border p-4 transition-colors duration-fast ease-ds ${
            open ? "border-ds-accent bg-ds-raised" : "border-ds-line"
          }`}
        >
          <label className="flex cursor-pointer items-start justify-between gap-4">
            <span>
              <span className="block text-body-sm font-medium text-ds-text">Vendas abertas</span>
              <span className="mt-0.5 block text-caption leading-relaxed text-ds-text-3">
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
              <span className="block h-6 w-11 rounded-full bg-ds-line transition-colors duration-fast ease-ds peer-checked:bg-ds-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--ds-focus)]" />
              <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-ds-text transition-transform duration-fast ease-ds peer-checked:translate-x-5 peer-checked:bg-ds-accent-ink" />
            </span>
          </label>

          {open && !hasPrice && (
            <div className="mt-3">
              <Alert tone="attention" title="Falta o valor mensal">
                Sem valor mensal o checkout falha e o aluno vê “a assinatura ainda não foi configurada”.
                Preencha o valor abaixo.
              </Alert>
            </div>
          )}
        </div>

        <FormSection title="Oferta">
          <div className="grid gap-4 tablet:grid-cols-[1fr_11rem]">
            <Field
              scope="assinatura"
              name="turma_nome"
              label="Nome do plano"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder={NOME_FALLBACK}
              maxLength={80}
              description="Título grande da página de assinatura."
            />
            <Field
              scope="assinatura"
              name="sub_price"
              label="Valor mensal"
              value={cents ? centsToBRL(cents) : ""}
              onChange={(e) => setCents(Number(onlyDigits(e.target.value, 9)) || 0)}
              placeholder="0,00"
              inputMode="numeric"
              description="Em reais, cobrado todo mês no cartão."
            />
          </div>

          <TextareaField
            scope="assinatura"
            name="turma_descricao"
            label="Descrição curta"
            rows={3}
            value={desc}
            onChange={(e) => setDesc(e.target.value.slice(0, DESC_MAX))}
            placeholder={DESC_FALLBACK}
            description={`Aparece embaixo do título. Em branco, usamos o texto padrão. Restam ${restantes} de ${DESC_MAX} caracteres.`}
          />
        </FormSection>

        <FormSection title="Pagamento">
          <Alert
            tone={asaasOn ? "accent" : "attention"}
            title={asaasOn ? "Cobrança automática ligada (Asaas)" : "Cobrança automática desligada"}
          >
            {asaasOn
              ? "A matrícula gera a assinatura no cartão e o acesso é liberado sozinho quando o pagamento confirma."
              : "A matrícula só registra o pedido e manda o aluno para o WhatsApp. Você libera o acesso na aba Acessos depois de confirmar o pagamento."}
          </Alert>

          <Field
            scope="assinatura"
            name="checkout_whatsapp"
            label="WhatsApp de contato"
            value={fmtPhone(zap)}
            onChange={(e) => setZap(onlyDigits(e.target.value, 13))}
            placeholder="+55 (35) 99999-9999"
            inputMode="numeric"
            error={zapOk ? undefined : "Faltam dígitos. Informe DDD e número."}
            description={asaasOn ? "Plano B: usado se a cobrança automática cair." : "Obrigatório: é para cá que o aluno é enviado."}
          />
          {zapOk && zap.length >= 10 && (
            <p className="text-caption">
              <a
                href={`https://wa.me/${zap}`}
                target="_blank"
                rel="noreferrer"
                className="text-ds-info underline decoration-ds-line underline-offset-4 hover:decoration-ds-info"
              >
                testar conversa no WhatsApp
              </a>
            </p>
          )}
        </FormSection>

        <SaveBar dirty={dirty} blocked={blocked} />
      </div>

      {/* Coluna lateral: prévia e checklist. A prévia reproduz o topo de
          /matricula, que ainda é página legada, então ela imita o que está no ar
          e não o Design System. */}
      <aside className="flex flex-col gap-8 lg:sticky lg:top-6">
        <section className="flex flex-col gap-3">
          <h2 className="border-b border-ds-line pb-2 font-display text-component font-semibold text-ds-text">
            Como o aluno vê
          </h2>

          {open ? (
            <div className="rounded-srf border border-ds-line bg-ds-surface p-4">
              <p className="font-mono text-meta uppercase text-ds-accent">Assinatura</p>
              <p className="mt-1 font-display text-title font-semibold leading-tight text-ds-text">{previewNome}</p>
              <p className="mt-2 text-caption leading-relaxed text-ds-text-3">{previewDesc}</p>
              <div className="mt-4 border-l-2 border-ds-accent py-1.5 pl-3">
                <span className="block text-meta uppercase text-ds-text-3">Assinatura mensal</span>
                {hasPrice ? (
                  <span className="block font-display text-data font-semibold tabular-nums text-ds-text">
                    R$ {centsToBRL(cents)}
                    <span className="text-caption font-normal text-ds-text-3">/mês</span>
                  </span>
                ) : (
                  <span className="block text-caption text-ds-attention">preço não definido, o bloco some da página</span>
                )}
                <span className="mt-0.5 block text-meta text-ds-text-3">no cartão · cancele quando quiser</span>
              </div>
            </div>
          ) : (
            <div className="rounded-srf border border-ds-line bg-ds-surface px-4 py-8 text-center">
              <p className="font-mono text-meta uppercase text-ds-accent">Matrículas</p>
              <p className="mt-1 font-display text-component font-semibold text-ds-text">Inscrições fechadas no momento</p>
              <p className="mt-2 text-caption text-ds-text-3">Entre na lista de espera e avisamos assim que abrir.</p>
            </div>
          )}
          <p className="text-caption text-ds-text-3">Prévia do topo de /matricula. Atualiza enquanto você digita.</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="border-b border-ds-line pb-2 font-display text-component font-semibold text-ds-text">
            Pronto para vender
          </h2>
          <ul className="flex flex-col gap-2">
            <Check ok={hasPrice}>Valor mensal definido</Check>
            <Check ok={asaasOn} warn={!asaasOn}>Cobrança automática (Asaas) ativa</Check>
            <Check ok={zap.length >= 10 && zapOk} warn={!asaasOn && zap.length < 10}>WhatsApp de contato</Check>
            <Check ok={open}>Vendas abertas</Check>
          </ul>
        </section>
      </aside>
    </form>
  );
}
