import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity } from "@/lib/community";
import { CATEGORIAS, categoria, tamanhoLegivel, extensao } from "@/lib/materiais";

export const dynamic = "force-dynamic";

/* Materiais prontos para o aluno baixar.

   A lista só aparece para quem tem acesso ao conteúdo. O botão não aponta para
   o arquivo: aponta para /conta/materiais/baixar/[id], que confere a assinatura
   de novo e só então entrega um link que expira em um minuto. */

export default async function MateriaisProntosPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  const liberado = await canUseCommunity(admin, user.id, user.email);

  if (!liberado) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.02] px-6 py-20 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-green to-brand-blue text-ink-900">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h1 className="font-display text-2xl font-bold text-white">Materiais prontos</h1>
        <p className="mt-2 text-slate-400">Arquivos de Power BI e templates exclusivos para assinantes.</p>
        <Link href="/matricula" className="mt-6 inline-block rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-6 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">Conhecer a assinatura</Link>
      </div>
    );
  }

  const { data } = await admin
    .from("ready_materials")
    .select("id, title, description, category, file_name, file_size, external_url, cover_url")
    .eq("published", true)
    .order("position")
    .order("created_at", { ascending: false });
  const itens = data ?? [];

  const grupos = CATEGORIAS.map((c) => ({ ...c, itens: itens.filter((i: any) => categoria(i.category).key === c.key) })).filter((g) => g.itens.length > 0);

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-brand-green">Materiais prontos</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-white">Baixe e use no seu dia a dia</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">Arquivos de Power BI, templates e planilhas preparados pela DriveData. Baixe, abra e adapte para o seu caso.</p>

      {grupos.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center">
          <p className="font-medium text-white">Os primeiros materiais estão chegando.</p>
          <p className="mt-1 text-sm text-slate-400">Assim que forem publicados, aparecem aqui para download.</p>
        </div>
      ) : (
        grupos.map((g) => (
          <section key={g.key} aria-labelledby={`cat-${g.key}`} className="mt-10">
            <h2 id={`cat-${g.key}`} className="flex items-center gap-2 font-display text-lg font-bold text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-brand-green"><path d={g.icon} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {g.label}
              <span className="text-sm font-normal text-slate-500">({g.itens.length})</span>
            </h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.itens.map((m: any) => {
                const ehArquivo = !!m.file_name;
                return (
                  <li key={m.id} className="flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] transition-colors hover:border-brand-green/30">
                    {m.cover_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.cover_url} alt="" aria-hidden="true" className="aspect-[16/9] w-full object-cover" />
                    )}
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-center gap-2">
                        {ehArquivo && extensao(m.file_name) && (
                          <span className="rounded-md border border-brand-blue/25 bg-brand-blue/10 px-2 py-0.5 text-[0.65rem] font-semibold text-brand-teal">{extensao(m.file_name)}</span>
                        )}
                        {ehArquivo && m.file_size > 0 && <span className="text-xs text-slate-500">{tamanhoLegivel(m.file_size)}</span>}
                        {!ehArquivo && <span className="text-xs text-slate-500">link externo</span>}
                      </div>
                      <h3 className="mt-2 font-display text-base font-bold text-white">{m.title}</h3>
                      {m.description && <p className="mt-1 flex-1 whitespace-pre-line text-sm text-slate-400">{m.description}</p>}
                      <a
                        href={`/conta/materiais/baixar/${m.id}`}
                        {...(ehArquivo ? {} : { target: "_blank", rel: "noreferrer" })}
                        className="mt-4 inline-flex w-fit items-center gap-2 rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={ehArquivo ? "M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" : "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        {ehArquivo ? "Baixar" : "Abrir link"}
                        <span className="sr-only"> {m.title}</span>
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
