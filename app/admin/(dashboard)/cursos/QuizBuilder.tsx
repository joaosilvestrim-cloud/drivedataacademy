import { createQuiz, saveQuizSettings, deleteQuiz, addQuestion, saveQuestion, deleteQuestion } from "./quizActions";

type Question = { id: string; prompt: string; options: { text: string; correct: boolean }[] };
type Quiz = { id: string; title: string; pass_score: number; max_attempts: number; cooldown_hours: number; questions: Question[] } | null;

const field =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";

function QuestionForm({ courseId, quizId, q }: { courseId: string; quizId: string; q?: Question }) {
  const opts = q?.options ?? [];
  const correctIdx = opts.findIndex((o) => o.correct);
  return (
    <form action={q ? saveQuestion : addQuestion} className="space-y-2 rounded-xl border border-white/8 bg-white/[0.02] p-4">
      {q && <input type="hidden" name="id" value={q.id} />}
      <input type="hidden" name="quiz_id" value={quizId} />
      <input type="hidden" name="course_id" value={courseId} />
      <input name="prompt" required defaultValue={q?.prompt ?? ""} placeholder="Enunciado da pergunta" className={`${field} font-medium`} />
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <label key={i} className="flex items-center gap-2">
            <input type="radio" name="correct" value={i} defaultChecked={q ? correctIdx === i : i === 0} className="h-4 w-4 accent-emerald-400" />
            <input name={`opt${i}`} defaultValue={opts[i]?.text ?? ""} placeholder={`Alternativa ${i + 1}${i > 1 ? " (opcional)" : ""}`} className={field} />
          </label>
        ))}
      </div>
      <p className="text-xs text-slate-500">Marque o círculo da alternativa correta.</p>
      <div className="flex items-center gap-2">
        <button className="rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2 text-xs font-semibold text-ink-900">{q ? "Salvar pergunta" : "+ Adicionar pergunta"}</button>
        {q && (
          <button formAction={deleteQuestion} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 hover:border-red-400/40 hover:text-red-400">Excluir</button>
        )}
      </div>
    </form>
  );
}

export default function QuizBuilder({ courseId, quiz }: { courseId: string; quiz: Quiz }) {
  return (
    <div className="mt-10">
      <h2 className="font-display text-lg font-bold text-white">Avaliação</h2>
      <p className="mt-1 text-sm text-slate-400">Quiz de múltipla escolha. O aluno precisa da nota mínima para ser aprovado.</p>

      {!quiz ? (
        <form action={createQuiz} className="mt-4">
          <input type="hidden" name="course_id" value={courseId} />
          <button className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white hover:border-brand-green/50 hover:text-brand-green">
            + Criar avaliação
          </button>
        </form>
      ) : (
        <div className="mt-4 space-y-5">
          {/* Configurações */}
          <form action={saveQuizSettings} className="glass rounded-2xl border border-white/8 p-5">
            <input type="hidden" name="quiz_id" value={quiz.id} />
            <input type="hidden" name="course_id" value={courseId} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div><label className="text-xs text-slate-400">Título</label><input name="title" defaultValue={quiz.title} className={field} /></div>
              <div><label className="text-xs text-slate-400">Nota mínima (%)</label><input name="pass_score" type="number" min="0" max="100" defaultValue={quiz.pass_score} className={field} /></div>
              <div><label className="text-xs text-slate-400">Tentativas</label><input name="max_attempts" type="number" min="1" defaultValue={quiz.max_attempts} className={field} /></div>
              <div><label className="text-xs text-slate-400">Cooldown (horas)</label><input name="cooldown_hours" type="number" min="0" defaultValue={quiz.cooldown_hours} className={field} /></div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button className="rounded-lg bg-white/10 px-4 py-2 text-xs font-medium text-white hover:bg-white/15">Salvar configurações</button>
              <button formAction={deleteQuiz} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 hover:border-red-400/40 hover:text-red-400">Excluir avaliação</button>
            </div>
          </form>

          {/* Perguntas existentes */}
          <div className="space-y-3">
            {quiz.questions.map((q, i) => (
              <div key={q.id}>
                <p className="mb-1 text-xs font-semibold text-slate-500">Pergunta {i + 1}</p>
                <QuestionForm courseId={courseId} quizId={quiz.id} q={q} />
              </div>
            ))}
          </div>

          {/* Nova pergunta */}
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-500">Nova pergunta</p>
            <QuestionForm courseId={courseId} quizId={quiz.id} />
          </div>
        </div>
      )}
    </div>
  );
}
