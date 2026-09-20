import { tr } from "@/lib/i18n/traduzir-servidor";
import { redirect } from "next/navigation";
import { listaTraduzida } from "@/lib/i18n/conteudo";
import { createAdminClient } from "@/lib/supabase/admin";
import { usuarioAtual } from "@/lib/sessao";
import { canUseCommunity } from "@/lib/community";
import { idiomaAtual } from "@/lib/i18n/idioma-servidor";
import { NOME_DO_IDIOMA } from "@/lib/i18n/idioma";
import Bandeira from "@/components/i18n/Bandeira";
import { edicaoPara, edicoes, tamanhoLegivel, type ArquivoDoEbook, type Ebook } from "@/lib/ebooks";

export const dynamic = "force-dynamic";

/* Biblioteca de ebooks.

   Cada ebook aparece uma vez, com as edições que existem. O botão grande é a
   edição no idioma de quem está lendo; as outras ficam ao lado, discretas,
   porque quem quer a versão em inglês sabe o que está procurando.

   O arquivo nunca aparece na tela: o botão aponta para a rota de download,
   que confere a assinatura e devolve um link assinado de vida curta. */

export default async function EbooksPage() {
  const user = await usuarioAtual();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  if (!(await canUseCommunity(admin, user.id, user.email))) redirect("/matricula");

  const idioma = idiomaAtual();
  const [{ data: livros }, { data: arquivos }] = await Promise.all([
    admin.from("ebooks").select("*").eq("published", true).order("position").order("created_at", { ascending: false }),
    admin.from("ebook_files").select("ebook_id, idioma, file_path, file_name, file_size"),
  ]);

  const porEbook = new Map<string, ArquivoDoEbook[]>();
  for (const a of (arquivos ?? []) as ArquivoDoEbook[]) {
    porEbook.set(a.ebook_id, [...(porEbook.get(a.ebook_id) ?? []), a]);
  }

  /* Título, subtítulo e descrição são texto que o time escreve, então a
     tradução vem do banco, e não do dicionário do código. */
  const traduzidos = await listaTraduzida("ebooks", (livros ?? []) as any[]);
  const lista = (traduzidos as Ebook[]).filter((e) => (porEbook.get(e.id) ?? []).length > 0);

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-brand-green">{tr("Biblioteca")}</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-white">{tr("Ebooks")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        {tr("Material de leitura para levar junto: o método por escrito, para consultar no meio do projeto. Incluído na assinatura.")}
      </p>

      {lista.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-white/8 bg-white/[0.02] p-10 text-center">
          <p className="text-sm text-slate-400">{tr("Assim que o time publicar o primeiro ebook, ele aparece aqui.")}</p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 lg:grid-cols-2">
          {lista.map((e) => {
            const arquivos = porEbook.get(e.id) ?? [];
            const principal = edicaoPara(arquivos, idioma);
            const outras = edicoes(arquivos).filter((a) => a.idioma !== principal?.idioma);
            return (
              <li
                key={e.id}
                className="flex flex-col gap-4 rounded-3xl border border-white/8 bg-white/[0.02] p-5 transition-colors hover:border-brand-green/30 sm:flex-row"
              >
                <Capa ebook={e} />

                <div className="flex min-w-0 flex-1 flex-col">
                  <h2 className="font-display text-lg font-bold leading-tight text-white">{e.title}</h2>
                  {e.subtitle && <p className="mt-1 text-sm text-slate-400">{e.subtitle}</p>}
                  {e.description && <p className="mt-3 text-sm leading-relaxed text-slate-400">{e.description}</p>}

                  <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    {e.autor && <span>{e.autor}</span>}
                    {e.paginas ? <span>{e.paginas} {tr("páginas")}</span> : null}
                    {principal?.file_size ? <span>PDF · {tamanhoLegivel(principal.file_size)}</span> : null}
                  </p>

                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                    {principal && (
                      <a
                        href={`/conta/ebooks/${e.slug}/baixar?lang=${principal.idioma}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-4 py-2.5 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]"
                      >
                        <Bandeira idioma={principal.idioma} tamanho={18} />
                        {tr("Baixar o PDF")}
                      </a>
                    )}
                    {outras.map((a) => (
                      <a
                        key={a.idioma}
                        href={`/conta/ebooks/${e.slug}/baixar?lang=${a.idioma}`}
                        title={`${tr("Baixar em")} ${NOME_DO_IDIOMA[a.idioma]}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs text-slate-300 transition-colors hover:border-brand-green/50 hover:text-white"
                      >
                        <Bandeira idioma={a.idioma} tamanho={16} />
                        {NOME_DO_IDIOMA[a.idioma]}
                      </a>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* Sem capa cadastrada, o cartão desenha uma. Um retângulo cinza escrito "sem
   imagem" faria a biblioteca inteira parecer quebrada enquanto o time não
   sobe as artes. */
function Capa({ ebook }: { ebook: Ebook }) {
  if (ebook.cover_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={ebook.cover_url} alt="" className="h-44 w-32 shrink-0 rounded-xl border border-white/10 object-cover" />;
  }
  return (
    <div className="flex h-44 w-32 shrink-0 flex-col justify-between rounded-xl border border-brand-green/25 bg-gradient-to-br from-brand-green/15 via-ink-800 to-ink-900 p-3">
      <span className="text-[0.55rem] font-semibold uppercase tracking-[.18em] text-brand-green">Ebook</span>
      <span className="font-display text-[0.8rem] font-bold leading-tight text-white line-clamp-5">{ebook.title}</span>
    </div>
  );
}
