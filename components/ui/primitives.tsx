import Link from "next/link";
import type { ReactNode } from "react";

/* --------------------------------------------------------------------------
   Primitivas do Design System.
   Sem hooks de propósito: funcionam tanto em Server quanto em Client Component.
   Cada uma nasceu de um padrão contado no código, não de abstração especulativa.
   -------------------------------------------------------------------------- */

// Iconografia: lucide-react, traço 1.75, três tamanhos. Ícone só quando ajuda
// a reconhecer; nunca para enfeitar título.
export const ICON = { sm: 14, md: 16, lg: 18, stroke: 1.75 } as const;

const cx = (...parts: (string | false | undefined | null)[]) => parts.filter(Boolean).join(" ");

/* ---------------------------------- Button -------------------------------- */
// Substitui as 15 combinações de padding encontradas no botão primário.
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-ctl font-medium transition-colors duration-fast ease-ds disabled:cursor-not-allowed disabled:opacity-45";

const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-ds-accent text-ds-accent-ink hover:brightness-110",
  secondary: "border border-ds-line text-ds-text hover:border-ds-text-3 hover:bg-ds-raised",
  ghost: "text-ds-text-2 hover:bg-ds-raised hover:text-ds-text",
  danger: "border border-ds-danger/40 text-ds-danger hover:bg-ds-danger/10",
};

// Três tamanhos. O md respeita 40px de altura, que é o mínimo confortável de toque.
const BTN_SIZE: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-caption",
  md: "h-10 px-4 text-label",
  lg: "h-12 px-6 text-body-sm",
};

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  external?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export function Button({
  variant = "primary",
  size = "md",
  href,
  external,
  className,
  children,
  ...rest
}: ButtonProps) {
  const cls = cx(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], className);
  if (href) {
    return external ? (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {children}
      </a>
    ) : (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}

/* ---------------------------------- Surface ------------------------------- */
// Card deixa de ser padrão. Só existe quando representa uma unidade real de
// informação ou algo clicável. "flat" é o caminho normal: sem borda, sem fundo.
type SurfaceTone = "flat" | "outlined" | "raised";

const SURFACE: Record<SurfaceTone, string> = {
  flat: "",
  outlined: "rounded-srf border border-ds-line",
  raised: "rounded-srf border border-ds-line bg-ds-raised",
};

export function Surface({
  tone = "outlined",
  padded = true,
  className,
  children,
}: {
  tone?: SurfaceTone;
  padded?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return <div className={cx(SURFACE[tone], padded && "p-5", className)}>{children}</div>;
}

/* ---------------------------------- Divider ------------------------------- */
// A régua é a primeira ferramenta de separação, antes de card ou borda.
export function Divider({ className }: { className?: string }) {
  return <hr className={cx("border-0 border-t border-ds-line-soft", className)} />;
}

/* ----------------------------------- Badge -------------------------------- */
type BadgeTone = "neutral" | "accent" | "info" | "attention" | "danger";

const BADGE: Record<BadgeTone, string> = {
  neutral: "border-ds-line text-ds-text-2",
  accent: "border-ds-accent/35 text-ds-accent",
  info: "border-ds-info/35 text-ds-info",
  attention: "border-ds-attention/35 text-ds-attention",
  danger: "border-ds-danger/35 text-ds-danger",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-ctl border px-2 py-0.5 font-mono text-meta uppercase",
        BADGE[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ----------------------------------- Status ------------------------------- */
// Estado nunca depende só de cor: sempre acompanha rótulo e forma do ponto.
export function Status({
  tone = "neutral",
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  const dot: Record<BadgeTone, string> = {
    neutral: "bg-ds-text-3",
    accent: "bg-ds-accent",
    info: "bg-ds-info",
    attention: "bg-ds-attention",
    danger: "bg-ds-danger",
  };
  return (
    <span className="inline-flex items-center gap-2 text-caption text-ds-text-2">
      <span className={cx("h-1.5 w-1.5 rounded-full", dot[tone])} aria-hidden="true" />
      {children}
    </span>
  );
}

/* ---------------------------------- Skeleton ------------------------------ */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cx("animate-pulse rounded-ctl bg-ds-raised", className)}
      aria-hidden="true"
    />
  );
}
