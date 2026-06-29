import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminError from "../AdminError";
import ConfirmDeleteMaterial from "./ConfirmDeleteMaterial";
import { duplicateMaterial, togglePublishMaterial } from "./actions";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  let materials: any[] = [];
  let counts: Record<string, number> = {};
  try {
    const supabase = createAdminClient();
    const [{ data: mats }, { data: leads }] = await Promise.all([
      supabase.from("materials").select("id, title, slug, published, updated_at").order("updated_at", { ascending: false }),
      supabase.from("material_leads").select("material_id"),
    ]);
    materials = mats ?? [];
    for (const l of leads ?? []) {
      if (l.material_id) counts[l.material_id] = (counts[l.material_id] || 0) + 1;
    }
  } catch (e) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Materiais</h1>
        <div className="mt-6">
          <AdminError message={e instanceof Error ? e.message : "Erro desconhecido."} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Materiais</h1>
          <p className="mt-1 text-sm text-slate-400">Páginas de captura de leads ({materials.length}).</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/materiais/leads" className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:border-brand-green/50 hover:text-brand-green">
            Ver leads
          </Link>
          <Link href="/admin/materiais/new" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
            Novo material
          </Link>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {materials.map((m) => (
          <div key={m.id} className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full ${m.published ? "bg-brand-green" : "bg-slate-600"}`} />
                <Link href={`/admin/materiais/${m.id}`} className="truncate font-medium text-white hover:text-brand-green">{m.title}</Link>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {counts[m.id] || 0} lead(s)
                {" · "}
                {m.published ? (
                  <a href={`/materiais/${m.slug}`} target="_blank" rel="noreferrer" className="text-brand-teal hover:underline">/materiais/{m.slug}</a>
                ) : (
                  <span>Rascunho</span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <form action={togglePublishMaterial}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="next" value={(!m.published).toString()} />
                <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-brand-green/50 hover:text-brand-green">
                  {m.published ? "Despublicar" : "Publicar"}
                </button>
              </form>
              <form action={duplicateMaterial}>
                <input type="hidden" name="id" value={m.id} />
                <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-white/30 hover:text-white">
                  Duplicar
                </button>
              </form>
              <Link href={`/admin/materiais/${m.id}`} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-white/30 hover:text-white">
                Editar
              </Link>
              <ConfirmDeleteMaterial id={m.id} title={m.title} />
            </div>
          </div>
        ))}
        {materials.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-16 text-center">
            <p className="text-slate-400">Nenhum material ainda.</p>
            <Link href="/admin/materiais/new" className="mt-3 inline-block text-sm font-medium text-brand-green hover:underline">
              Criar o primeiro material →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
