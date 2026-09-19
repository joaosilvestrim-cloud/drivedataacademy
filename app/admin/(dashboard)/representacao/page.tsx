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

type Contato = { email: string | null; telefone: string | null; linkedin: string | null };

/* Telefone vem digitado de qualquer jeito. Para o link do WhatsApp só servem
   dígitos com código do país: número brasileiro sem o 55 ganha o 55. */
function whatsappDe(telefone: string | null): string | null {
  const d = (telefone || "").replace(/\D/g, "");
  if (d.length < 10) return null;
  return d.length <= 11 ? "55" + d : d;
}

function telefoneLegivel(telefone: string): string {
  const d = telefone.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return telefone;
}

/* LinkedIn chega como endereço completo, sem https ou só como "@usuario". */
function linkedinDe(valor: string | null): string | null {
  const v = (valor || "").trim();
  if (!v) return null;
  if (/linkedin\.com\//i.test(v)) return v.startsWith("http") ? v : `https://${v.replace(/^\/+/, "")}`;
  const perfil = v.replace(/^@/, "");
  return /^[\w-]{3,100}$/.test(perfil) ? `https://www.linkedin.com/in/${perfil}` : null;
}

const ASSUNTO: Record<string, string> = {
  portal: "revenda do Portal BI",
  parceria: "parceria em projeto",
  mentoria: "mentoria",
  candidatura: "sua candidatura",
  marketplace: "o marketplace",
};

/* Linha de contato da solicitação. A mensagem já vai escrita com o nome e o
   assunto: quem atende só revisa e envia. */
function ContatoDoAluno({ nome, tipo, contato }: { nome: string; tipo: string; contato: Contato }) {
  const primeiro = (nome || "").split(" ")[0] || "";
  const assunto = ASSUNTO[tipo] || "sua solicitação";
  const texto = `Oi${primeiro ? ", " + primeiro : ""}! Aqui é da DriveData Academy. Recebemos seu interesse em ${assunto} pela área do aluno e queria conversar com você sobre isso.`;
  const wa = whatsappDe(contato.telefone);
  const botao = "inline-flex items-center gap-1.5 rounded-ctl border border-ds-line px-2.5 py-1.5 text-caption font-medium text-ds-text-2 transition-colors hover:border-ds-accent hover:text-ds-text";

  if (!contato.email && !contato.telefone && !contato.linkedin) {
    return <p className="text-caption text-ds-text-3">Sem contato cadastrado além da conta.</p>;
  }
  return (
    <div className="flex flex-col gap-2 rounded-srf border border-ds-line-soft bg-ds-surface/60 px-3 py-2.5">
      <p className="text-meta uppercase text-ds-text-3">Contato</p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-body-sm text-ds-text">
        {contato.email && <span className="select-all break-all">{contato.email}</span>}
        {contato.telefone && <span className="select-all font-mono tabular-nums">{telefoneLegivel(contato.telefone)}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {wa && (
          <a href={`https://wa.me/${wa}?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer" className={botao}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.7 11.8 11.8 0 004.5 4c1.7.7 2.4.8 3.2.6a2.7 2.7 0 001.8-1.3 2.2 2.2 0 00.2-1.3c-.1-.1-.3-.2-.5-.3z" /></svg>
            WhatsApp
          </a>
        )}
        {contato.email && (
          <a href={`mailto:${contato.email}?subject=${encodeURIComponent("DriveData Academy · " + (TYPE_LABEL[tipo] || "sua solicitação"))}&body=${encodeURIComponent(texto)}`} className={botao}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5h16v14H4zM4 6l8 7 8-7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
            E-mail
          </a>
        )}
        {linkedinDe(contato.linkedin) && (
          <a href={linkedinDe(contato.linkedin)!} target="_blank" rel="noreferrer" className={botao}>
            LinkedIn
          </a>
        )}
      </div>
      {!wa && contato.telefone && <p className="text-caption text-ds-text-3">Telefone incompleto para abrir no WhatsApp.</p>}
    </div>
  );
}

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

export default async function AdminRepresentacao({ searchParams }: { searchParams: { f?: string } }) {
  const f = searchParams?.f || "all";
  let rows: any[] = [], nameById: Record<string, string> = {};
  const contatoById: Record<string, Contato> = {};
  const counts: Record<string, number> = { all: 0 };
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("rep_requests").select("id, user_id, type, payload, status, created_at").order("created_at", { ascending: false }).limit(300);
    if (error) throw new Error(error.message);
    const all = data ?? [];
    for (const r of all) { counts.all++; counts[r.type] = (counts[r.type] || 0) + 1; }
    rows = f === "all" ? all : all.filter((r: any) => r.type === f);
    const ids = [...new Set(all.map((r: any) => r.user_id))];
    const [perfis, { data: usuarios }, { data: perfisContato }, { data: pedidos }] = await Promise.all([
      loadProfiles(admin, ids),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      ids.length ? admin.from("profiles").select("id, phone, linkedin_url").in("id", ids) : Promise.resolve({ data: [] as any[] }),
      // Quem comprou deixou telefone no pedido: serve de reserva quando o perfil está sem.
      ids.length ? admin.from("orders").select("user_id, phone, created_at").in("user_id", ids).not("phone", "is", null).order("created_at", { ascending: false }) : Promise.resolve({ data: [] as any[] }),
    ]);
    nameById = perfis.nameById;
    const emailDe = new Map((usuarios?.users ?? []).map((u: any) => [u.id, u.email as string]));
    const perfilDe = new Map((perfisContato ?? []).map((p: any) => [p.id, p]));
    const foneDoPedido = new Map<string, string>();
    for (const o of pedidos ?? []) if (!foneDoPedido.has(o.user_id)) foneDoPedido.set(o.user_id, o.phone);
    for (const id of ids) {
      const p: any = perfilDe.get(id) || {};
      contatoById[id] = {
        email: emailDe.get(id) || null,
        telefone: (p.phone || "").trim() || foneDoPedido.get(id) || null,
        linkedin: (p.linkedin_url || "").trim() || null,
      };
    }
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Parceria & Negócios</h1>
        <div className="mt-6"><AdminError message={(e instanceof Error ? e.message : "Erro.") + " — rode o SQL de rep_requests no Supabase."} /></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Parceria & Negócios</h1>
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
            description="Quando um aluno enviar um pedido pela página de Parceria & Negócios, ele chega aqui."
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

                <ContatoDoAluno nome={displayName(nameById, r.user_id)} tipo={r.type} contato={contatoById[r.user_id] ?? { email: null, telefone: null, linkedin: null }} />

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
