import { Button } from "@/components/ui/primitives";
import { Field, TextareaField, CheckboxField, FormSection, FormActions } from "@/components/ui/form";
import { saveCourse } from "./actions";
import CoverUpload from "./CoverUpload";

type Course = {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  cover_url: string | null;
  level: string | null;
  instructor_name: string | null;
  price: number;
  workload: string | null;
  certificate_enabled?: boolean;
  published: boolean;
} | null;

export default function CourseForm({ course }: { course?: Course }) {
  const editando = !!course;
  const scope = editando ? `curso-${course!.id}` : "curso-novo";

  return (
    <form action={saveCourse} className="flex max-w-2xl flex-col gap-10">
      {editando && <input type="hidden" name="id" value={course!.id} />}

      <FormSection title="Dados do curso">
        <Field
          scope={scope}
          name="title"
          label="Título do curso"
          required
          defaultValue={course?.title ?? ""}
        />
        <div className="grid gap-4 tablet:grid-cols-2">
          <Field
            scope={scope}
            name="slug"
            label="Endereço da página"
            defaultValue={course?.slug ?? ""}
            description="Em branco, geramos a partir do título."
          />
          <Field
            scope={scope}
            name="level"
            label="Nível"
            placeholder="Iniciante, Intermediário..."
            defaultValue={course?.level ?? ""}
          />
        </div>
        <Field
          scope={scope}
          name="subtitle"
          label="Subtítulo"
          defaultValue={course?.subtitle ?? ""}
        />
        <TextareaField
          scope={scope}
          name="description"
          label="Descrição"
          rows={4}
          defaultValue={course?.description ?? ""}
        />
        <div className="grid gap-4 tablet:grid-cols-2">
          <Field
            scope={scope}
            name="instructor_name"
            label="Instrutor"
            defaultValue={course?.instructor_name ?? "DriveData Academy"}
          />
          <Field
            scope={scope}
            name="price"
            label="Preço"
            type="number"
            min="0"
            step="0.01"
            defaultValue={course?.price ?? 0}
            description="Em reais. Zero deixa o curso gratuito."
          />
        </div>
        {/* Envio de capa: tem upload assinado e estado próprio, não é o FileField
            do Design System. Fica para um sublote específico, markup preservado. */}
        <CoverUpload initialUrl={course?.cover_url} />
      </FormSection>

      <FormSection
        title="Certificado"
        description="Emitido automaticamente quando o aluno conclui 100% das aulas e é aprovado na avaliação, se houver."
      >
        <CheckboxField
          scope={scope}
          name="certificate_enabled"
          label="Este curso emite certificado"
          defaultChecked={course?.certificate_enabled ?? true}
        />
        <Field
          scope={scope}
          name="workload"
          label="Carga horária"
          placeholder="8 horas"
          defaultValue={course?.workload ?? ""}
          description="Aparece impressa no certificado."
          className="max-w-xs"
        />
        <p className="text-body-sm">
          <a
            href={`/certificado/modelo${course?.title ? `?curso=${encodeURIComponent(course.title)}${course.workload ? `&carga=${encodeURIComponent(course.workload)}` : ""}` : ""}`}
            target="_blank"
            rel="noreferrer"
            className="text-ds-info underline decoration-ds-line underline-offset-4 hover:decoration-ds-info"
          >
            Ver modelo do certificado
          </a>
        </p>
      </FormSection>

      <FormSection title="Publicação">
        <CheckboxField
          scope={scope}
          name="published"
          label="Curso publicado no catálogo"
          defaultChecked={course?.published ?? false}
          description="Enquanto desmarcado, o curso não aparece no catálogo público nem nas respostas do assistente."
        />
      </FormSection>

      <FormActions>
        <Button type="submit" size="lg">{editando ? "Salvar" : "Criar e adicionar aulas"}</Button>
        <Button href="/admin/cursos" variant="ghost">Cancelar</Button>
      </FormActions>
    </form>
  );
}
