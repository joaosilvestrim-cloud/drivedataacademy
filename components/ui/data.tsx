"use client";

import { useId, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search as SearchIcon, X } from "lucide-react";
import { ICON } from "./primitives";

/* --------------------------------------------------------------------------
   Camada operacional do Design System.
   Nasceu de demanda medida: 12 telas do admin têm tabela e 5 repetem a mesma
   busca local. Nada aqui foi criado por suposição.

   DENSIDADE
   A linguagem é a mesma da Home; o ritmo não é. A compactação vem de padding,
   line-height e agrupamento, não de encolher a fonte até caber mais linha.

     comfortable  py-4   text-body      páginas editoriais e de leitura
     compact      py-2.5 text-body-sm   tabelas e listas administrativas

   O piso continua sendo 12px. Nada de text-xs com semibold para caber mais.
   -------------------------------------------------------------------------- */

const cx = (...p: (string | false | undefined | null)[]) => p.filter(Boolean).join(" ");

export type Density = "comfortable" | "compact";
const ROW: Record<Density, string> = { comfortable: "py-4 text-body", compact: "py-2.5 text-body-sm" };

/* ---------------------------------- Search -------------------------------- */
// Ferramenta de trabalho: rótulo acessível, limpar visível quando há texto e
// Escape limpa sem tirar a mão do teclado.
export function Search({
  value,
  onChange,
  placeholder = "Buscar...",
  label = "Buscar",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cx("relative", className)}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <SearchIcon
        size={ICON.md}
        strokeWidth={ICON.stroke}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ds-text-3"
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape" && value) { e.preventDefault(); onChange(""); } }}
        placeholder={placeholder}
        className="h-10 w-full rounded-ctl border border-ds-line bg-ds-surface pl-9 pr-9 text-body text-ds-text placeholder:text-ds-text-3 transition-colors duration-fast ease-ds hover:border-ds-text-3 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpar busca"
          className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-ctl text-ds-text-3 transition-colors duration-fast ease-ds hover:bg-ds-raised hover:text-ds-text"
        >
          <X size={ICON.sm} strokeWidth={ICON.stroke} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/* -------------------------------- FilterBar ------------------------------- */
// Filtro primário sempre visível. O resumo abaixo responde, em texto, a
// pergunta "por que estou vendo estes registros?".
export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const id = useId();
  const ativo = value !== options[0]?.value;
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-label text-ds-text-3">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cx(
          "h-10 rounded-ctl border bg-ds-surface px-2.5 text-body-sm text-ds-text transition-colors duration-fast ease-ds",
          ativo ? "border-ds-accent/50" : "border-ds-line hover:border-ds-text-3"
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function FilterSummary({
  total,
  shown,
  reasons,
  onClear,
}: {
  total: number;
  shown: number;
  reasons: string[];
  onClear: () => void;
}) {
  if (!reasons.length) {
    return (
      <p className="text-body-sm text-ds-text-3">
        <span className="font-mono tabular-nums text-ds-text-2">{total}</span> {total === 1 ? "aluno" : "alunos"}.
      </p>
    );
  }
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-body-sm text-ds-text-2">
      <span>
        <span className="font-mono tabular-nums text-ds-text">{shown}</span> de{" "}
        <span className="font-mono tabular-nums">{total}</span>, {reasons.join(" e ")}
      </span>
      <button
        type="button"
        onClick={onClear}
        className="text-label text-ds-accent underline-offset-4 hover:underline"
      >
        limpar
      </button>
    </p>
  );
}

/* ---------------------------------- Tabela -------------------------------- */
export function DataTable({
  dense = true,
  children,
  caption,
}: {
  dense?: boolean;
  children: ReactNode;
  caption?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className={cx("w-full border-collapse", dense ? "min-w-[44rem]" : "min-w-[34rem]")}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

type Dir = "asc" | "desc";

// Cabeçalho ordenável. aria-sort deixa a ordem audível, e a seta nunca é a
// única pista: o cabeçalho ativo também muda de cor.
export function SortTh({
  children,
  field,
  sort,
  dir,
  onSort,
  numeric,
  className,
}: {
  children: ReactNode;
  field?: string;
  sort?: string;
  dir?: Dir;
  onSort?: (f: string) => void;
  numeric?: boolean;
  className?: string;
}) {
  const ativo = !!field && sort === field;
  const base = cx(
    "border-b border-ds-line pb-2 pr-4 text-left text-meta font-medium uppercase",
    numeric && "text-right",
    ativo ? "text-ds-text" : "text-ds-text-3",
    className
  );
  if (!field || !onSort) {
    return <th scope="col" className={base}>{children}</th>;
  }
  return (
    <th scope="col" className={base} aria-sort={ativo ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cx("inline-flex items-center gap-1 uppercase transition-colors duration-fast ease-ds hover:text-ds-text", numeric && "flex-row-reverse")}
      >
        {children}
        <span aria-hidden="true" className={cx("text-[0.9em]", ativo ? "opacity-100" : "opacity-0")}>
          {dir === "asc" ? "↑" : "↓"}
        </span>
      </button>
    </th>
  );
}

export function Tr({
  children,
  onClickHref,
  className,
}: {
  children: ReactNode;
  onClickHref?: string;
  className?: string;
}) {
  return (
    <tr className={cx("group border-b border-ds-line-soft transition-colors duration-fast ease-ds hover:bg-ds-raised/60", className)}>
      {children}
    </tr>
  );
}

export function Cell({
  children,
  dense = true,
  numeric,
  muted,
  className,
}: {
  children?: ReactNode;
  dense?: boolean;
  numeric?: boolean;
  muted?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cx(
        "pr-4 align-middle",
        ROW[dense ? "compact" : "comfortable"],
        numeric && "text-right font-mono tabular-nums",
        muted ? "text-ds-text-3" : "text-ds-text-2",
        className
      )}
    >
      {children}
    </td>
  );
}

/* -------------------------------- Paginação ------------------------------- */
// Ferramenta secundária: discreta, com a posição legível e alvos de 40px.
export function Pagination({
  page,
  pages,
  total,
  perPage,
  onPage,
  onPerPage,
}: {
  page: number;
  pages: number;
  total: number;
  perPage: number;
  onPage: (p: number) => void;
  onPerPage?: (n: number) => void;
}) {
  if (total === 0) return null;
  const primeiro = total === 0 ? 0 : (page - 1) * perPage + 1;
  const ultimo = Math.min(page * perPage, total);
  const btn =
    "grid h-10 w-10 place-items-center rounded-ctl border border-ds-line text-ds-text-2 transition-colors duration-fast ease-ds hover:border-ds-text-3 hover:text-ds-text disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ds-line";

  return (
    <nav aria-label="Paginação" className="flex flex-wrap items-center justify-between gap-4 pt-4">
      <p className="text-body-sm text-ds-text-3">
        <span className="font-mono tabular-nums text-ds-text-2">{primeiro}–{ultimo}</span> de{" "}
        <span className="font-mono tabular-nums text-ds-text-2">{total}</span>
      </p>
      <div className="flex items-center gap-3">
        {onPerPage && (
          <label className="flex items-center gap-2 text-label text-ds-text-3">
            <span className="hidden tablet:inline">Por página</span>
            <select
              value={perPage}
              onChange={(e) => onPerPage(Number(e.target.value))}
              className="h-10 rounded-ctl border border-ds-line bg-ds-surface px-2 text-body-sm text-ds-text transition-colors duration-fast ease-ds hover:border-ds-text-3"
            >
              {[25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
        <div className="flex items-center gap-1.5">
          <button type="button" className={btn} onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Página anterior">
            <ChevronLeft size={ICON.md} strokeWidth={ICON.stroke} aria-hidden="true" />
          </button>
          <span className="px-1 font-mono text-body-sm tabular-nums text-ds-text-2" aria-current="page">
            {page}<span className="text-ds-text-3">/{pages}</span>
          </span>
          <button type="button" className={btn} onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Próxima página">
            <ChevronRight size={ICON.md} strokeWidth={ICON.stroke} aria-hidden="true" />
          </button>
        </div>
      </div>
    </nav>
  );
}
