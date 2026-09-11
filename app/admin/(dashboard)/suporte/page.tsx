import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadProfiles, displayName } from "@/lib/community";
import { CATEGORIES, TICKET_STATUS } from "@/lib/support";
import { Status, ICON } from "@/components/ui/primitives";
import { DataTable, SortTh, Tr, Cell } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/layout";
import AdminError from "../AdminError";

export const dynamic = "force-dynamic";

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

const TOM: Record<string, "attention" | "accent" | "neutral"> = {
  open: "attention",
  answered: "accent",
  resolved: "neutral",
};

/* Filtro governado pela URL. É link, não select: cada opção é um endereço que
   pode ser copiado, aberto em outra aba e alcançado por voltar e avançar. O
   FilterSelect do Design System resolve o outro caso, o de estado local em
   /admin/alunos, e não este. */
function FiltroStatus({ ativo, counts }: { ativo: string; counts: Record<string, number> }) {
  return (
    <nav aria-label="Filtrar chamados por situação" className="flex flex-wrap gap-2">
      {FILTERS.map((f) => {
        const atual = ativo === f.key;
        return (
          <Link
            key={f.key}
            href={`/admin/suporte?status=${f.key}`}
            aria-current={atual ? "page" : undefined}
            className={`inline-flex items-baseline gap-2 rounded-ctl border px-3 py-1.5 text-label font-medium transition-colors duration-fast ease-ds ${
              atual ? "border-ds-accent/50 bg-ds-accent/[0.07] text-ds-accent" : "border-ds-line text-ds-text-2 hover:border-ds-text-3 hover:text-ds-text"
            }`}
          >
            {f.label}
            <span className="font-mono text-caption tabular-nums">{counts[f.key] ?? 0}</span>
          </Link>
        );
      })}
    </nav>
  );
}

const FILTERS = [
  { key: "open", label: "Abertos" },
  { key: "answered", label: "Respondidos" },
  { key: "resolved", label: "Resolvidos" },
  { key: "all", label: "Todos" },
];

export default async function SuportePage({ searchParams }: { searchParams: { status?: string } }) {
  const active = searchParams?.status || "open";
  let tickets: any[] = [];
  let nameById: Record<string, string> = {};
  const counts: Record<string, number> = { open: 0, answered: 0, resolved: 0, all: 0 };
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("support_tickets")
      .select("id, user_id, email, subject, category, status, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    const all = data ?? [];
    for (const t of all) { counts.all++; counts[t.status] = (counts[t.status] || 0) + 1; }
    tickets = active === "all" ? all : all.filter((t: any) => t.status === active);
    const prof = await loadProfiles(admin, all.map((t: any) => t.user_id));
    nameById = prof.nameById;
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Suporte</h1>
        <div className="mt-6"><AdminError message={(e instanceof Error ? e.message : "Erro.") + " — rode o SQL de suporte no Supabase."} /></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Suporte</h1>
      <p className="mt-1 text-sm text-slate-400">Chamados dos alunos. Quando a IA não resolver, cai aqui para o time.</p>

      <div className="mt-6">
        <FiltroStatus ativo={active} counts={counts} />
      </div>

      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-ds-line pb-2.5">
        <h2 className="font-display text-section font-semibold text-ds-text">
          {FILTERS.find((f) => f.key === active)?.label ?? "Chamados"}
        </h2>
        <span className="text-meta uppercase text-ds-text-3">
          {tickets.length} {tickets.length === 1 ? "chamado" : "chamados"}
        </span>
      </div>

      {tickets.length === 0 ? (
        counts.all === 0 ? (
          <EmptyState
            title="Nenhum chamado ainda"
            description="Quando um aluno abrir um chamado que a IA não resolver, ele aparece aqui."
          />
        ) : (
          <EmptyState
            title={`Nenhum chamado em ${(FILTERS.find((f) => f.key === active)?.label ?? active).toLowerCase()}`}
            description={`Existem ${counts.all} ${counts.all === 1 ? "chamado" : "chamados"} no total. Troque a situação acima para vê-los.`}
          />
        )
      ) : (
        <>
          {/* Tabela no tablet e no desktop. No celular vira lista: rolagem
              lateral não é leitura. */}
          <div className="mt-4 hidden tablet:block">
            <DataTable caption="Chamados de suporte, com categoria, aluno, situação e última atualização">
              <thead>
                <tr>
                  <SortTh className="w-full">Assunto</SortTh>
                  <SortTh className="hidden lg:table-cell">Categoria</SortTh>
                  <SortTh>Aluno</SortTh>
                  <SortTh>Situação</SortTh>
                  <SortTh>Atualizado</SortTh>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => {
                  const st = TICKET_STATUS[t.status] || TICKET_STATUS.open;
                  return (
                    <Tr key={t.id}>
                      <Cell className="max-w-0">
                        <Link
                          href={`/admin/suporte/${t.id}`}
                          className="block truncate font-medium text-ds-text underline decoration-transparent underline-offset-4 transition-colors duration-fast ease-ds hover:decoration-ds-line"
                        >
                          {t.subject}
                        </Link>
                      </Cell>
                      <Cell muted className="hidden whitespace-nowrap lg:table-cell">{CATEGORIES[t.category] || t.category}</Cell>
                      <Cell className="max-w-[13rem]">
                        <span className="block truncate text-ds-text-2">{displayName(nameById, t.user_id)}</span>
                        <span className="block truncate text-caption text-ds-text-3">{t.email}</span>
                      </Cell>
                      <Cell className="whitespace-nowrap">
                        <Status tone={TOM[t.status] ?? "neutral"}>{st.label}</Status>
                      </Cell>
                      <Cell muted className="whitespace-nowrap">{fmt(t.updated_at)}</Cell>
                    </Tr>
                  );
                })}
              </tbody>
            </DataTable>
          </div>

          <ul className="mt-2 flex flex-col tablet:hidden">
            {tickets.map((t) => {
              const st = TICKET_STATUS[t.status] || TICKET_STATUS.open;
              return (
                <li key={t.id}>
                  <Link
                    href={`/admin/suporte/${t.id}`}
                    className="flex items-center gap-3 border-b border-ds-line-soft py-3.5 transition-colors duration-fast ease-ds hover:bg-ds-raised/50"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="truncate text-body-sm font-medium text-ds-text">{t.subject}</span>
                      <span className="truncate text-caption text-ds-text-3">
                        {displayName(nameById, t.user_id)} · {CATEGORIES[t.category] || t.category}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Status tone={TOM[t.status] ?? "neutral"}>{st.label}</Status>
                        <span className="text-caption text-ds-text-3">{fmt(t.updated_at)}</span>
                      </span>
                    </span>
                    <ChevronRight size={ICON.md} strokeWidth={ICON.stroke} aria-hidden="true" className="shrink-0 text-ds-text-3" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
