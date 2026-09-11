import type { ReactNode } from "react";

/* --------------------------------------------------------------------------
   Campos de formulário.
   Consolida a constante `const field = …` que estava copiada em 36 arquivos.
   Sem hooks: serve formulário nativo com Server Action e formulário controlado.
   -------------------------------------------------------------------------- */

const cx = (...p: (string | false | undefined | null)[]) => p.filter(Boolean).join(" ");

// Altura 40px em todos os controles. Alvo de toque adequado no celular,
// que era um dos problemas apontados na auditoria.
const CONTROL =
  "w-full rounded-ctl border bg-ds-surface px-3 text-body text-ds-text placeholder:text-ds-text-3 transition-colors duration-fast ease-ds disabled:cursor-not-allowed disabled:opacity-50";
const OK = "border-ds-line hover:border-ds-text-3";
const BAD = "border-ds-danger";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-label font-medium text-ds-text-2">
        {label}
        {required && <span className="ml-1 text-ds-danger">*</span>}
      </label>
      {children}
      {/* Erro nunca depende só da cor: vem com texto e é anunciado. */}
      {error ? (
        <p role="alert" className="text-caption text-ds-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-caption text-ds-text-3">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({
  invalid,
  className,
  ...rest
}: { invalid?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cx(CONTROL, "h-10", invalid ? BAD : OK, className)}
      {...rest}
    />
  );
}

export function Textarea({
  invalid,
  className,
  rows = 4,
  ...rest
}: { invalid?: boolean } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cx(CONTROL, "resize-y py-2.5", invalid ? BAD : OK, className)}
      {...rest}
    />
  );
}

export function Select({
  invalid,
  className,
  children,
  ...rest
}: { invalid?: boolean } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cx(CONTROL, "h-10", invalid ? BAD : OK, className)}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Checkbox({
  label,
  className,
  ...rest
}: { label: ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cx("flex cursor-pointer items-start gap-2.5 text-body text-ds-text-2", className)}>
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--ds-accent)]"
        {...rest}
      />
      <span>{label}</span>
    </label>
  );
}

// Interruptor sem estado próprio: é um checkbox nativo estilizado, então
// funciona com FormData e com componente controlado, sem virar client.
export function Toggle({
  label,
  description,
  className,
  ...rest
}: { label: string; description?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cx("flex cursor-pointer items-start justify-between gap-4", className)}>
      <span>
        <span className="block text-label font-medium text-ds-text">{label}</span>
        {description && <span className="mt-0.5 block text-caption text-ds-text-3">{description}</span>}
      </span>
      <span className="relative mt-0.5 shrink-0">
        <input type="checkbox" className="peer sr-only" {...rest} />
        <span className="block h-5 w-9 rounded-full bg-ds-line transition-colors duration-fast ease-ds peer-checked:bg-ds-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--ds-focus)]" />
        <span className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-fast ease-ds peer-checked:translate-x-4" />
      </span>
    </label>
  );
}
