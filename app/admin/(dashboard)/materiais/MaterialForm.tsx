import { Button } from "@/components/ui/primitives";
import {
  Field, TextareaField, CheckboxField, FileField, FormSection, FormActions,
} from "@/components/ui/form";
import { saveMaterial } from "./actions";

type Material = {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  cover_url: string | null;
  file_url: string | null;
  cta_text: string | null;
  email_subject: string | null;
  email_message: string | null;
  ask_phone: boolean;
  ask_company: boolean;
  ask_role: boolean;
  published: boolean;
} | null;

export default function MaterialForm({ material }: { material?: Material }) {
  const editando = !!material;
  // Um formulário por página aqui, mas o scope segue a mesma convenção do
  // primeiro piloto: id previsível e único, sem depender de useId.
  const scope = editando ? `material-${material!.id}` : "material-novo";

  return (
    <form action={saveMaterial} className="flex max-w-3xl flex-col gap-10">
      {editando && <input type="hidden" name="id" value={material!.id} />}

      <FormSection title="Identificação">
        <Field
          scope={scope}
          name="title"
          label="Título do material"
          required
          defaultValue={material?.title ?? ""}
          description="Aparece como título da página pública."
        />
        <Field
          scope={scope}
          name="slug"
          label="Endereço da página"
          defaultValue={material?.slug ?? ""}
          description="A página fica em /materiais/ mais este trecho. Em branco, geramos a partir do título."
        />
        <Field
          scope={scope}
          name="subtitle"
          label="Subtítulo"
          defaultValue={material?.subtitle ?? ""}
          description="Uma linha de apoio, logo abaixo do título."
        />
        <TextareaField
          scope={scope}
          name="description"
          label="Descrição"
          rows={5}
          defaultValue={material?.description ?? ""}
          description="O texto da página. Explique o que a pessoa vai receber."
        />
      </FormSection>

      <FormSection
        title="Conteúdo entregue"
        description="É o que o lead recebe por e-mail, anexado e com link, e também baixa na página."
      >
        <FileField
          scope={scope}
          name="content_file"
          label="Arquivo"
          current={material?.file_url ? { url: material.file_url, label: "ver arquivo" } : null}
          description="PDF, e-book, planilha ou outro."
        />
        <Field
          scope={scope}
          name="file_url"
          label="Ou um link externo"
          type="url"
          placeholder="https://"
          defaultValue={material?.file_url ?? ""}
          description="Use quando o arquivo já estiver hospedado em outro lugar."
        />
      </FormSection>

      <FormSection title="Imagem de capa" description="Opcional. Aparece no topo da página do material.">
        {/* cover_file era o único campo do formulário sem nome acessível. */}
        <FileField
          scope={scope}
          name="cover_file"
          label="Enviar uma imagem"
          accept="image/*"
          preview={material?.cover_url ?? null}
          description="Proporção 16:9 fica melhor."
        />
        <Field
          scope={scope}
          name="cover_url"
          label="Ou uma URL de imagem"
          type="url"
          placeholder="https://"
          defaultValue={material?.cover_url ?? ""}
        />
      </FormSection>

      <FormSection
        title="Formulário de captura"
        description="Nome e e-mail são sempre pedidos. Marque os campos extras que quiser exigir."
      >
        <Field
          scope={scope}
          name="cta_text"
          label="Texto do botão"
          placeholder="Quero receber"
          defaultValue={material?.cta_text ?? ""}
          className="max-w-xs"
        />
        <div className="flex flex-col gap-3 tablet:flex-row tablet:flex-wrap tablet:gap-x-8">
          <CheckboxField scope={scope} name="ask_phone" label="Pedir telefone" defaultChecked={material?.ask_phone ?? true} />
          <CheckboxField scope={scope} name="ask_company" label="Pedir empresa" defaultChecked={material?.ask_company ?? true} />
          <CheckboxField scope={scope} name="ask_role" label="Pedir cargo" defaultChecked={material?.ask_role ?? false} />
        </div>
      </FormSection>

      <FormSection
        title="E-mail de entrega"
        description="Opcional. O conteúdo já vai anexado e com link, mesmo sem personalizar."
      >
        <Field
          scope={scope}
          name="email_subject"
          label="Assunto"
          placeholder="Seu material chegou"
          defaultValue={material?.email_subject ?? ""}
        />
        <TextareaField
          scope={scope}
          name="email_message"
          label="Mensagem extra"
          rows={3}
          defaultValue={material?.email_message ?? ""}
          description="Um recado curto antes do link do material."
        />
      </FormSection>

      <FormSection title="Publicação">
        <CheckboxField
          scope={scope}
          name="published"
          label="Página publicada"
          defaultChecked={material?.published ?? false}
          description="Enquanto desmarcada, o endereço não abre para o público."
        />
      </FormSection>

      <FormActions>
        <Button type="submit" size="lg">{editando ? "Salvar alterações" : "Criar material"}</Button>
        <Button href="/admin/materiais" variant="ghost">Cancelar</Button>
      </FormActions>
    </form>
  );
}
