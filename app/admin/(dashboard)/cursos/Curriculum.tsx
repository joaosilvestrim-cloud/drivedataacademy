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
import VideoField from "./VideoField";

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
const flabel = "block text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500";
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

const VideoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 5h11a1 1 0 011 1v3l4-2v10l-4-2v3a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const TextIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
);

export default function Curriculum({ courseId, modules }: { courseId: string; modules: Module[] }) {
  const totalLessons = modules.reduce((s, m) => s + m.lessons.length, 0);

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold text-white">Currículo</h2>
          <p className="mt-1 text-sm text-slate-400">{modules.length} módulo(s) · {totalLessons} aula(s). Use ↑ ↓ para ordenar.</p>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        {modules.map((m, mi) => (
          <div key={m.id} className="glass rounded-2xl border border-white/8 p-5">
            {/* Cabeçalho do módulo */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 font-display text-sm font-bold text-brand-green">{mi + 1}</span>
              <form action={renameModule} className="flex flex-1 items-center gap-2">
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="course_id" value={courseId} />
                <input name="title" defaultValue={m.title} className={`${field} font-semibold`} />
                <button className={smallBtn}>Renomear</button>
              </form>
              <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-400">{m.lessons.length} aula(s)</span>
              <MoveButtons table="course_modules" col="course_id" val={courseId} id={m.id} courseId={courseId} />
              <form action={deleteModule}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="course_id" value={courseId} />
                <button className="rounded-lg border border-white/10 px-2.5 py-1 text-xs font-medium text-slate-300 hover:border-red-400/40 hover:text-red-400">Excluir</button>
              </form>
            </div>

            {/* Drip: liberar em */}
            <form action={setModuleRelease} className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-slate-400">
              <input type="hidden" name="module_id" value={m.id} />
              <input type="hidden" name="course_id" value={courseId} />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-slate-500"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span>Liberar módulo em:</span>
              <input type="datetime-local" name="available_at" defaultValue={toLocalInput(m.available_at ?? null)} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none focus:border-brand-green/60" />
              <button className={smallBtn}>Salvar</button>
              <span className="text-slate-600">vazio = liberado agora</span>
            </form>

            {/* Aulas */}
            <div className="mt-4 space-y-2">
              {m.lessons.map((l, li) => (
                <details key={l.id} className="rounded-xl border border-white/8 bg-white/[0.02]">
                  <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3 text-sm text-slate-200">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="text-slate-600">{li + 1}.</span>
                      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${l.type === "text" ? "bg-brand-blue/15 text-brand-blue" : "bg-brand-green/15 text-brand-green"}`}>
                        {l.type === "text" ? <TextIcon /> : <VideoIcon />}
                      </span>
                      <span className="truncate font-medium text-white">{l.title}</span>
                      {l.type !== "text" && l.video_id && (
                        <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-slate-400">{l.video_provider === "panda" ? "Panda" : "YouTube"}</span>
                      )}
                      {l.is_preview && <span className="shrink-0 rounded-full bg-brand-green/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-brand-green">preview</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {l.duration && <span className="text-xs text-slate-500">{l.duration}</span>}
                      <MoveButtons table="lessons" col="module_id" val={m.id} id={l.id} courseId={courseId} />
                    </span>
                  </summary>

                  <form action={saveLesson} className="space-y-4 border-t border-white/8 p-4">
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="course_id" value={courseId} />

                    <div className="space-y-1.5">
                      <label className={flabel}>Título</label>
                      <input name="title" defaultValue={l.title} placeholder="Título da aula" className={field} />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className={flabel}>Tipo</label>
                        <select name="type" defaultValue={l.type} className={`${field} [&>option]:bg-ink-900`}>
                          <option value="video">Vídeo</option>
                          <option value="text">Texto</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className={flabel}>Duração</label>
                        <input name="duration" defaultValue={l.duration ?? ""} placeholder="Ex.: 12 min" className={field} />
                      </div>
                    </div>

                    {/* Vídeo + preview */}
                    <VideoField defaultProvider={l.video_provider ?? "youtube"} defaultValue={l.video_id ?? ""} />

                    {/* Texto */}
                    <div className="space-y-1.5">
                      <label className={flabel}>Conteúdo em texto (para aulas do tipo Texto)</label>
                      <textarea name="content" defaultValue={l.content ?? ""} rows={3} placeholder="Escreva o conteúdo da aula..." className={`${field} resize-y`} />
                    </div>

                    {/* Materiais */}
                    <div className="space-y-1.5">
                      <label className={flabel}>Materiais de apoio</label>
                      <textarea
                        name="materials"
                        rows={2}
                        defaultValue={(l.materials ?? []).map((mm) => `${mm.title} | ${mm.url}`).join("\n")}
                        placeholder="Apostila PDF | https://..."
                        className={`${field} resize-y`}
                      />
                      <p className="text-[0.7rem] text-slate-500">Um por linha, no formato <span className="text-slate-400">Título | URL</span>.</p>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-slate-300">
                      <input type="checkbox" name="is_preview" defaultChecked={l.is_preview} className="h-4 w-4 accent-emerald-400" /> Aula de preview (aberta sem matrícula)
                    </label>

                    <div className="flex items-center gap-2 border-t border-white/8 pt-3">
                      <button className="rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2 text-xs font-semibold text-ink-900">Salvar aula</button>
                      <button formAction={deleteLesson} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 hover:border-red-400/40 hover:text-red-400">Excluir</button>
                    </div>
                  </form>
                </details>
              ))}
              {m.lessons.length === 0 && (
                <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-slate-500">Nenhuma aula neste módulo. Adicione a primeira abaixo.</p>
              )}
            </div>

            {/* Nova aula */}
            <form action={addLesson} className="mt-3 rounded-xl border border-dashed border-white/10 p-3">
              <input type="hidden" name="module_id" value={m.id} />
              <input type="hidden" name="course_id" value={courseId} />
              <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">Nova aula</p>
              <div className="flex flex-wrap items-center gap-2">
                <input name="title" required placeholder="Título da aula" className={`${field} min-w-[180px] flex-1`} />
                <select name="type" defaultValue="video" className={`${field} w-auto [&>option]:bg-ink-900`}>
                  <option value="video">Vídeo</option>
                  <option value="text">Texto</option>
                </select>
                <button className="rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15">+ Adicionar</button>
              </div>
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
