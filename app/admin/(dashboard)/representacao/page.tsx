import type { ReactNode } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadProfiles, displayName } from "@/lib/community";
import { Status, Button } from "@/components/ui/primitives";
import { LinkFilter } from "@/components/ui/filter";
import { SelectField } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/layout";
import AdminError from "../AdminError";
import { setRepStatus } from "./actions";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  portal: "Venda Portal BI", parceria: "Parceria em projeto", mentoria: "Mentoria", candidatura: "Candidatura", marketplace: "Marketplace",
};
/* Os tons repetem a leitura que as cores antigas já faziam: novo pede alguém,
   em andamento está com alguém, concluído saiu da fila, recusado também. */
const STATUS: Record<string, { label: string; tone: "accent" | "attention" | "info" | "neutral" }> = {
  novo: { label: "Novo", tone: "accent" },
  em_andamento: { label: "Em andamento", tone: "attention" },
  concluido: { label: "Concluído", tone: "info" },
  recusado: { label: "Recusado", tone: "neutral" },
};
const FILTERS = [{ key: "all", label: "Todos" }, { key: "portal", label: "Portal BI" }, { key: "parceria", label: "Parcerias" }, { key: "mentoria", label: "Mentorias" }, { key: "candidatura", label: "Candidaturas" }, { key: "marketplace", label: "Marketplace" }];

/* Não é o Badge da fundação de propósito. O Badge usa font-mono, e aqui o
   conteúdo é uma frase de categoria, "Parceria em projeto". A regra do Mono
   vale para medida, então o chip é local até a fundação decidir o que fazer com
   o Badge. Geometria idêntica à do Badge, só sem Mono. */
function TipoChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-ctl border border-ds-line px-2 py-0.5 text-meta uppercase text-ds-text-2">
      {children}
    </span>
  );
}

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

export default async function AdminRepresentacao({ searchParams }: { searchParams: { f?: string } }) {
  const f = searchParams?.f || "all";
  let rows: any[] = [], nameById: Record<string, string> = {};
  const counts: Record<string, number> = { all: 0 };
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("rep_requests").select("id, user_id, type, payload, status, created_at").order("created_at", { ascending: false }).limit(300);
    if (error) throw new Error(error.message);
    const all = data ?? [];
    for (const r of all) { counts.all++; counts[r.type] = (counts[r.type] || 0) + 1; }
    rows = f === "all" ? all : all.filter((r: any) => r.type === f);
    nameById = (await loadProfiles(admin, all.map((r: any) => r.user_id))).nameById;
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Representação</h1>
        <div className="mt-6"><AdminError message={(e instanceof Error ? e.message : "Erro.") + " — rode o SQL de rep_requests no Supabase."} /></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Representação DriveData</h1>
      <p className="mt-1 text-sm text-slate-400">Solicitações dos alunos: revenda do Portal, parcerias, mentorias, candidaturas e marketplace.</p>

      <div className="mt-6">
        <LinkFilter
          label="Filtrar solicitações por tipo"
          basePath="/admin/representacao"
          param="f"
          options={FILTERS}
          active={f}
          counts={counts}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-ds-line pb-2.5">
        <h2 className="font-display text-section font-semibold text-ds-text">
          {FILTERS.find((o) => o.key === f)?.label ?? "Solicitações"}
        </h2>
        <span className="text-meta uppercase text-ds-text-3">
          {rows.length} {rows.length === 1 ? "solicitação" : "solicitações"}
        </span>
      </div>

      {rows.length === 0 ? (
        counts.all === 0 ? (
          <EmptyState
            title="Nenhuma solicitação ainda"
            description="Quando um aluno enviar um pedido pela página de Representação, ele chega aqui."
          />
        ) : (
          <EmptyState
            title={`Nenhuma solicitação em ${(FILTERS.find((o) => o.key === f)?.label ?? f).toLowerCase()}`}
            description={`Existem ${counts.all} ${counts.all === 1 ? "solicitação" : "solicitações"} na fila. Troque o tipo acima para vê-las.`}
          />
        )
      ) : (
        <ul className="flex flex-col">
          {rows.map((r) => {
            const st = STATUS[r.status] || STATUS.novo;
            const entries = Object.entries(r.payload || {}).filter(([, v]) => v != null && String(v).trim() !== "");
            return (
              <li key={r.id} className="flex flex-col gap-3 border-b border-ds-line-soft py-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <TipoChip>{TYPE_LABEL[r.type] || r.type}</TipoChip>
                  <span className="text-body-sm font-medium text-ds-text">{displayName(nameById, r.user_id)}</span>
                  <Status tone={st.tone}>{st.label}</Status>
                  <span className="text-caption text-ds-text-3">{fmt(r.created_at)}</span>
                </div>

                {/* O payload é jsonb de chaves livres: o que o aluno preencheu
                    muda por tipo. Por isso continua lista de definição, e não
                    coluna de tabela. */}
                {entries.length > 0 && (
                  <dl className="grid gap-x-8 gap-y-2 tablet:grid-cols-2">
                    {entries.map(([k, v]) => (
                      <div key={k} className="min-w-0">
                        <dt className="text-meta uppercase text-ds-text-3">{k.replace(/_/g, " ")}</dt>
                        <dd className="whitespace-pre-line break-words text-body-sm text-ds-text-2">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                <form action={setRepStatus} className="flex flex-wrap items-end gap-3 border-t border-ds-line-soft pt-3">
                  <input type="hidden" name="id" value={r.id} />
                  <SelectField
                    scope={`rep-${r.id}`}
                    name="status"
                    label="Situação"
                    defaultValue={r.status}
                    className="w-full tablet:w-52"
                  >
                    <option value="novo">Novo</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="concluido">Concluído</option>
                    <option value="recusado">Recusado</option>
                  </SelectField>
                  {/* size md porque o par visual é o select de 40px, não uma ação de linha. */}
                  <Button type="submit" variant="secondary" className="shrink-0">
                    Atualizar
                    <span className="sr-only"> a situação da solicitação de {displayName(nameById, r.user_id)}</span>
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
