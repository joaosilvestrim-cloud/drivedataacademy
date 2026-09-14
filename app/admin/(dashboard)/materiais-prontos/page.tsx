import { createAdminClient } from "@/lib/supabase/admin";
import { Button, Badge, Status } from "@/components/ui/primitives";
import { PageHeader, ErrorState, EmptyState, Alert } from "@/components/ui/layout";
import { Field, TextareaField, SelectField, CheckboxField, FormActions } from "@/components/ui/form";
import { CATEGORIAS, categoria, tamanhoLegivel, extensao } from "@/lib/materiais";
import ArquivoUpload from "./ArquivoUpload";
import { salvarMaterial, excluirMaterial } from "./actions";

export const dynamic = "force-dynamic";

type Material = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  external_url: string | null;
  cover_url: string | null;
  published: boolean;
  position: number;
};

function MaterialForm({ scope, m }: { scope: string; m?: Material }) {
  const editando = !!m;
  return (
    <form action={salvarMaterial} className="flex flex-col gap-5">
      {editando && <input type="hidden" name="id" value={m!.id} />}

      <div className="grid gap-4 tablet:grid-cols-[1fr_12rem]">
        <Field scope={scope} name="title" label="Título" required defaultValue={m?.title} description="É o que o aluno vê na lista." />
        <SelectField scope={scope} name="category" label="Categoria" defaultValue={m?.category || "powerbi"}>
          {CATEGORIAS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </SelectField>
      </div>

      <TextareaField
        scope={scope}
        name="description"
        label="Descrição"
        rows={2}
        defaultValue={m?.description ?? ""}
        description="O que tem dentro e para que serve. Opcional."
      />

      <ArquivoUpload scope={scope} inicial={m ? { path: m.file_path, name: m.file_name, size: m.file_size } : undefined} />

      <div className="grid gap-4 tablet:grid-cols-[1fr_1fr_8rem]">
        <Field
          scope={scope}
          name="external_url"
          label="Ou um link"
          type="url"
          defaultValue={m?.external_url ?? ""}
          description="Drive, GitHub ou outro. Usado quando não há arquivo."
        />
        <Field scope={scope} name="cover_url" label="Capa" type="url" defaultValue={m?.cover_url ?? ""} description="Endereço de imagem. Opcional." />
        <Field scope={scope} name="position" label="Ordem" type="number" inputMode="numeric" defaultValue={m?.position ?? 0} description="Menor primeiro." />
      </div>

      <CheckboxField
        scope={scope}
        name="published"
        label="Publicado para os alunos"
        defaultChecked={editando ? m!.published : true}
        description="Desmarcado, fica como rascunho e o aluno não vê."
      />

      <FormActions destructive={editando ? <Button formAction={excluirMaterial} variant="danger" size="sm">Excluir</Button> : undefined}>
        <Button type="submit" size={editando ? "sm" : "md"}>{editando ? "Salvar alterações" : "Criar material"}</Button>
      </FormActions>
    </form>
  );
}

export default async function MateriaisProntosAdmin({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  let itens: Material[] = [];
  const downloads: Record<string, number> = {};
  try {
    const supabase = createAdminClient();
    const [{ data, error }, { data: baixados }] = await Promise.all([
      supabase.from("ready_materials").select("*").order("position").order("created_at", { ascending: false }),
      supabase.from("ready_material_downloads").select("material_id"),
    ]);
    if (error) throw new Error(error.message);
    itens = (data ?? []) as Material[];
    for (const d of baixados ?? []) downloads[d.material_id] = (downloads[d.material_id] || 0) + 1;
  } catch (e) {
    return (
      <div>
        <PageHeader context="Ferramentas" title="Materiais prontos" />
        <ErrorState
          title="Não foi possível carregar os materiais"
          description={(e instanceof Error ? e.message : "Erro desconhecido.") + " Se a tabela ainda não existe, rode a migration de materiais prontos no Supabase."}
        />
      </div>
    );
  }

  const publicados = itens.filter((i) => i.published).length;

  return (
    <div className="flex max-w-4xl flex-col gap-10">
      <div>
        <PageHeader context="Ferramentas" title="Materiais prontos" />
        <p className="mt-2 max-w-2xl text-body-sm text-ds-text-2">
          Arquivos de Power BI, templates e planilhas para os assinantes baixarem na área do aluno. O arquivo fica num
          espaço privado e só é entregue depois de conferir a assinatura.
        </p>
      </div>

      {searchParams?.ok && <Alert tone="accent">{searchParams.ok}</Alert>}
      {searchParams?.error && <Alert tone="danger">{searchParams.error}</Alert>}

      <details open={itens.length === 0} className="group rounded-srf border border-ds-line p-5">
        <summary className="cursor-pointer text-component font-semibold text-ds-text">Novo material</summary>
        <div className="mt-5">
          <MaterialForm scope="novo-material" />
        </div>
      </details>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ds-line pb-2.5">
          <h2 className="font-display text-section font-semibold text-ds-text">Publicados e rascunhos</h2>
          <span className="text-meta uppercase text-ds-text-3">
            {itens.length} {itens.length === 1 ? "material" : "materiais"} · {publicados} {publicados === 1 ? "publicado" : "publicados"}
          </span>
        </div>

        {itens.length === 0 ? (
          <EmptyState title="Nenhum material ainda" description="Crie o primeiro acima. Ele aparece em Materiais prontos, no menu do aluno." />
        ) : (
          <ul className="flex flex-col">
            {itens.map((m) => (
              <li key={m.id} className="border-b border-ds-line-soft py-4">
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="font-medium text-ds-text">{m.title}</span>
                    <Badge>{categoria(m.category).label}</Badge>
                    <Status tone={m.published ? "accent" : "neutral"}>{m.published ? "Publicado" : "Rascunho"}</Status>
                    <span className="text-caption text-ds-text-3">
                      {m.file_name ? `${extensao(m.file_name)} · ${tamanhoLegivel(m.file_size)}` : m.external_url ? "link" : "sem arquivo"}
                    </span>
                    <span className="ml-auto text-caption text-ds-text-3">
                      <span className="font-mono tabular-nums">{downloads[m.id] || 0}</span> {(downloads[m.id] || 0) === 1 ? "download" : "downloads"}
                    </span>
                  </summary>
                  <div className="mt-5">
                    <MaterialForm scope={`material-${m.id}`} m={m} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
