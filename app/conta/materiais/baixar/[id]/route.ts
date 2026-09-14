import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCommunity } from "@/lib/community";
import { BUCKET_MATERIAIS } from "@/lib/materiais";

export const dynamic = "force-dynamic";

/* Entrega do material. Confere sessão e assinatura a cada clique, registra o
   download e redireciona para um link assinado que vale 60 segundos. Assim o
   endereço do arquivo nunca fica exposto nem pode ser repassado por fora. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const base = new URL(req.url).origin;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${base}/entrar`);

  const admin = createAdminClient();
  if (!(await canUseCommunity(admin, user.id, user.email))) return NextResponse.redirect(`${base}/matricula`);

  const { data: m } = await admin
    .from("ready_materials")
    .select("id, file_path, file_name, external_url, published")
    .eq("id", params.id)
    .maybeSingle();
  if (!m || !m.published) return NextResponse.redirect(`${base}/conta/materiais`);

  await admin.from("ready_material_downloads").insert({ material_id: m.id, user_id: user.id });

  if (m.file_path) {
    const { data, error } = await admin.storage
      .from(BUCKET_MATERIAIS)
      .createSignedUrl(m.file_path, 60, { download: m.file_name || true });
    if (error || !data?.signedUrl) return NextResponse.redirect(`${base}/conta/materiais`);
    return NextResponse.redirect(data.signedUrl);
  }
  if (m.external_url) return NextResponse.redirect(m.external_url);
  return NextResponse.redirect(`${base}/conta/materiais`);
}
