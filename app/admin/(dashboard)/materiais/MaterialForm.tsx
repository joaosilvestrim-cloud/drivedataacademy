import Link from "next/link";
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

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-brand-green/60";
const label = "block text-sm font-medium text-slate-300";
const card = "glass rounded-2xl border border-white/8 p-6 space-y-5";

export default function MaterialForm({ material }: { material?: Material }) {
  return (
    <form action={saveMaterial} className="max-w-3xl space-y-6">
      {material && <input type="hidden" name="id" value={material.id} />}

      <div className={card}>
        <div className="space-y-1.5">
          <label className={label} htmlFor="title">Título do material</label>
          <input id="title" name="title" required defaultValue={material?.title ?? ""} className={field} />
        </div>
        <div className="space-y-1.5">
          <label className={label} htmlFor="slug">Slug (URL pública)</label>
          <input id="slug" name="slug" placeholder="gerado do título se vazio" defaultValue={material?.slug ?? ""} className={field} />
          <p className="text-xs text-slate-500">Página: <span className="text-slate-400">/materiais/&lt;slug&gt;</span></p>
        </div>
        <div className="space-y-1.5">
          <label className={label} htmlFor="subtitle">Subtítulo</label>
          <input id="subtitle" name="subtitle" defaultValue={material?.subtitle ?? ""} className={field} />
        </div>
        <div className="space-y-1.5">
          <label className={label} htmlFor="description">Descrição (texto da página)</label>
          <textarea id="description" name="description" rows={5} defaultValue={material?.description ?? ""} className={`${field} resize-y`} />
        </div>
      </div>

      <div className={card}>
        <div>
          <p className="text-sm font-semibold text-white">Conteúdo entregue</p>
          <p className="text-xs text-slate-400">O arquivo que o lead recebe por e-mail (anexo + link) e download na página. Ex.: PDF, e-book, planilha.</p>
        </div>
        <div className="space-y-1.5">
          <label className={label} htmlFor="content_file">Arquivo (PDF, etc.) — enviado por e-mail / download</label>
          <input id="content_file" name="content_file" type="file" className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white hover:file:bg-white/15" />
          {material?.file_url && <p className="text-xs text-slate-500">Atual: <a href={material.file_url} target="_blank" rel="noreferrer" className="text-brand-teal hover:underline">ver arquivo</a></p>}
        </div>
        <div className="space-y-1.5">
          <label className={label} htmlFor="file_url">Ou um link externo</label>
          <input id="file_url" name="file_url" placeholder="https://..." defaultValue={material?.file_url ?? ""} className={field} />
        </div>
      </div>

      <div className={card}>
        <div>
          <p className="text-sm font-semibold text-white">Imagem de capa</p>
          <p className="text-xs text-slate-400">Aparece na página do material (opcional).</p>
        </div>
        {material?.cover_url && (
          <div className="aspect-[16/9] w-full max-w-xs overflow-hidden rounded-xl border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={material.cover_url} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <input id="cover_file" name="cover_file" type="file" accept="image/*" className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white hover:file:bg-white/15" />
        <div className="space-y-1.5">
          <label className={label} htmlFor="cover_url">Ou uma URL de imagem</label>
          <input id="cover_url" name="cover_url" placeholder="https://..." defaultValue={material?.cover_url ?? ""} className={field} />
        </div>
      </div>

      <div className={card}>
        <div>
          <p className="text-sm font-semibold text-white">Campos do formulário</p>
          <p className="text-xs text-slate-400">Nome e e-mail são sempre pedidos. Marque os campos extras que quiser exigir.</p>
        </div>
        <div className="space-y-1.5">
          <label className={label} htmlFor="cta_text">Texto do botão</label>
          <input id="cta_text" name="cta_text" placeholder="Quero receber" defaultValue={material?.cta_text ?? ""} className={`${field} max-w-xs`} />
        </div>
        <div className="flex flex-wrap gap-5 pt-1 text-sm text-slate-300">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="ask_phone" defaultChecked={material?.ask_phone ?? true} className="h-4 w-4 accent-emerald-400" /> Pedir telefone
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="ask_company" defaultChecked={material?.ask_company ?? true} className="h-4 w-4 accent-emerald-400" /> Pedir empresa
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="ask_role" defaultChecked={material?.ask_role ?? false} className="h-4 w-4 accent-emerald-400" /> Pedir cargo
          </label>
        </div>
      </div>

      <div className={card}>
        <div>
          <p className="text-sm font-semibold text-white">E-mail de entrega</p>
          <p className="text-xs text-slate-400">Personalize o e-mail automático (opcional). O conteúdo já vai anexado e com link.</p>
        </div>
        <div className="space-y-1.5">
          <label className={label} htmlFor="email_subject">Assunto (opcional)</label>
          <input id="email_subject" name="email_subject" placeholder="Seu material: ..." defaultValue={material?.email_subject ?? ""} className={field} />
        </div>
        <div className="space-y-1.5">
          <label className={label} htmlFor="email_message">Mensagem extra (opcional)</label>
          <textarea id="email_message" name="email_message" rows={3} defaultValue={material?.email_message ?? ""} className={`${field} resize-y`} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <label className="flex items-center gap-3 text-sm text-slate-300">
          <input type="checkbox" name="published" defaultChecked={material?.published ?? false} className="h-4 w-4 accent-emerald-400" />
          Publicar (página acessível)
        </label>
        <div className="flex items-center gap-3">
          <Link href="/admin/materiais" className="text-sm text-slate-400 hover:text-white">Cancelar</Link>
          <button type="submit" className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
            Salvar
          </button>
        </div>
      </div>
    </form>
  );
}
