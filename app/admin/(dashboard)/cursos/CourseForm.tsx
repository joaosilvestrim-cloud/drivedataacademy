import { Button } from "@/components/ui/primitives";
import { Field, TextareaField, CheckboxField, FormSection, FormActions } from "@/components/ui/form";
import { saveCourse } from "./actions";
import CoverUpload from "./CoverUpload";
import { descontoCurso } from "@/lib/precoCurso";

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
  subscriber_price?: number | null;
  workload: string | null;
  certificate_enabled?: boolean;
  published: boolean;
  coming_soon?: boolean;
  members_only?: boolean;
} | null;

export default function CourseForm({ course, cargaCalculada }: { course?: Course; cargaCalculada?: string | null }) {
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
        <Field
          scope={scope}
          name="instructor_name"
          label="Instrutor"
          defaultValue={course?.instructor_name ?? "DriveData Academy"}
        />
        {/* Envio de capa: tem upload assinado e estado próprio, não é o FileField
            do Design System. Fica para um sublote específico, markup preservado. */}
        <CoverUpload initialUrl={course?.cover_url} />
      </FormSection>

      <FormSection
        title="Venda"
        description="Só assinantes compram treinamentos. A assinatura não abre o curso sozinha: o assinante paga o preço dele, com o desconto sobre o preço cheio."
      >
        <div className="grid gap-4 tablet:grid-cols-2">
          <Field
            scope={scope}
            name="price"
            label="Preço cheio"
            type="number"
            min="0"
            step="0.01"
            defaultValue={course?.price ?? 0}
            description="Em reais. Aparece riscado ao lado do preço de assinante."
          />
          <Field
            scope={scope}
            name="subscriber_price"
            label="Preço para assinante"
            type="number"
            min="0"
            step="0.01"
            defaultValue={course?.subscriber_price ?? ""}
            description="Vazio: ainda não está à venda. 0: incluso na assinatura. Para cobrar, mínimo de R$ 5."
          />
        </div>
        {course && descontoCurso(Number(course.price) || 0, course.subscriber_price ?? null) > 0 && (
          <p className="text-body-sm text-ds-text-2">
            O assinante vê <strong className="text-ds-accent">{descontoCurso(Number(course.price) || 0, course.subscriber_price ?? null)}% OFF</strong> na página do curso.
          </p>
        )}
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
          description={cargaCalculada ? `Aparece impressa no certificado. Em branco, usamos a soma das aulas: ${cargaCalculada}.` : "Aparece impressa no certificado. Em branco, usamos a soma da duração das aulas."}
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
        {/* Estado do meio: o aluno vê o curso e a capa, mas não entra nem se
            matricula. Só faz efeito com o curso publicado. */}
        <CheckboxField
          scope={scope}
          name="coming_soon"
          label="Marcar como “Em breve”"
          defaultChecked={course?.coming_soon ?? false}
          description="O curso aparece no catálogo com a etiqueta Em breve, sem matrícula e sem acesso às aulas. Desmarque quando o conteúdo estiver pronto."
        />
      </FormSection>

      <FormActions>
        <Button type="submit" size="lg">{editando ? "Salvar" : "Criar e adicionar aulas"}</Button>
        <Button href="/admin/cursos" variant="ghost">Cancelar</Button>
      </FormActions>
    </form>
  );
}
