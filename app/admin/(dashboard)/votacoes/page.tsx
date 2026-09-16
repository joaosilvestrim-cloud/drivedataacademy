import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, SectionHeader, EmptyState, Alert } from "@/components/ui/layout";
import { Button, Badge } from "@/components/ui/primitives";
import { Field, TextareaField, CheckboxField, FormActions } from "@/components/ui/form";
import { apurar, encerrada, type Opcao, type Voto, type Votacao } from "@/lib/votacao";
import ExportCsv from "../ExportCsv";
import { criarVotacao, salvarVotacao, adicionarOpcao, excluirOpcao, excluirVotacao } from "./actions";

export const dynamic = "force-dynamic";

/* Votações. O link é público e serve para a turma escolher tema, formato e
   data das próximas lives. A apuração fica aqui, junto das sugestões soltas. */

const FUSO = "America/Sao_Paulo";
const quando = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: FUSO }).format(new Date(iso));

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const p = new Intl.DateTimeFormat("sv-SE", {
    timeZone: FUSO,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const g = (t: string) => p.find((x) => x.type === t)?.value || "";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

export default async function VotacoesPage({ searchParams }: { searchParams: { v?: string; ok?: string; error?: string } }) {
  const admin = createAdminClient();
  const { data: pollsRaw } = await admin
    .from("polls")
    .select("id, slug, title, description, max_choices, published, closes_at, allow_suggestion, show_results, created_at")
    .order("created_at", { ascending: false });

  const polls = (pollsRaw ?? []) as (Votacao & { created_at: string })[];
  const atual = polls.find((p) => p.id === searchParams.v) || polls[0] || null;

  let opcoes: Opcao[] = [];
  let votos: Voto[] = [];
  if (atual) {
    const [{ data: o }, { data: v }] = await Promise.all([
      admin.from("poll_options").select("id, poll_id, label, description, position").eq("poll_id", atual.id).order("position"),
      admin.from("poll_votes").select("email, name, options, suggestion, created_at").eq("poll_id", atual.id).order("created_at", { ascending: false }),
    ]);
    opcoes = (o ?? []) as Opcao[];
    votos = (v ?? []) as Voto[];
  }

  const resultado = atual ? apurar(opcoes, votos) : [];
  const sugestoes = votos.filter((v) => (v.suggestion || "").trim());

  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "academy.drivedata.com.br";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const url = atual ? `${proto}://${host}/votacao/${atual.slug}` : "";
  const qrSvg = atual ? await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#0b1220", light: "#ffffff" } }) : "";

  // Uma linha por voto, com o nome das opções escolhidas, para abrir no Excel.
  const rotulo = Object.fromEntries(opcoes.map((o) => [o.id, o.label]));
  const csv = votos.map((v) => ({
    quando: quando(v.created_at),
    nome: v.name || "",
    email: v.email,
    escolhas: (v.options || []).map((id) => rotulo[id]).filter(Boolean).join(" | "),
    sugestao: v.suggestion || "",
  }));

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Votações"
        lede="Pergunte à turma qual tema vem primeiro. O link é público e o voto é por e-mail, um por pessoa."
        action={csv.length > 0 ? <ExportCsv rows={csv} filename={`votacao-${atual?.slug}.csv`} /> : undefined}
      />

      {searchParams.ok && <Alert tone="accent">{searchParams.ok}</Alert>}
      {searchParams.error && <Alert tone="danger">{searchParams.error}</Alert>}

      {polls.length > 1 && (
        <nav className="flex flex-wrap gap-2">
          {polls.map((p) => (
            <Link
              key={p.id}
              href={`/admin/votacoes?v=${p.id}`}
              className={`rounded-ctl border px-3 py-1.5 text-body-sm transition-colors ${
                p.id === atual?.id ? "border-ds-accent text-ds-text" : "border-ds-line text-ds-text-2 hover:border-ds-accent"
              }`}
            >
              {p.title}
            </Link>
          ))}
        </nav>
      )}

      {atual && (
        <section className="flex flex-col gap-6">
          <SectionHeader title={atual.title} />

          <div className="grid gap-6 tablet:grid-cols-[16rem_1fr]">
            <div className="rounded-srf bg-white p-4">
              <div dangerouslySetInnerHTML={{ __html: qrSvg }} className="[&>svg]:h-auto [&>svg]:w-full" />
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-body-sm text-ds-text-2">
                Link para divulgar:{" "}
                <a href={url} target="_blank" rel="noreferrer" className="text-ds-info underline decoration-ds-line underline-offset-4">
                  {url.replace(/^https?:\/\//, "")}
                </a>
              </p>
              <p className="text-body-sm text-ds-text-2">
                O endereço curto <span className="font-mono text-ds-text">/votacao</span> sempre leva para a votação publicada mais recente.
              </p>
              <p className="text-body-sm text-ds-text-2">
                Estado:{" "}
                {!atual.published ? (
                  <Badge tone="attention">rascunho</Badge>
                ) : encerrada(atual) ? (
                  <Badge tone="attention">encerrada</Badge>
                ) : (
                  <Badge tone="accent">no ar</Badge>
                )}{" "}
                {atual.closes_at && <span className="text-ds-text-3">fecha em {quando(atual.closes_at)}</span>}
              </p>
              <p className="text-body-sm text-ds-text-2">
                <span className="font-mono tabular-nums text-ds-text">{votos.length}</span> {votos.length === 1 ? "voto" : "votos"} ·{" "}
                <span className="font-mono tabular-nums text-ds-text">{sugestoes.length}</span> {sugestoes.length === 1 ? "sugestão" : "sugestões"}
              </p>
            </div>
          </div>

          {/* Apuração */}
          {votos.length === 0 ? (
            <EmptyState title="Ainda sem votos" description="Divulgue o link ou mostre o QR code na live." />
          ) : (
            <div className="flex flex-col gap-4">
              {resultado.map((o) => (
                <div key={o.id}>
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="font-medium text-ds-text">{o.label}</p>
                    <p className="shrink-0 font-mono text-body-sm tabular-nums text-ds-text-2">{o.votos}</p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-ds-raised">
                    <div className="h-full rounded-full bg-ds-accent" style={{ width: `${o.porcento}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Opções */}
          <div className="flex flex-col gap-3 rounded-srf border border-ds-line p-4">
            <p className="text-label font-medium text-ds-text">Opções da votação</p>
            <ul className="flex flex-col">
              {opcoes.map((o) => (
                <li key={o.id} className="flex items-center gap-3 border-b border-ds-line-soft py-2.5 last:border-b-0">
                  <span className="text-body-sm text-ds-text">{o.label}</span>
                  <form action={excluirOpcao} className="ml-auto">
                    <input type="hidden" name="id" value={o.id} />
                    <input type="hidden" name="poll_id" value={atual.id} />
                    <Button type="submit" variant="danger" size="sm">Remover</Button>
                  </form>
                </li>
              ))}
            </ul>
            <form action={adicionarOpcao} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="poll_id" value={atual.id} />
              <div className="min-w-[16rem] flex-1">
                <Field scope={`opcao-${atual.id}`} name="label" label="Nova opção" placeholder="Modelagem de dados na prática" />
              </div>
              <Button type="submit" size="sm">Adicionar</Button>
            </form>
          </div>

          {/* Sugestões livres */}
          {sugestoes.length > 0 && (
            <div className="flex flex-col gap-3">
              <SectionHeader title="Sugestões de tema" />
              <ul className="flex flex-col">
                {sugestoes.map((s) => (
                  <li key={s.email} className="border-b border-ds-line-soft py-3 last:border-b-0">
                    <p className="text-body-sm text-ds-text">{s.suggestion}</p>
                    <p className="mt-1 text-caption text-ds-text-3">{s.name || "sem nome"} · {s.email} · {quando(s.created_at)}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Configuração */}
          <form action={salvarVotacao} className="flex flex-col gap-5 rounded-srf border border-ds-line p-4">
            <input type="hidden" name="id" value={atual.id} />
            <p className="text-label font-medium text-ds-text">Configuração</p>
            <Field scope={`cfg-${atual.id}`} name="title" label="Título" defaultValue={atual.title} />
            <TextareaField scope={`cfg-${atual.id}`} name="description" label="Descrição" rows={3} defaultValue={atual.description ?? ""} />
            <div className="grid gap-4 tablet:grid-cols-2">
              <Field scope={`cfg-${atual.id}`} name="max_choices" label="Quantas opções cada pessoa escolhe" type="number" defaultValue={String(atual.max_choices)} />
              <Field scope={`cfg-${atual.id}`} name="closes_at" label="Fecha em" type="datetime-local" defaultValue={toLocalInput(atual.closes_at)} description="Em branco, fica aberta." />
            </div>
            <CheckboxField scope={`cfg-${atual.id}`} name="published" label="Publicada" defaultChecked={atual.published} description="Enquanto desmarcada, o link não abre para ninguém." />
            <CheckboxField scope={`cfg-${atual.id}`} name="allow_suggestion" label="Aceitar sugestão de tema" defaultChecked={atual.allow_suggestion} />
            <CheckboxField scope={`cfg-${atual.id}`} name="show_results" label="Mostrar o resultado depois de votar" defaultChecked={atual.show_results} />
            <FormActions
              destructive={
                <Button formAction={excluirVotacao} variant="danger" size="sm">Excluir votação</Button>
              }
            >
              <Button type="submit">Salvar</Button>
            </FormActions>
          </form>
        </section>
      )}

      {/* Nova votação */}
      <section className="flex flex-col gap-5">
        <SectionHeader title="Nova votação" />
        <form action={criarVotacao} className="flex flex-col gap-5 rounded-srf border border-ds-line p-4">
          <Field scope="nova" name="title" label="Título" required placeholder="Qual tema você quer na próxima live?" />
          <TextareaField scope="nova" name="description" label="Descrição" rows={3} description="Aparece abaixo do título na página pública." />
          <TextareaField scope="nova" name="opcoes" label="Opções" rows={6} required description="Uma por linha. Dá para editar e adicionar depois." />
          <div className="grid gap-4 tablet:grid-cols-2">
            <Field scope="nova" name="max_choices" label="Quantas opções cada pessoa escolhe" type="number" defaultValue="1" />
            <Field scope="nova" name="closes_at" label="Fecha em" type="datetime-local" description="Em branco, fica aberta." />
          </div>
          <CheckboxField scope="nova" name="published" label="Publicar agora" defaultChecked />
          <CheckboxField scope="nova" name="allow_suggestion" label="Aceitar sugestão de tema" defaultChecked />
          <CheckboxField scope="nova" name="show_results" label="Mostrar o resultado depois de votar" defaultChecked />
          <div>
            <Button type="submit">Criar votação</Button>
          </div>
        </form>
      </section>
    </div>
  );
}
