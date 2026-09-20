import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity } from "@/lib/community";
import { demoAtual } from "@/lib/demo";
import { idiomaValido } from "@/lib/i18n/idioma";
import { BUCKET_EBOOKS, edicaoPara, type ArquivoDoEbook } from "@/lib/ebooks";

export const dynamic = "force-dynamic";

/* Entrega de um ebook.

   O bucket é privado e o endereço do arquivo nunca chega ao navegador: cada
   clique passa por aqui, confere a sessão e a assinatura na hora, e só então
   devolve um link assinado que vale um minuto. Link copiado e colado num
   grupo de WhatsApp morre sozinho.

   Quem está na demonstração não baixa: ela mostra a plataforma, não entrega
   o acervo. */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const base = new URL(req.url).origin;
  const voltar = NextResponse.redirect(`${base}/conta/ebooks`);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${base}/entrar`);
  if (await demoAtual(user.id)) return NextResponse.redirect(`${base}/conta/cursos?demo=1`);

  const admin = createAdminClient();
  if (!(await canUseCommunity(admin, user.id, user.email))) return NextResponse.redirect(`${base}/matricula`);

  const { data: ebook } = await admin
    .from("ebooks")
    .select("id, slug, published")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!ebook || !ebook.published) return voltar;

  const { data: arquivos } = await admin
    .from("ebook_files")
    .select("ebook_id, idioma, file_path, file_name, file_size")
    .eq("ebook_id", ebook.id);

  const pedido = idiomaValido(new URL(req.url).searchParams.get("lang"));
  const edicao = edicaoPara((arquivos ?? []) as ArquivoDoEbook[], pedido);
  if (!edicao) return voltar;

  const { data: assinado } = await admin.storage
    .from(BUCKET_EBOOKS)
    .createSignedUrl(edicao.file_path, 60, { download: edicao.file_name || `${ebook.slug}-${edicao.idioma}.pdf` });
  if (!assinado?.signedUrl) return voltar;

  return NextResponse.redirect(assinado.signedUrl);
}
