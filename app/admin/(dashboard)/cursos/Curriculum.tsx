import {
  addModule,
  renameModule,
  deleteModule,
  addLesson,
  saveLesson,
  deleteLesson,
  moveItem,
} from "./actions";
import { setModuleRelease } from "../lives/actions";

// ISO -> "YYYY-MM-DDTHH:mm" no fuso do Brasil (para datetime-local).
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const p = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const g = (t: string) => p.find((x) => x.type === t)?.value || "";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

type Lesson = {
  id: string;
  title: string;
  type: string;
  video_id: string | null;
  video_provider: string | null;
  content: string | null;
  duration: string | null;
  is_preview: boolean;
  materials: { title: string; url: string }[] | null;
};
type Module = { id: string; title: string; available_at?: string | null; lessons: Lesson[] };

const field =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";
const smallBtn =
  "rounded-lg border border-white/10 px-2.5 py-1 text-xs font-medium text-slate-300 hover:border-white/30 hover:text-white";

function MoveButtons({ table, col, val, id, courseId }: { table: string; col: string; val: string; id: string; courseId: string }) {
  return (
    <>
      {[-1, 1].map((dir) => (
        <form key={dir} action={moveItem}>
          <input type="hidden" name="table" value={table} />
          <input type="hidden" name="filter_col" value={col} />
          <input type="hidden" name="filter_val" value={val} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="dir" value={dir} />
          <input type="hidden" name="course_id" value={courseId} />
          <button className={smallBtn} aria-label={dir < 0 ? "Subir" : "Descer"}>{dir < 0 ? "↑" : "↓"}</button>
        </form>
      ))}
    </>
  );
}

export default function Curriculum({ courseId, modules }: { courseId: string; modules: Module[] }) {
  return (
    <div className="mt-10">
      <h2 className="font-display text-lg font-bold text-white">Currículo</h2>
      <p className="mt-1 text-sm text-slate-400">Organize em módulos e aulas. Use ↑ ↓ para ordenar.</p>

      <div className="mt-5 space-y-5">
        {modules.map((m) => (
          <div key={m.id} className="glass rounded-2xl border border-white/8 p-5">
            {/* Cabeçalho do módulo */}
            <div className="flex flex-wrap items-center gap-2">
              <form action={renameModule} className="flex flex-1 items-center gap-2">
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="course_id" value={courseId} />
                <input name="title" defaultValue={m.title} className={`${field} font-semibold`} />
                <button className={smallBtn}>Renomear</button>
              </form>
              <MoveButtons table="course_modules" col="course_id" val={courseId} id={m.id} courseId={courseId} />
              <form action={deleteModule}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="course_id" value={courseId} />
                <button className="rounded-lg border border-white/10 px-2.5 py-1 text-xs font-medium text-slate-300 hover:border-red-400/40 hover:text-red-400">Excluir módulo</button>
              </form>
            </div>

            {/* Drip: liberar em */}
            <form action={setModuleRelease} className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <input type="hidden" name="module_id" value={m.id} />
              <input type="hidden" name="course_id" value={courseId} />
              <span>Liberar em:</span>
              <input type="datetime-local" name="available_at" defaultValue={toLocalInput(m.available_at ?? null)} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none focus:border-brand-green/60" />
              <button className={smallBtn}>Salvar data</button>
              <span className="text-slate-500">(vazio = liberado)</span>
            </form>

            {/* Aulas */}
            <div className="mt-4 space-y-2">
              {m.lessons.map((l) => (
                <details key={l.id} className="rounded-xl border border-white/8 bg-white/[0.02]">
                  <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-2.5 text-sm text-slate-200">
                    <span className="flex items-center gap-2">
                      <span className="text-slate-500">{l.type === "video" ? "▶" : "📄"}</span>
                      {l.title}
                      {l.is_preview && <span className="rounded-full bg-brand-green/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-brand-green">preview</span>}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MoveButtons table="lessons" col="module_id" val={m.id} id={l.id} courseId={courseId} />
                    </span>
                  </summary>
                  <form action={saveLesson} className="space-y-3 border-t border-white/8 p-4">
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="course_id" value={courseId} />
                    <input name="title" defaultValue={l.title} placeholder="Título da aula" className={field} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <select name="type" defaultValue={l.type} className={`${field} [&>option]:bg-ink-900`}>
                        <option value="video">Vídeo</option>
                        <option value="text">Texto</option>
                      </select>
                      <input name="duration" defaultValue={l.duration ?? ""} placeholder="Duração (ex.: 12 min)" className={field} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                      <select name="video_provider" defaultValue={l.video_provider ?? "youtube"} className={`${field} [&>option]:bg-ink-900`}>
                        <option value="youtube">YouTube</option>
                        <option value="panda">Panda Video</option>
                      </select>
                      <input name="video_id" defaultValue={l.video_id ?? ""} placeholder="Link/ID do vídeo (YouTube ou id da Panda)" className={field} />
                    </div>
                    <textarea name="content" defaultValue={l.content ?? ""} rows={3} placeholder="Conteúdo em texto (para aulas do tipo Texto)" className={`${field} resize-y`} />
                    <div className="space-y-1">
                      <textarea
                        name="materials"
                        rows={2}
                        defaultValue={(l.materials ?? []).map((m) => `${m.title} | ${m.url}`).join("\n")}
                        placeholder="Materiais de apoio (um por linha): Ex.: Apostila PDF | https://..."
                        className={`${field} resize-y`}
                      />
                      <p className="text-[0.7rem] text-slate-500">Um material por linha, no formato <span className="text-slate-400">Título | URL</span>.</p>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-slate-300">
                      <input type="checkbox" name="is_preview" defaultChecked={l.is_preview} className="h-4 w-4 accent-emerald-400" /> Aula de preview (aberta sem matrícula)
                    </label>
                    <div className="flex items-center gap-2">
                      <button className="rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2 text-xs font-semibold text-ink-900">Salvar aula</button>
                      <button formAction={deleteLesson} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 hover:border-red-400/40 hover:text-red-400">Excluir</button>
                    </div>
                  </form>
                </details>
              ))}
            </div>

            {/* Nova aula */}
            <form action={addLesson} className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-white/10 p-3">
              <input type="hidden" name="module_id" value={m.id} />
              <input type="hidden" name="course_id" value={courseId} />
              <input name="title" required placeholder="Nova aula..." className={`${field} flex-1`} />
              <button className="rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/15">+ Aula</button>
            </form>
          </div>
        ))}
      </div>

      {/* Novo módulo */}
      <form action={addModule} className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-white/10 p-4">
        <input type="hidden" name="course_id" value={courseId} />
        <input name="title" required placeholder="Novo módulo (ex.: Introdução)" className={`${field} flex-1`} />
        <button className="rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2 text-sm font-semibold text-ink-900">+ Módulo</button>
      </form>
    </div>
  );
}
