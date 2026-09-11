import type { ReactNode } from "react";
import { Button } from "./primitives";

/* --------------------------------------------------------------------------
   Estruturas de página e estados.
   EmptyState consolida as 29 implementações próprias encontradas no código.
   -------------------------------------------------------------------------- */

const cx = (...p: (string | false | undefined | null)[]) => p.filter(Boolean).join(" ");

/* -------------------------------- PageHeader ------------------------------ */
// Nível 1 (contexto) e Nível 2 (ação) numa peça só, sem card.
export function PageHeader({
  context,
  title,
  lede,
  action,
  className,
}: {
  context?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cx("flex flex-wrap items-end justify-between gap-x-8 gap-y-4", className)}>
      <div className="min-w-0 max-w-2xl">
        {context && <p className="text-meta uppercase text-ds-text-3">{context}</p>}
        <h1 className="mt-2 text-balance font-display text-title font-semibold text-ds-text">{title}</h1>
        {lede && <p className="mt-2 text-body text-ds-text-2">{lede}</p>}
      </div>
      {action}
    </header>
  );
}

/* ------------------------------ SectionHeader ----------------------------- */
// Título de seção com régua. Substitui o eyebrow verde em caixa alta repetido
// em quase toda página, que já tinha perdido o efeito.
export function SectionHeader({
  title,
  meta,
  action,
  className,
}: {
  title: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-ds-line pb-2.5", className)}>
      <h2 className="font-display text-section font-semibold text-ds-text">{title}</h2>
      <div className="flex items-baseline gap-4">
        {meta && <span className="text-meta uppercase text-ds-text-3">{meta}</span>}
        {action}
      </div>
    </div>
  );
}

/* ------------------------------- EmptyState ------------------------------- */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("py-12", className)}>
      <p className="text-component font-medium text-ds-text">{title}</p>
      {description && <p className="mt-1.5 max-w-md text-body-sm text-ds-text-2">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* -------------------------------- ErrorState ------------------------------ */
export function ErrorState({
  title = "Não conseguimos carregar esta parte",
  description = "A falha foi do nosso lado. Tente de novo em alguns instantes.",
  retry,
}: {
  title?: string;
  description?: string;
  retry?: ReactNode;
}) {
  return (
    <div className="border-l-2 border-ds-danger py-3 pl-4" role="alert">
      <p className="text-label font-medium text-ds-text">{title}</p>
      <p className="mt-1 text-body-sm text-ds-text-2">{description}</p>
      {retry && <div className="mt-3">{retry}</div>}
    </div>
  );
}

/* ---------------------------------- Alert --------------------------------- */
// Faixa lateral em vez de caixa colorida: informa sem competir com o conteúdo.
const ALERT_TONE = {
  info: "border-ds-info",
  accent: "border-ds-accent",
  attention: "border-ds-attention",
  danger: "border-ds-danger",
} as const;

export function Alert({
  tone = "info",
  title,
  children,
  action,
}: {
  tone?: keyof typeof ALERT_TONE;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      className={cx("border-l-2 py-2.5 pl-4", ALERT_TONE[tone])}
      role={tone === "danger" ? "alert" : "status"}
    >
      {title && <p className="text-label font-medium text-ds-text">{title}</p>}
      <div className="text-body-sm text-ds-text-2">{children}</div>
      {action && <div className="mt-2.5">{action}</div>}
    </div>
  );
}

/* --------------------------- Primitivas de tabela ------------------------- */
// Base mínima para o segundo piloto no admin. A tabela sempre rola dentro do
// próprio contêiner, então a página nunca rola na horizontal.
export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[34rem] border-collapse">{children}</table>
    </div>
  );
}
export function Th({ children, className, numeric }: { children?: ReactNode; className?: string; numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cx(
        "border-b border-ds-line pb-2 pr-4 text-left text-meta font-medium uppercase text-ds-text-3",
        numeric && "text-right",
        className
      )}
    >
      {children}
    </th>
  );
}
export function Td({ children, className, numeric }: { children?: ReactNode; className?: string; numeric?: boolean }) {
  return (
    <td
      className={cx(
        "border-b border-ds-line-soft py-2.5 pr-4 align-top text-body-sm text-ds-text-2",
        numeric && "text-right font-mono tabular-nums text-ds-text",
        className
      )}
    >
      {children}
    </td>
  );
}

export { Button };
