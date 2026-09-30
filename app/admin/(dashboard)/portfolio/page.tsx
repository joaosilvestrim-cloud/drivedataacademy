import { aprovacaoLigada } from "@/lib/portfolio-aprovacao";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadProfiles, displayName } from "@/lib/community";
import { Button, Status } from "@/components/ui/primitives";
import { PageHeader, SectionHeader, EmptyState, Alert } from "@/components/ui/layout";
import { LinkFilter } from "@/components/ui/filter";
import AdminError from "../AdminError";
import { STATUS, type Projeto } from "@/lib/portfolio";
import { aprovarProjeto, recusarProjeto, alternarDestaque, despublicarProjeto, alternarBloqueioSite, alternarAprovacao } from "./actions";

export const dynamic = "force-dynamic";

/* Fila da vitrine de portfólio.

   Abre no que espera revisão, que é a única parte com prazo: enquanto o
   projeto não é revisado, o aluno fica esperando. Tudo que precisa para
   decidir está no cartão, inclusive a imagem e os links. */

const FILTROS = [
  { key: "revisao", label: "Na fila" },
  { key: "aprovado", label: "Publicados" },
  { key: "recusado", label: "Devolvidos" },
  { key: "rascunho", label: "Rascunhos" },
  { key: "todos", label: "Todos" },
];

const quando = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));

export default async function PortfolioAdmin({ searchParams }: { searchParams: { f?: string; ok?: string; error?: string } }) {
  const f = FILTROS.some((x) => x.key === searchParams?.f) ? searchParams.f! : "revisao";
  let todos: Projeto[] = [];
  let nomes: Record<string, string> = {};
  const emails: Record<string, string> = {};

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("portfolio_projects").select("*").order("updated_at", { ascending: false }).limit(300);
    if (error) throw new Error(error.message);
    todos = (data ?? []) as Projeto[];
    const ids = [...new Set(todos.map((p) => p.user_id))];
    nomes = (await loadProfiles(admin, ids)).nameById;
    const { data: usuarios } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of usuarios?.users ?? []) if (ids.includes(u.id)) emails[u.id] = u.email || "";
  } catch (e) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader context="Administração" title="Portfólio dos alunos" />
        <AdminError message={(e instanceof Error ? e.message : "Erro.") + " — rode a migration 20260920_portfolio.sql no Supabase."} />
      </div>
    );
  }

  /* Sites de portfólio publicados pelos alunos. Lidos à parte: sem a tabela
     ainda, a moderação dos projetos continua funcionando. */
  let sites: any[] = [];
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("portfolio_sites").select("user_id, slug, publicado, bloqueado, atualizado_em").order("atualizado_em", { ascending: false });
    sites = data ?? [];
    const faltam = sites.map((s) => s.user_id).filter((id) => !nomes[id]);
    if (faltam.length) Object.assign(nomes, (await loadProfiles(admin, faltam)).nameById);
  } catch {}

  const comAprovacao = await aprovacaoLigada(createAdminClient());
  const contagem: Record<string, number> = { todos: todos.length };
  for (const p of todos) contagem[p.status] = (contagem[p.status] || 0) + 1;
  const lista = f === "todos" ? todos : todos.filter((p) => p.status === f);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        context="Administração"
        title="Portfólio dos alunos"
        lede="Projetos que os alunos publicam na vitrine. Aprovar coloca no ar para a turma e, quando o aluno deixou público, na página do site."
      />

      {searchParams?.ok && <Alert tone="accent" title="Pronto">{searchParams.ok}</Alert>}

      <form action={alternarAprovacao} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ds-line px-4 py-3">
        <input type="hidden" name="ligar" value={comAprovacao ? "0" : "1"} />
        <span className="min-w-0">
          <span className="block text-body-sm font-semibold text-ds-text">Aprovação do portfólio: {comAprovacao ? "ligada" : "desligada"}</span>
          <span className="block text-caption text-ds-text-3">
            {comAprovacao
              ? "Projetos enviados entram na fila e só vão para a vitrine depois de aprovados."
              : "Projetos enviados saem publicados na hora, sem passar pela fila."}
          </span>
        </span>
        <Button type="submit" variant={comAprovacao ? "secondary" : "primary"}>{comAprovacao ? "Desligar aprovação" : "Ligar aprovação"}</Button>
      </form>
      {searchParams?.error && <Alert tone="danger" title="Não deu certo">{searchParams.error}</Alert>}

      {sites.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Sites dos alunos" meta={`${sites.filter((s) => s.publicado && !s.bloqueado).length} no ar`} />
          <ul className="flex flex-col divide-y divide-ds-line-soft">
            {sites.map((s) => (
              <li key={s.user_id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="text-body-sm text-ds-text">{displayName(nomes, s.user_id)}</span>{" "}
                  <a href={`/portfolio/${s.slug}`} target="_blank" rel="noopener" className="font-mono text-caption text-ds-text-3 hover:text-ds-text">/portfolio/{s.slug}</a>
                </span>
                <span className="flex items-center gap-3">
                  <Status tone={s.bloqueado ? "danger" : s.publicado ? "accent" : "neutral"}>{s.bloqueado ? "bloqueado" : s.publicado ? "no ar" : "rascunho"}</Status>
                  <form action={alternarBloqueioSite} className="flex items-center gap-2">
                    <input type="hidden" name="user_id" value={s.user_id} />
                    <input type="hidden" name="bloquear" value={s.bloqueado ? "0" : "1"} />
                    {!s.bloqueado && <input name="motivo" placeholder="motivo" className="w-32 rounded-md border border-ds-line bg-transparent px-2 py-1 text-caption" />}
                    <Button type="submit" variant="ghost">{s.bloqueado ? "Desbloquear" : "Tirar do ar"}</Button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <LinkFilter label="Filtrar projetos por situação" basePath="/admin/portfolio" param="f" options={FILTROS} active={f} counts={contagem} />

      <SectionHeader
        title={FILTROS.find((x) => x.key === f)?.label ?? "Projetos"}
        action={<span className="text-meta text-ds-text-3">{lista.length} {lista.length === 1 ? "projeto" : "projetos"}</span>}
      />

      {lista.length === 0 ? (
        <EmptyState
          title={f === "revisao" ? "Nada esperando revisão" : "Nenhum projeto aqui"}
          description={f === "revisao" ? "Quando um aluno enviar um projeto, ele aparece nesta fila." : "Troque o filtro acima para ver os outros."}
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {lista.map((p) => (
            <li key={p.id} className="flex flex-col gap-4 rounded-srf border border-ds-line bg-ds-surface p-4 tablet:flex-row">
              <div className="aspect-video w-full shrink-0 overflow-hidden rounded-srf border border-ds-line bg-ds-raised tablet:w-56">
                {p.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.cover_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-caption text-ds-text-3">sem imagem</div>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="text-component font-semibold text-ds-text">{p.titulo}</h3>
                  <Status tone={p.status === "aprovado" ? "accent" : p.status === "revisao" ? "attention" : "neutral"}>{STATUS[p.status].rotulo}</Status>
                  {p.destaque && <Status tone="info">Destaque</Status>}
                  {!p.publico && <span className="text-caption text-ds-text-3">só para a turma</span>}
                  <span className="text-caption text-ds-text-3">{quando(p.updated_at)}</span>
                </div>

                <p className="text-body-sm text-ds-text-2">{p.resumo}</p>

                <p className="text-caption text-ds-text-3">
                  {displayName(nomes, p.user_id)} · {emails[p.user_id] || "sem e-mail"} · {p.ferramentas.join(", ") || "sem ferramentas"}
                </p>

                {(p.problema || p.resultado || p.descricao) && (
                  <details className="text-body-sm text-ds-text-2">
                    <summary className="cursor-pointer text-caption uppercase text-ds-text-3">Ver o que o aluno escreveu</summary>
                    <div className="mt-2 flex flex-col gap-2 border-l-2 border-ds-line pl-3">
                      {p.problema && <p><b className="text-ds-text">Problema:</b> {p.problema}</p>}
                      {p.resultado && <p><b className="text-ds-text">Resultado:</b> {p.resultado}</p>}
                      {p.descricao && <p className="whitespace-pre-line">{p.descricao}</p>}
                    </div>
                  </details>
                )}

                <div className="flex flex-wrap gap-3 text-caption">
                  {p.link_url && <a href={p.link_url} target="_blank" rel="noreferrer" className="text-ds-info underline decoration-ds-line underline-offset-4">Abrir o projeto ↗</a>}
                  {p.repo_url && <a href={p.repo_url} target="_blank" rel="noreferrer" className="text-ds-info underline decoration-ds-line underline-offset-4">Código ↗</a>}
                  {p.cover_url && <a href={p.cover_url} target="_blank" rel="noreferrer" className="text-ds-info underline decoration-ds-line underline-offset-4">Imagem ↗</a>}
                </div>

                <div className="flex flex-wrap items-end gap-3 border-t border-ds-line-soft pt-3">
                  {p.status !== "aprovado" && (
                    <form action={aprovarProjeto}>
                      <input type="hidden" name="id" value={p.id} />
                      <Button type="submit" size="sm">Publicar</Button>
                    </form>
                  )}
                  {p.status === "aprovado" && (
                    <>
                      <form action={alternarDestaque}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="destaque" value={p.destaque ? "1" : "0"} />
                        <Button type="submit" variant="secondary" size="sm">{p.destaque ? "Tirar destaque" : "Destacar"}</Button>
                      </form>
                      <form action={despublicarProjeto}>
                        <input type="hidden" name="id" value={p.id} />
                        <Button type="submit" variant="secondary" size="sm">Tirar da vitrine</Button>
                      </form>
                    </>
                  )}
                  {p.status !== "recusado" && (
                    <form action={recusarProjeto} className="flex flex-1 flex-wrap items-end gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <input
                        name="motivo"
                        placeholder="o que precisa ajustar (vai para o aluno)"
                        aria-label={`Motivo da devolução de ${p.titulo}`}
                        className="min-w-[14rem] flex-1 rounded-ctl border border-ds-line bg-ds-raised px-3 py-1.5 text-body-sm text-ds-text outline-none placeholder:text-ds-text-3 focus:border-ds-danger"
                      />
                      <Button type="submit" variant="danger" size="sm">Devolver</Button>
                    </form>
                  )}
                </div>

                {p.status === "recusado" && p.motivo && (
                  <p className="text-caption text-ds-danger">Devolvido: {p.motivo}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
