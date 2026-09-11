import { createAdminClient } from "@/lib/supabase/admin";
import { Button, Badge } from "@/components/ui/primitives";
import { PageHeader, ErrorState, EmptyState, Alert } from "@/components/ui/layout";
import { Field, TextareaField, SelectField, CheckboxField, FormActions } from "@/components/ui/form";
import { saveLive, deleteLive } from "./actions";

export const dynamic = "force-dynamic";

// ISO -> "YYYY-MM-DDTHH:mm" no fuso do Brasil, para o input datetime-local.
function toLocalInput(iso: string): string {
  const p = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const g = (t: string) => p.find((x) => x.type === t)?.value || "";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

function fmt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

const KIND = [
  { value: "live", label: "Live ou aula" },
  { value: "mentoria", label: "Mentoria" },
];

// Um formulário por live, mais o de criação. O `scope` garante ids únicos em
// todos eles, que é o que permite associar rótulo e controle nesta tela.
function LiveForm({ scope, live, sold = 0 }: { scope: string; live?: any; sold?: number }) {
  const editando = !!live;
  const pago = Number(live?.price) > 0;

  return (
    <form action={saveLive} className="flex flex-col gap-5">
      {editando && <input type="hidden" name="id" value={live.id} />}

      <div className="grid gap-4 tablet:grid-cols-[11rem_1fr]">
        <SelectField scope={scope} name="kind" label="Tipo" defaultValue={live?.kind || "live"}>
          {KIND.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
        </SelectField>
        <Field
          scope={scope}
          name="title"
          label="Título"
          // required só na criação, igual ao comportamento de hoje. A assimetria
          // com o formulário de edição está registrada como achado funcional.
          required={!editando}
          defaultValue={live?.title}
          description="É o que o aluno vê na agenda."
        />
      </div>

      <TextareaField
        scope={scope}
        name="description"
        label="Descrição"
        rows={2}
        defaultValue={live?.description ?? ""}
        description="Opcional. Um resumo curto do que será abordado."
      />

      <div className="grid gap-4 tablet:grid-cols-3">
        <Field
          scope={scope}
          name="starts_at"
          label="Data e hora"
          type="datetime-local"
          required={!editando}
          defaultValue={editando ? toLocalInput(live.starts_at) : undefined}
          description="Horário de Brasília."
        />
        <Field
          scope={scope}
          name="duration_min"
          label="Duração"
          type="number"
          inputMode="numeric"
          defaultValue={live?.duration_min ?? ""}
          description="Em minutos."
        />
        <Field
          scope={scope}
          name="price"
          label="Preço avulso"
          inputMode="decimal"
          defaultValue={live?.price ?? ""}
          description="Em reais. Vazio significa incluso na assinatura."
        />
      </div>

      <div className="grid gap-4 tablet:grid-cols-2">
        <Field
          scope={scope}
          name="url"
          label="Link da transmissão"
          type="url"
          defaultValue={live?.url ?? ""}
          description="YouTube, Meet ou outro."
        />
        <Field
          scope={scope}
          name="cover_url"
          label="Capa"
          type="url"
          defaultValue={live?.cover_url ?? ""}
          description="Endereço de uma imagem. Opcional."
        />
      </div>

      <CheckboxField
        scope={scope}
        name="published"
        label="Publicada"
        defaultChecked={editando ? live.published : true}
        description="Enquanto desmarcada, fica como rascunho e o aluno não vê."
      />

      {editando && pago && (
        <p className="text-body-sm text-ds-text-3">
          Página de venda:{" "}
          <a
            href={`/workshop/${live.id}`}
            target="_blank"
            rel="noreferrer"
            className="text-ds-info underline decoration-ds-line underline-offset-4 hover:decoration-ds-info"
          >
            /workshop/{live.id}
          </a>
          . Assinantes entram sem pagar.
        </p>
      )}

      <FormActions
        destructive={
          editando ? <Button formAction={deleteLive} variant="danger" size="sm">Excluir</Button> : undefined
        }
      >
        <Button type="submit" size={editando ? "sm" : "md"}>
          {editando ? "Salvar alterações" : "Criar live"}
        </Button>
        {editando && sold > 0 && (
          <span className="text-caption text-ds-text-3">
            <span className="font-mono tabular-nums">{sold}</span> {sold === 1 ? "venda registrada" : "vendas registradas"}
          </span>
        )}
      </FormActions>
    </form>
  );
}

export default async function LivesPage({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  let lives: any[] = [];
  const soldByEvent: Record<string, number> = {};
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("live_events").select("*").order("starts_at", { ascending: false });
    if (error) throw new Error(error.message);
    lives = data ?? [];
    const { data: wOrders } = await admin.from("orders").select("event_id").eq("product", "workshop").eq("status", "paid");
    for (const o of wOrders ?? []) if (o.event_id) soldByEvent[o.event_id] = (soldByEvent[o.event_id] || 0) + 1;
  } catch (e) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader context="Administração" title="Lives e roadmap" />
        <ErrorState
          title="Não foi possível carregar as lives"
          description={(e instanceof Error ? e.message : "Erro desconhecido.") + " Se a tabela ainda não existe, rode o SQL das lives no Supabase."}
        />
      </div>
    );
  }

  const publicadas = lives.filter((l) => l.published).length;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        context="Administração"
        title="Lives e roadmap"
        lede="A agenda publicada aqui vira o roadmap que o aluno vê no portal."
      />

      {searchParams?.ok && <Alert tone="accent" title="Salvo">As alterações já estão valendo na agenda do aluno.</Alert>}
      {searchParams?.error && <Alert tone="danger" title="Não foi possível salvar">{searchParams.error}</Alert>}

      {/* Criar. Aberto por padrão quando ainda não há nenhuma live. */}
      <section aria-labelledby="nova">
        <details open={lives.length === 0} className="group">
          <summary className="flex cursor-pointer items-center justify-between gap-4 border-b border-ds-line pb-2.5">
            <h2 id="nova" className="font-display text-section font-semibold text-ds-text">Nova live</h2>
            <span className="text-label text-ds-text-3 group-open:hidden">abrir</span>
            <span className="hidden text-label text-ds-text-3 group-open:inline">fechar</span>
          </summary>
          <div className="pt-5">
            <LiveForm scope="nova" />
          </div>
        </details>
      </section>

      {/* Agenda */}
      <section aria-labelledby="agenda">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-ds-line pb-2.5">
          <h2 id="agenda" className="font-display text-section font-semibold text-ds-text">Agenda</h2>
          <span className="text-meta uppercase text-ds-text-3">
            {lives.length} {lives.length === 1 ? "evento" : "eventos"}
            {lives.length > 0 && ` · ${publicadas} ${publicadas === 1 ? "publicado" : "publicados"}`}
          </span>
        </div>

        {lives.length === 0 ? (
          <EmptyState
            title="Nenhuma live agendada"
            description="Crie a primeira acima. Assim que publicar, ela aparece no roadmap dos alunos."
          />
        ) : (
          <div className="flex flex-col">
            {lives.map((l) => {
              const pago = Number(l.price) > 0;
              return (
                <details key={l.id} className="group border-b border-ds-line-soft">
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3.5 transition-colors duration-fast ease-ds hover:bg-ds-raised/50">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="truncate text-body-sm font-medium text-ds-text">{l.title || "Sem título"}</span>
                      {l.kind === "mentoria" && <Badge tone="info">mentoria</Badge>}
                      {!l.published && <Badge tone="attention">rascunho</Badge>}
                    </span>
                    <span className="flex shrink-0 items-baseline gap-3 text-caption text-ds-text-3">
                      <span className="tabular-nums">{fmt(l.starts_at)}</span>
                      {pago && (
                        <span className="font-mono tabular-nums text-ds-text-2">R$ {Number(l.price).toFixed(2)}</span>
                      )}
                    </span>
                  </summary>
                  <div className="pb-6 pt-4">
                    <LiveForm scope={`live-${l.id}`} live={l} sold={soldByEvent[l.id] || 0} />
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
