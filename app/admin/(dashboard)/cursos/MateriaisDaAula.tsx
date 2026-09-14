import { Button } from "@/components/ui/primitives";
import { Field, TextareaField } from "@/components/ui/form";
import { tamanhoLegivel, extensao } from "@/lib/materiais";
import MaterialUpload from "./MaterialUpload";
import { salvarMaterialDaAula, excluirMaterialDaAula } from "./actions";

/* Arquivos de uma aula do tipo "materiais". Fica fora do formulário da aula
   porque cada arquivo tem o próprio formulário, e formulário dentro de
   formulário não é HTML válido. */

export type MaterialDaAula = {
  id: string;
  title: string;
  description: string | null;
  file_name: string | null;
  file_size: number | null;
  external_url: string | null;
};

export default function MateriaisDaAula({
  lessonId,
  courseId,
  itens,
}: {
  lessonId: string;
  courseId: string;
  itens: MaterialDaAula[];
}) {
  const scope = `materiais-${lessonId}`;
  return (
    <div className="flex flex-col gap-4 border-t border-ds-line-soft p-4">
      <p className="text-meta uppercase text-ds-text-3">Arquivos desta aula ({itens.length})</p>

      {itens.length > 0 ? (
        <ul className="flex flex-col">
          {itens.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-ds-line-soft py-2.5">
              <span className="text-body-sm font-medium text-ds-text">{m.title}</span>
              <span className="text-caption text-ds-text-3">
                {m.file_name ? `${extensao(m.file_name)} · ${tamanhoLegivel(m.file_size)}` : "link externo"}
              </span>
              <form action={excluirMaterialDaAula} className="ml-auto">
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="course_id" value={courseId} />
                <Button type="submit" variant="danger" size="sm">
                  Remover<span className="sr-only"> {m.title}</span>
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-caption text-ds-text-3">Nenhum arquivo ainda. Adicione o primeiro abaixo.</p>
      )}

      <form action={salvarMaterialDaAula} className="flex flex-col gap-4 rounded-srf border border-ds-line p-4">
        <input type="hidden" name="lesson_id" value={lessonId} />
        <input type="hidden" name="course_id" value={courseId} />
        <p className="text-label font-medium text-ds-text">Adicionar arquivo</p>
        <Field scope={scope} name="title" label="Nome do material" required placeholder="Dashboard de Vendas - arquivo .pbix" />
        <TextareaField scope={scope} name="description" label="Descrição" rows={2} description="O que tem dentro e para que serve. Opcional." />
        <MaterialUpload scope={scope} />
        <Field scope={scope} name="external_url" label="Ou um link" type="url" description="Drive, GitHub ou outro. Usado quando não há arquivo." />
        <div>
          <Button type="submit" size="sm">Adicionar à aula</Button>
        </div>
      </form>
    </div>
  );
}
