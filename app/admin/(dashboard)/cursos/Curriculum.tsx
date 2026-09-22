import { CalendarDays } from "lucide-react";
import { Button, ICON } from "@/components/ui/primitives";
import { Field, SelectField, TextareaField, CheckboxField, FormActions } from "@/components/ui/form";
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
import MateriaisDaAula, { type MaterialDaAula } from "./MateriaisDaAula";

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
  arquivos?: MaterialDaAula[];
};
type Module = { id: string; title: string; available_at?: string | null; lessons: Lesson[] };

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
const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
              {/* Renomear é edição no lugar, dentro do cabeçalho do módulo. O rótulo
                  existe e é lido, mas fica oculto: torná-lo visível empurraria a
                  linha para baixo e redesenharia a árvore, que está fora do lote. */}
              <form action={renameModule} className="flex flex-1 items-center gap-2">
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="course_id" value={courseId} />
                <label htmlFor={`modulo-${m.id}-title`} className="sr-only">Nome do módulo {mi + 1}</label>
                <input
                  id={`modulo-${m.id}-title`}
                  name="title"
                  defaultValue={m.title}
                  className="h-10 w-full rounded-ctl border border-ds-line bg-ds-surface px-3 text-body font-medium text-ds-text transition-colors duration-fast ease-ds hover:border-ds-text-3"
                />
                <Button type="submit" variant="secondary" size="sm">Renomear</Button>
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
            <form action={setModuleRelease} className="mt-3 flex flex-wrap items-center gap-2.5 rounded-srf border border-ds-line-soft px-3 py-2">
              <input type="hidden" name="module_id" value={m.id} />
              <input type="hidden" name="course_id" value={courseId} />
              <CalendarDays size={ICON.sm} strokeWidth={ICON.stroke} aria-hidden="true" className="shrink-0 text-ds-text-3" />
              <label htmlFor={`liberacao-${m.id}-available_at`} className="text-label text-ds-text-2">Liberar módulo em</label>
              <input
                id={`liberacao-${m.id}-available_at`}
                type="datetime-local"
                name="available_at"
                defaultValue={toLocalInput(m.available_at ?? null)}
                className="h-9 rounded-ctl border border-ds-line bg-ds-surface px-2.5 text-body-sm text-ds-text transition-colors duration-fast ease-ds hover:border-ds-text-3"
              />
              <Button type="submit" variant="secondary" size="sm">Salvar</Button>
              <span className="text-caption text-ds-text-3">Em branco, o módulo fica liberado agora.</span>
            </form>

            {/* Aulas */}
            <div className="mt-4 space-y-2">
              {m.lessons.map((l, li) => (
                <details key={l.id} className="rounded-xl border border-white/8 bg-white/[0.02]">
                  <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3 text-sm text-slate-200">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="text-slate-600">{li + 1}.</span>
                      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${l.type === "text" ? "bg-brand-blue/15 text-brand-blue" : l.type === "materiais" ? "bg-amber-400/15 text-amber-300" : "bg-brand-green/15 text-brand-green"}`}>
                        {l.type === "text" ? <TextIcon /> : l.type === "materiais" ? <DownloadIcon /> : <VideoIcon />}
                      </span>
                      <span className="truncate font-medium text-white">{l.title}</span>
                      {(l.arquivos ?? []).length > 0 && (
                        <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-slate-400">{(l.arquivos ?? []).length} arquivo(s)</span>
                      )}
                      {l.type === "video" && l.video_id && (
                        <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-slate-400">{l.video_provider === "panda" ? "Panda" : "YouTube"}</span>
                      )}
                      {l.is_preview && <span className="shrink-0 rounded-full bg-brand-green/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-brand-green">preview</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {l.duration && <span className="text-xs text-slate-500">{l.duration}</span>}
                      <MoveButtons table="lessons" col="module_id" val={m.id} id={l.id} courseId={courseId} />
                    </span>
                  </summary>

                  {/* Na aula de materiais os arquivos SÃO a aula, então vêm antes
                      do formulário. Na aula de vídeo eles são apoio e aparecem
                      depois, junto do resto. */}
                  {l.type === "materiais" && (
                    <MateriaisDaAula lessonId={l.id} courseId={courseId} itens={l.arquivos ?? []} />
                  )}

                  <form action={saveLesson} className="flex flex-col gap-4 border-t border-ds-line-soft p-4">
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="course_id" value={courseId} />

                    <Field
                      scope={`aula-${l.id}`}
                      name="title"
                      label="Título"
                      defaultValue={l.title}
                    />

                    <div className={`grid gap-4 ${l.type === "materiais" ? "" : "tablet:grid-cols-2"}`}>
                      <SelectField scope={`aula-${l.id}`} name="type" label="Tipo" defaultValue={l.type}>
                        <option value="video">Vídeo</option>
                        <option value="text">Texto</option>
                        <option value="materiais">Materiais para download</option>
                      </SelectField>
                      {l.type !== "materiais" && (
                        <Field
                          scope={`aula-${l.id}`}
                          name="duration"
                          label="Duração"
                          defaultValue={l.duration ?? ""}
                          placeholder="12 min"
                          description="Texto livre, como aparece para o aluno."
                        />
                      )}
                    </div>

                    {/* Vídeo e prévia continuam no VideoField, que é controle
                        especializado e fica para o sublote D6E. */}
                    {l.type !== "materiais" && (
                      <VideoField scope={`aula-${l.id}`} defaultProvider={l.video_provider ?? "youtube"} defaultValue={l.video_id ?? ""} />
                    )}

                    <TextareaField
                      scope={`aula-${l.id}`}
                      name="content"
                      label={l.type === "materiais" ? "Texto de abertura" : "Conteúdo em texto"}
                      rows={3}
                      defaultValue={l.content ?? ""}
                      description={l.type === "materiais" ? "Aparece acima dos arquivos: o que tem aqui e como usar. Opcional." : "Usado nas aulas do tipo Texto."}
                    />

                    {l.type !== "materiais" && (
                      <TextareaField
                        scope={`aula-${l.id}`}
                        name="materials"
                        label="Links de apoio"
                        rows={2}
                        defaultValue={(l.materials ?? []).map((mm) => `${mm.title} | ${mm.url}`).join("\n")}
                        placeholder="Documentação oficial | https://..."
                        description="Para o que mora fora daqui: documentação, artigo, repositório. Um por linha, no formato Título | URL. Arquivo para o aluno baixar vai no bloco de anexos, logo abaixo."
                      />
                    )}

                    <CheckboxField
                      scope={`aula-${l.id}`}
                      name="is_preview"
                      label="Aula de preview"
                      defaultChecked={l.is_preview}
                      description="Aberta sem matrícula."
                    />

                    <FormActions
                      destructive={<Button formAction={deleteLesson} variant="danger" size="sm">Excluir aula</Button>}
                    >
                      <Button type="submit" size="sm">Salvar aula</Button>
                    </FormActions>
                  </form>

                  {/* Anexos da aula de vídeo ou texto. Fica fora do <form> de
                      propósito: o MateriaisDaAula tem upload e formulário
                      próprios, e form dentro de form o navegador ignora. */}
                  {l.type !== "materiais" && (
                    <div className="border-t border-ds-line-soft">
                      <MateriaisDaAula lessonId={l.id} courseId={courseId} itens={l.arquivos ?? []} />
                    </div>
                  )}
                </details>
              ))}
              {m.lessons.length === 0 && (
                <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-slate-500">Nenhuma aula neste módulo. Adicione a primeira abaixo.</p>
              )}
            </div>

            {/* Nova aula */}
            <form action={addLesson} className="mt-4 flex flex-col gap-3 border-t border-ds-line-soft pt-4">
              <input type="hidden" name="module_id" value={m.id} />
              <input type="hidden" name="course_id" value={courseId} />
              <p className="text-meta uppercase text-ds-text-3">Nova aula</p>
              <div className="flex flex-wrap items-end gap-3">
                <Field
                  scope={`aula-nova-${m.id}`}
                  name="title"
                  label="Título da aula"
                  required
                  className="min-w-[14rem] flex-1"
                />
                <SelectField scope={`aula-nova-${m.id}`} name="type" label="Tipo" defaultValue="video" className="w-auto">
                  <option value="video">Vídeo</option>
                  <option value="text">Texto</option>
                  <option value="materiais">Materiais para download</option>
                </SelectField>
                <Button type="submit" variant="secondary">Adicionar aula</Button>
              </div>
            </form>
          </div>
        ))}
      </div>

      {/* Novo módulo */}
      <form action={addModule} className="mt-8 flex flex-wrap items-end gap-3 border-t border-ds-line pt-6">
        <input type="hidden" name="course_id" value={courseId} />
        <Field
          scope="modulo-novo"
          name="title"
          label="Novo módulo"
          required
          placeholder="Introdução"
          className="min-w-[16rem] flex-1"
        />
        <Button type="submit">Criar módulo</Button>
      </form>
    </div>
  );
}
