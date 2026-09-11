import { Button } from "@/components/ui/primitives";
import { Field, TextareaField, CheckboxField, FormSection, FormActions } from "@/components/ui/form";
import { savePost } from "./actions";
import CoverField from "./CoverField";

type Post = {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  excerpt: string | null;
  content: string | null;
  cover_url: string | null;
  author: string | null;
  published: boolean;
  title_en?: string | null;
  excerpt_en?: string | null;
  category_en?: string | null;
  title_es?: string | null;
  excerpt_es?: string | null;
  category_es?: string | null;
} | null;

// Um idioma por bloco. Os seis campos de tradução não tinham rótulo nenhum,
// só placeholder, que some assim que a pessoa digita.
const IDIOMAS = [
  { sufixo: "en", nome: "Inglês" },
  { sufixo: "es", nome: "Espanhol" },
] as const;

export default function PostForm({ post }: { post?: Post }) {
  const editando = !!post;
  const scope = editando ? `post-${post!.id}` : "post-novo";
  const t = (k: keyof NonNullable<Post>) => (post?.[k] as string | null) ?? "";

  return (
    <form action={savePost} className="flex max-w-3xl flex-col gap-10">
      {editando && <input type="hidden" name="id" value={post!.id} />}

      <FormSection title="Identificação">
        <Field
          scope={scope}
          name="title"
          label="Título"
          required
          defaultValue={post?.title ?? ""}
          description="Aparece como título do artigo no blog."
        />
        <div className="grid gap-4 tablet:grid-cols-2">
          <Field
            scope={scope}
            name="slug"
            label="Endereço da página"
            defaultValue={post?.slug ?? ""}
            description="Em branco, geramos a partir do título."
          />
          <Field
            scope={scope}
            name="category"
            label="Categoria"
            placeholder="Power BI"
            defaultValue={post?.category ?? ""}
          />
        </div>
        <TextareaField
          scope={scope}
          name="excerpt"
          label="Resumo"
          rows={2}
          defaultValue={post?.excerpt ?? ""}
          description="É o texto que aparece no card da listagem do blog."
        />
      </FormSection>

      <FormSection
        title="Traduções"
        description="Opcional. Preencha para o card aparecer traduzido. Em branco, o site usa o português."
      >
        {IDIOMAS.map((i) => (
          <div key={i.sufixo} className="flex flex-col gap-4 border-l-2 border-ds-line pl-4">
            <p className="text-meta uppercase text-ds-text-3">{i.nome}</p>
            <Field
              scope={scope}
              name={`title_${i.sufixo}`}
              label={`Título em ${i.nome.toLowerCase()}`}
              defaultValue={t(`title_${i.sufixo}` as keyof NonNullable<Post>)}
            />
            <TextareaField
              scope={scope}
              name={`excerpt_${i.sufixo}`}
              label={`Resumo em ${i.nome.toLowerCase()}`}
              rows={2}
              defaultValue={t(`excerpt_${i.sufixo}` as keyof NonNullable<Post>)}
            />
            <Field
              scope={scope}
              name={`category_${i.sufixo}`}
              label={`Categoria em ${i.nome.toLowerCase()}`}
              defaultValue={t(`category_${i.sufixo}` as keyof NonNullable<Post>)}
              className="max-w-xs"
            />
          </div>
        ))}
      </FormSection>

      <FormSection title="Imagem de capa">
        <CoverField scope={scope} defaultUrl={post?.cover_url} />
      </FormSection>

      <FormSection title="Conteúdo">
        <TextareaField
          scope={scope}
          name="content"
          label="Texto do artigo"
          rows={12}
          defaultValue={post?.content ?? ""}
        />
        <Field
          scope={scope}
          name="author"
          label="Autor"
          defaultValue={post?.author ?? "DriveData Academy"}
          className="max-w-xs"
        />
      </FormSection>

      <FormSection title="Publicação">
        <CheckboxField
          scope={scope}
          name="published"
          label="Post publicado"
          defaultChecked={post?.published ?? false}
          description="Enquanto desmarcado, o artigo não aparece no blog."
        />
      </FormSection>

      <FormActions>
        <Button type="submit" size="lg">{editando ? "Salvar alterações" : "Criar post"}</Button>
        <Button href="/admin/posts" variant="ghost">Cancelar</Button>
      </FormActions>
    </form>
  );
}
