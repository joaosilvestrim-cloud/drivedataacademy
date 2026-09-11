import { Button } from "@/components/ui/primitives";
import { Field, FormSection, FormActions } from "@/components/ui/form";
import { createQuiz, saveQuizSettings, deleteQuiz, addQuestion, saveQuestion, deleteQuestion } from "./quizActions";

type Question = { id: string; prompt: string; options: { text: string; correct: boolean }[] };
type Quiz = { id: string; title: string; pass_score: number; max_attempts: number; cooldown_hours: number; questions: Question[] } | null;

/* Uma pergunta é um formulário próprio, não um cartão dentro de cartão. O que
   separa uma da outra é a régua de cima e o número, não uma moldura.

   O mesmo formulário troca de action conforme o botão: o de enviar grava, o de
   excluir usa formAction. Os rádios de todas as perguntas compartilham o nome
   `correct`, e isso funciona porque cada pergunta é um <form> separado: o
   navegador agrupa rádio por formulário, não por página. */
function QuestionForm({ courseId, quizId, q, numero }: { courseId: string; quizId: string; q?: Question; numero: number | null }) {
  const opts = q?.options ?? [];
  const correctIdx = opts.findIndex((o) => o.correct);
  const scope = q ? `pergunta-${q.id}` : "pergunta-nova";

  return (
    <form action={q ? saveQuestion : addQuestion} className="flex flex-col gap-4 border-t border-ds-line pt-5">
      {q && <input type="hidden" name="id" value={q.id} />}
      <input type="hidden" name="quiz_id" value={quizId} />
      <input type="hidden" name="course_id" value={courseId} />

      <p className="text-meta uppercase text-ds-text-3">{numero === null ? "Nova pergunta" : `Pergunta ${numero}`}</p>

      <Field
        scope={scope}
        name="prompt"
        label="Enunciado"
        required
        defaultValue={q?.prompt ?? ""}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="text-label font-medium text-ds-text-2">Alternativas</legend>
        <p className="text-caption text-ds-text-3">
          O círculo à esquerda marca a alternativa correta. Alternativa em branco é descartada,
          inclusive quando é a marcada como correta.
        </p>
        <ul className="mt-1 flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => {
            const id = `${scope}-opt${i}`;
            return (
              <li key={i} className="flex flex-col gap-1.5">
                <label htmlFor={id} className="text-label font-medium text-ds-text-2">Alternativa {i + 1}</label>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="correct"
                    value={i}
                    defaultChecked={q ? correctIdx === i : i === 0}
                    aria-label={`Alternativa ${i + 1} é a correta`}
                    className="h-4 w-4 shrink-0 accent-[color:var(--ds-accent)]"
                  />
                  <input
                    id={id}
                    name={`opt${i}`}
                    defaultValue={opts[i]?.text ?? ""}
                    className="h-10 w-full rounded-ctl border border-ds-line bg-ds-surface px-3 text-body text-ds-text placeholder:text-ds-text-3 transition-colors duration-fast ease-ds hover:border-ds-text-3"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <FormActions
        destructive={q ? <Button formAction={deleteQuestion} variant="danger" size="sm">Excluir pergunta</Button> : undefined}
      >
        <Button type="submit" size="sm">{q ? "Salvar pergunta" : "Adicionar pergunta"}</Button>
      </FormActions>
    </form>
  );
}

export default function QuizBuilder({ courseId, quiz }: { courseId: string; quiz: Quiz }) {
  return (
    <div className="mt-12 flex max-w-2xl flex-col gap-8">
      <div className="border-b border-ds-line pb-2">
        <h2 className="font-display text-section font-semibold text-ds-text">Avaliação</h2>
        <p className="mt-1 text-body-sm text-ds-text-3">
          Quiz de múltipla escolha. O aluno precisa da nota mínima para ser aprovado.
        </p>
      </div>

      {!quiz ? (
        <form action={createQuiz}>
          <input type="hidden" name="course_id" value={courseId} />
          <Button type="submit" variant="secondary">Criar avaliação</Button>
        </form>
      ) : (
        <>
          <form action={saveQuizSettings} className="flex flex-col gap-5">
            <input type="hidden" name="quiz_id" value={quiz.id} />
            <input type="hidden" name="course_id" value={courseId} />

            <FormSection title="Regras da avaliação">
              <div className="grid gap-4 tablet:grid-cols-2 lg:grid-cols-4">
                <Field scope="quiz" name="title" label="Título" defaultValue={quiz.title} />
                <Field scope="quiz" name="pass_score" label="Nota mínima" type="number" min="0" max="100" defaultValue={quiz.pass_score} description="Em porcentagem." />
                <Field scope="quiz" name="max_attempts" label="Tentativas" type="number" min="1" defaultValue={quiz.max_attempts} />
                <Field scope="quiz" name="cooldown_hours" label="Cooldown" type="number" min="0" defaultValue={quiz.cooldown_hours} description="Em horas, entre uma tentativa e outra." />
              </div>
            </FormSection>

            <FormActions
              destructive={<Button formAction={deleteQuiz} variant="danger" size="sm">Excluir avaliação</Button>}
            >
              <Button type="submit">Salvar configurações</Button>
            </FormActions>
          </form>

          <section className="flex flex-col gap-6">
            <h3 className="font-display text-component font-semibold text-ds-text">
              Perguntas{quiz.questions.length > 0 && <span className="ml-2 font-sans text-meta font-normal uppercase text-ds-text-3">{quiz.questions.length}</span>}
            </h3>
            {quiz.questions.map((q, i) => (
              <QuestionForm key={q.id} courseId={courseId} quizId={quiz.id} q={q} numero={i + 1} />
            ))}
            <QuestionForm courseId={courseId} quizId={quiz.id} numero={null} />
          </section>
        </>
      )}
    </div>
  );
}
