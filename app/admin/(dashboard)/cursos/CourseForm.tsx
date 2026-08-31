import Link from "next/link";
import { saveCourse } from "./actions";

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

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60";
const label = "block text-sm font-medium text-slate-300";

export default function CourseForm({ course }: { course?: Course }) {
  return (
    <form action={saveCourse} className="max-w-2xl space-y-5">
      {course && <input type="hidden" name="id" value={course.id} />}

      <div className="glass rounded-2xl border border-white/8 p-6 space-y-5">
        <div className="space-y-1.5">
          <label className={label} htmlFor="title">Título do curso</label>
          <input id="title" name="title" required defaultValue={course?.title ?? ""} className={field} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={label} htmlFor="slug">Slug (URL)</label>
            <input id="slug" name="slug" placeholder="gerado do título" defaultValue={course?.slug ?? ""} className={field} />
          </div>
          <div className="space-y-1.5">
            <label className={label} htmlFor="level">Nível</label>
            <input id="level" name="level" placeholder="Iniciante, Intermediário..." defaultValue={course?.level ?? ""} className={field} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className={label} htmlFor="subtitle">Subtítulo</label>
          <input id="subtitle" name="subtitle" defaultValue={course?.subtitle ?? ""} className={field} />
        </div>
        <div className="space-y-1.5">
          <label className={label} htmlFor="description">Descrição</label>
          <textarea id="description" name="description" rows={4} defaultValue={course?.description ?? ""} className={`${field} resize-y`} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={label} htmlFor="instructor_name">Instrutor</label>
            <input id="instructor_name" name="instructor_name" defaultValue={course?.instructor_name ?? "DriveData Academy"} className={field} />
          </div>
          <div className="space-y-1.5">
            <label className={label} htmlFor="price">Preço (R$) — 0 = gratuito</label>
            <input id="price" name="price" type="number" min="0" step="0.01" defaultValue={course?.price ?? 0} className={field} />
          </div>
        </div>
        <div className="space-y-2">
          <label className={label}>Imagem de capa</label>
          <div className="flex items-start gap-4">
            {course?.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={course.cover_url} alt="Capa atual" className="h-20 w-32 shrink-0 rounded-lg border border-white/10 object-cover" />
            )}
            <div className="flex-1 space-y-2">
              <input id="cover_file" name="cover_file" type="file" accept="image/*" className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-brand-green file:to-brand-blue file:px-4 file:py-2 file:text-sm file:font-semibold file:text-ink-900 hover:file:opacity-90" />
              <p className="text-xs text-slate-500">Faça upload de uma imagem (JPG/PNG). Ou cole uma URL abaixo. O upload tem prioridade.</p>
              <input id="cover_url" name="cover_url" placeholder="https://... (opcional)" defaultValue={course?.cover_url ?? ""} className={field} />
            </div>
          </div>
        </div>
      </div>

      {/* Certificado */}
      <div className="glass rounded-2xl border border-white/8 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-green to-brand-blue text-lg text-ink-900">🎓</span>
          <div>
            <p className="font-display text-base font-bold text-white">Certificado</p>
            <p className="text-sm text-slate-400">Emitido automaticamente quando o aluno conclui 100% das aulas (e é aprovado na avaliação, se houver).</p>
          </div>
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-slate-200">
          <input type="checkbox" name="certificate_enabled" defaultChecked={course?.certificate_enabled ?? true} className="h-4 w-4 accent-emerald-400" />
          Este curso emite certificado
        </label>

        <div className="space-y-1.5">
          <label className={label} htmlFor="workload">Carga horária (aparece no certificado)</label>
          <input id="workload" name="workload" placeholder="Ex.: 8 horas" defaultValue={course?.workload ?? ""} className={`${field} max-w-xs`} />
        </div>

        <a href={`/certificado/modelo${course?.title ? `?curso=${encodeURIComponent(course.title)}${course.workload ? `&carga=${encodeURIComponent(course.workload)}` : ""}` : ""}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-brand-teal transition-colors hover:border-brand-teal/50">
          Ver modelo do certificado ↗
        </a>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <label className="flex items-center gap-3 text-sm text-slate-300">
          <input type="checkbox" name="published" defaultChecked={course?.published ?? false} className="h-4 w-4 accent-emerald-400" />
          Publicar no catálogo
        </label>
        <div className="flex items-center gap-3">
          <Link href="/admin/cursos" className="text-sm text-slate-400 hover:text-white">Cancelar</Link>
          <button type="submit" className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
            {course ? "Salvar" : "Criar e adicionar aulas"}
          </button>
        </div>
      </div>
    </form>
  );
}
