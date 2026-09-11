"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, ExternalLink } from "lucide-react";
import Avatar from "@/components/Avatar";
import { ICON, Status } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/layout";
import { Search, FilterSelect, FilterSummary, DataTable, SortTh, Cell, Pagination } from "@/components/ui/data";

type Student = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  enrollments: number;
  linkedin_url?: string | null;
  access: "ativo" | "sem";
};

const fmt = (iso: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(iso));

const ACESSO = [
  { value: "todos", label: "Todos" },
  { value: "ativo", label: "Com acesso" },
  { value: "sem", label: "Sem acesso" },
];
const MATRICULA = [
  { value: "todos", label: "Todas" },
  { value: "com", label: "Com curso" },
  { value: "sem", label: "Sem curso" },
];

type Field = "name" | "created_at" | "enrollments";
type Dir = "asc" | "desc";

export default function StudentsList({ rows }: { rows: Student[] }) {
  const [q, setQ] = useState("");
  const [acesso, setAcesso] = useState("todos");
  const [matricula, setMatricula] = useState("todos");
  const [sort, setSort] = useState<Field>("created_at");
  const [dir, setDir] = useState<Dir>("desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const termo = q.trim();

  const filtrados = useMemo(() => {
    const t = termo.toLowerCase();
    const out = rows.filter((r) => {
      if (t && !(r.name?.toLowerCase().includes(t) || r.email?.toLowerCase().includes(t))) return false;
      if (acesso !== "todos" && r.access !== acesso) return false;
      if (matricula === "com" && r.enrollments === 0) return false;
      if (matricula === "sem" && r.enrollments > 0) return false;
      return true;
    });
    const sinal = dir === "asc" ? 1 : -1;
    return out.sort((a, b) => {
      if (sort === "enrollments") return (a.enrollments - b.enrollments) * sinal;
      if (sort === "created_at") return (Date.parse(a.created_at) - Date.parse(b.created_at)) * sinal;
      // Nome vazio vai sempre para o fim, independente da direção escolhida.
      const an = a.name || "", bn = b.name || "";
      if (!an !== !bn) return an ? -1 : 1;
      return an.localeCompare(bn, "pt-BR") * sinal;
    });
  }, [rows, termo, acesso, matricula, sort, dir]);

  const pages = Math.max(1, Math.ceil(filtrados.length / perPage));
  const atual = Math.min(page, pages);
  const visiveis = filtrados.slice((atual - 1) * perPage, atual * perPage);

  function ordenar(f: string) {
    const campo = f as Field;
    if (campo === sort) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSort(campo); setDir(campo === "name" ? "asc" : "desc"); }
    setPage(1);
  }
  function limpar() { setQ(""); setAcesso("todos"); setMatricula("todos"); setPage(1); }

  const razoes = [
    termo && `buscando “${termo}”`,
    acesso !== "todos" && (acesso === "ativo" ? "com acesso ativo" : "sem acesso"),
    matricula !== "todos" && (matricula === "com" ? "com curso" : "sem curso"),
  ].filter(Boolean) as string[];

  // Três situações diferentes merecem três mensagens diferentes.
  const vazio =
    rows.length === 0
      ? { title: "Nenhum aluno cadastrado", description: "As contas aparecem aqui assim que a primeira assinatura for confirmada ou você liberar um acesso manual." }
      : termo
      ? { title: `Ninguém encontrado para “${termo}”`, description: "A busca cobre nome e e-mail. Confira a grafia ou limpe a busca." }
      : { title: "Nenhum aluno nestes filtros", description: "Ajuste os filtros de acesso ou de matrícula para ampliar o resultado." };

  const AcessoStatus = ({ v }: { v: Student["access"] }) =>
    v === "ativo" ? <Status tone="accent">Ativo</Status> : <Status tone="neutral">Sem acesso</Status>;

  return (
    <div className="flex flex-col gap-5">
      {/* Barra de trabalho. Busca primeiro, filtros primários ao lado. */}
      <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center tablet:gap-4">
        <Search
          value={q}
          onChange={(v) => { setQ(v); setPage(1); }}
          placeholder="Buscar por nome ou e-mail"
          label="Buscar aluno por nome ou e-mail"
          className="tablet:max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect label="Acesso" value={acesso} onChange={(v) => { setAcesso(v); setPage(1); }} options={ACESSO} />
          <FilterSelect label="Cursos" value={matricula} onChange={(v) => { setMatricula(v); setPage(1); }} options={MATRICULA} />
        </div>
      </div>

      <FilterSummary total={rows.length} shown={filtrados.length} reasons={razoes} onClear={limpar} />

      {filtrados.length === 0 ? (
        <EmptyState title={vazio.title} description={vazio.description} />
      ) : (
        <>
          {/* ── Desktop e tablet: tabela. Comparar registros importa aqui, ──
              então o comportamento tabular é preservado de propósito. ── */}
          <div className="hidden tablet:block">
            <DataTable caption="Lista de alunos">
              <thead>
                <tr>
                  <SortTh field="name" sort={sort} dir={dir} onSort={ordenar} className="w-full">Aluno</SortTh>
                  <SortTh>Acesso</SortTh>
                  <SortTh field="enrollments" sort={sort} dir={dir} onSort={ordenar} numeric>Cursos</SortTh>
                  {/* Cadastro sai no tablet: é o metadado de menor prioridade. */}
                  <SortTh field="created_at" sort={sort} dir={dir} onSort={ordenar} className="hidden lg:table-cell">Cadastro</SortTh>
                  <SortTh className="w-10"><span className="sr-only">Abrir ficha</span></SortTh>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((r) => (
                  <tr key={r.id} className="group border-b border-ds-line-soft transition-colors duration-fast ease-ds hover:bg-ds-raised/60">
                    {/* max-w-0 com a coluna em w-full: e o que permite o
                        conteudo truncar dentro de tabela com layout automatico. */}
                    <Cell className="max-w-0">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.name || r.email} size="xs" />
                        <div className="min-w-0">
                          <Link
                            href={`/admin/alunos/${r.id}`}
                            className="block truncate text-body-sm font-medium text-ds-text transition-colors duration-fast ease-ds hover:text-ds-accent"
                          >
                            {r.name || "Sem nome"}
                          </Link>
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate text-caption text-ds-text-3">{r.email}</span>
                            {r.linkedin_url && (
                              <a
                                href={r.linkedin_url}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Abrir LinkedIn de ${r.name || r.email}`}
                                className="shrink-0 text-ds-text-3 transition-colors duration-fast ease-ds hover:text-ds-info"
                              >
                                <ExternalLink size={12} strokeWidth={ICON.stroke} aria-hidden="true" />
                              </a>
                            )}
                          </span>
                        </div>
                      </div>
                    </Cell>
                    <Cell className="whitespace-nowrap"><AcessoStatus v={r.access} /></Cell>
                    <Cell numeric muted={r.enrollments === 0}>{r.enrollments}</Cell>
                    <Cell muted className="hidden whitespace-nowrap lg:table-cell">{fmt(r.created_at)}</Cell>
                    <Cell className="pr-0 text-right">
                      <Link
                        href={`/admin/alunos/${r.id}`}
                        aria-label={`Abrir ficha de ${r.name || r.email}`}
                        className="inline-grid h-10 w-10 place-items-center rounded-ctl text-ds-text-3 transition-colors duration-fast ease-ds hover:bg-ds-raised hover:text-ds-text"
                      >
                        <ChevronRight size={ICON.md} strokeWidth={ICON.stroke} aria-hidden="true" />
                      </Link>
                    </Cell>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>

          {/* ── Mobile: lista estruturada. Não é rolagem horizontal nem card ──
              gigante. Identidade, estado e o dado operacional principal. ── */}
          <ul className="flex flex-col tablet:hidden">
            {visiveis.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/admin/alunos/${r.id}`}
                  className="flex items-center gap-3 border-b border-ds-line-soft py-3 transition-colors duration-fast ease-ds active:bg-ds-raised"
                >
                  <Avatar name={r.name || r.email} size="xs" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-sm font-medium text-ds-text">{r.name || "Sem nome"}</span>
                    <span className="block truncate text-caption text-ds-text-3">{r.email}</span>
                    <span className="mt-1 flex items-center gap-3">
                      <AcessoStatus v={r.access} />
                      <span className="text-caption text-ds-text-3">
                        <span className="font-mono tabular-nums">{r.enrollments}</span>{" "}
                        {r.enrollments === 1 ? "curso" : "cursos"}
                      </span>
                    </span>
                  </span>
                  <ChevronRight size={ICON.md} strokeWidth={ICON.stroke} aria-hidden="true" className="shrink-0 text-ds-text-3" />
                </Link>
              </li>
            ))}
          </ul>

          <Pagination
            page={atual}
            pages={pages}
            total={filtrados.length}
            perPage={perPage}
            onPage={(p) => setPage(Math.min(Math.max(1, p), pages))}
            onPerPage={(n) => { setPerPage(n); setPage(1); }}
          />
        </>
      )}
    </div>
  );
}
