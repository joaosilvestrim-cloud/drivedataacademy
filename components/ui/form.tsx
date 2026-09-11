import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { ICON } from "./primitives";

/* --------------------------------------------------------------------------
   Campos de formulário.
   Consolida a constante `const field = …` copiada em 36 arquivos.

   O Field resolve a relação inteira entre rótulo, controle, descrição, erro,
   obrigatoriedade e desabilitado. A página não remonta essas ligações à mão.

   Sem hooks de propósito: o id vem de `scope` + `name`, não de useId. Assim o
   componente funciona em Server Component, e páginas com vários formulários na
   mesma tela (o caso de /admin/lives) geram ids únicos e estáveis.

   CONVENÇÃO DE OBRIGATÓRIO
   Campo obrigatório exibe a palavra "obrigatório" ao lado do rótulo e leva o
   atributo `required`. Não usamos asterisco: asterisco sozinho não é
   autoexplicativo e obriga uma legenda em algum canto da tela.
   -------------------------------------------------------------------------- */

const cx = (...p: (string | false | undefined | null)[]) => p.filter(Boolean).join(" ");

// Altura 40px nos controles de uma linha: alvo de toque adequado no celular.
const CONTROL =
  "w-full rounded-ctl border bg-ds-surface px-3 text-body text-ds-text placeholder:text-ds-text-3 transition-colors duration-fast ease-ds disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-ds-raised";
const OK = "border-ds-line hover:border-ds-text-3";
const BAD = "border-ds-danger";

const slug = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "-");

type Base = {
  /** Prefixo do id. Numa tela com vários formulários, use algo único por form. */
  scope: string;
  name: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

function Wrapper({
  id, label, description, error, required, children, className,
}: {
  id: string; label: string; description?: string; error?: string;
  required?: boolean; children: ReactNode; className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="flex flex-wrap items-baseline gap-x-2 text-label font-medium text-ds-text-2">
        {label}
        {required && <span className="text-meta uppercase text-ds-text-3">obrigatório</span>}
      </label>
      {children}
      {/* Erro tem precedência sobre descrição e é anunciado por aria-describedby. */}
      {error ? (
        // Ícone com função: separa erro de descrição sem depender só da cor.
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-caption text-ds-danger">
          <AlertCircle size={ICON.sm} strokeWidth={ICON.stroke} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : description ? (
        <p id={`${id}-desc`} className="text-caption text-ds-text-3">{description}</p>
      ) : null}
    </div>
  );
}

function described(id: string, description?: string, error?: string) {
  if (error) return `${id}-error`;
  if (description) return `${id}-desc`;
  return undefined;
}

/* ------------------------------- Field (input) ---------------------------- */
export function Field({
  scope, name, label, description, error, required, disabled, className, ...rest
}: Base & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "id" | "required" | "disabled" | "className">) {
  const id = `${slug(scope)}-${slug(name)}`;
  return (
    <Wrapper id={id} label={label} description={description} error={error} required={required} className={className}>
      <input
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={described(id, description, error)}
        className={cx(CONTROL, "h-10", error ? BAD : OK)}
        {...rest}
      />
    </Wrapper>
  );
}

/* ------------------------------- TextareaField ---------------------------- */
export function TextareaField({
  scope, name, label, description, error, required, disabled, className, rows = 3, ...rest
}: Base & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "name" | "id" | "required" | "disabled" | "className">) {
  const id = `${slug(scope)}-${slug(name)}`;
  return (
    <Wrapper id={id} label={label} description={description} error={error} required={required} className={className}>
      <textarea
        id={id}
        name={name}
        rows={rows}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={described(id, description, error)}
        className={cx(CONTROL, "resize-y py-2.5", error ? BAD : OK)}
        {...rest}
      />
    </Wrapper>
  );
}

/* -------------------------------- SelectField ----------------------------- */
export function SelectField({
  scope, name, label, description, error, required, disabled, className, children, ...rest
}: Base & { children: ReactNode } & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "name" | "id" | "required" | "disabled" | "className" | "children">) {
  const id = `${slug(scope)}-${slug(name)}`;
  return (
    <Wrapper id={id} label={label} description={description} error={error} required={required} className={className}>
      <select
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={described(id, description, error)}
        className={cx(CONTROL, "h-10", error ? BAD : OK)}
        {...rest}
      >
        {children}
      </select>
    </Wrapper>
  );
}

/* ------------------------------- CheckboxField ---------------------------- */
// Caixa de seleção tem o rótulo ao lado, não acima: a relação já é direta.
export function CheckboxField({
  scope, name, label, description, disabled, className, ...rest
}: Omit<Base, "error" | "required"> & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "id" | "type" | "disabled" | "className">) {
  const id = `${slug(scope)}-${slug(name)}`;
  return (
    <div className={cx("flex flex-col gap-1", className)}>
      <div className="flex items-start gap-2.5">
        <input
          id={id}
          name={name}
          type="checkbox"
          disabled={disabled}
          aria-describedby={description ? `${id}-desc` : undefined}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--ds-accent)] disabled:opacity-50"
          {...rest}
        />
        <label htmlFor={id} className="text-body-sm text-ds-text-2">{label}</label>
      </div>
      {description && <p id={`${id}-desc`} className="pl-[1.625rem] text-caption text-ds-text-3">{description}</p>}
    </div>
  );
}

/* --------------------------------- FileField ------------------------------
   Nasceu em /admin/materiais. Mantém o input nativo de propósito: ele já é
   operável por teclado, já mostra o nome do arquivo escolhido e já respeita
   `accept`. Um dropzone customizado trocaria tudo isso por aparência.

   Não inventa recurso que o produto não tem: sem arrastar e soltar, sem
   progresso percentual, sem remover. O que ele acrescenta é o que faltava:
   nome acessível, arquivo atual visível e a regra de substituição dita em
   palavras, em vez de implícita.
   ------------------------------------------------------------------------- */
export function FileField({
  scope, name, label, description, error, required, disabled, className,
  current, preview, accept, ...rest
}: Base & {
  /** Arquivo já salvo, na edição. */
  current?: { url: string; label?: string } | null;
  /** Miniatura, só quando o arquivo é imagem. */
  preview?: string | null;
  accept?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "id" | "type" | "required" | "disabled" | "className" | "accept">) {
  const id = `${slug(scope)}-${slug(name)}`;
  const descId = `${id}-desc`;
  const temAtual = !!current?.url;

  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="flex flex-wrap items-baseline gap-x-2 text-label font-medium text-ds-text-2">
        {label}
        {required && <span className="text-meta uppercase text-ds-text-3">obrigatório</span>}
      </label>

      {preview && (
        <span className="block w-full max-w-[16rem] overflow-hidden rounded-srf border border-ds-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" loading="lazy" decoding="async" className="aspect-[16/9] w-full object-cover" />
        </span>
      )}

      {temAtual && (
        <p className="flex flex-wrap items-baseline gap-x-2 text-caption text-ds-text-3">
          <span>Arquivo atual:</span>
          <a
            href={current!.url}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 break-all text-ds-info underline decoration-ds-line underline-offset-4 hover:decoration-ds-info"
          >
            {current!.label || "abrir"}
          </a>
        </p>
      )}

      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : `${descId}`}
        className="block w-full text-body-sm text-ds-text-2 file:mr-3 file:rounded-ctl file:border file:border-ds-line file:bg-ds-raised file:px-3 file:py-2 file:text-label file:font-medium file:text-ds-text file:transition-colors hover:file:border-ds-text-3 disabled:opacity-50"
        {...rest}
      />

      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-caption text-ds-danger">
          <AlertCircle size={ICON.sm} strokeWidth={ICON.stroke} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : (
        <p id={descId} className="text-caption text-ds-text-3">
          {description}
          {description && temAtual ? " " : ""}
          {temAtual && "Escolher um arquivo substitui o atual. Deixar em branco mantém o que já está salvo."}
        </p>
      )}
    </div>
  );
}

/* -------------------------------- FormSection -----------------------------
   Agrupamento semântico. Nasceu em /admin/materiais, que tem 15 campos em 5
   assuntos distintos, cada um já com título e explicação próprios no código
   original. Sem agrupamento a tela vira uma lista longa e indiferenciada.

   Não é card: é título, régua e respiro. Cinco cards empilhados eram parte do
   problema que originou o Design System.
   ------------------------------------------------------------------------- */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("flex flex-col gap-4", className)}>
      <div className="border-b border-ds-line pb-2">
        <h2 className="font-display text-component font-semibold text-ds-text">{title}</h2>
        {description && <p className="mt-1 max-w-xl text-caption text-ds-text-3">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/* -------------------------------- FormActions ----------------------------- */
// Área de ações. Uma primária, as demais recuadas, destrutiva à direita e com
// tratamento próprio. Evita dois botões com o mesmo peso visual.
export function FormActions({
  children,
  destructive,
  className,
}: {
  children: ReactNode;
  destructive?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-wrap items-center justify-between gap-3 border-t border-ds-line-soft pt-4", className)}>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
      {destructive && <div>{destructive}</div>}
    </div>
  );
}
