import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccessCourse } from "@/lib/access";
import { liberacaoDeMateriais } from "@/lib/carencia";
import { BUCKET_MATERIAIS } from "@/lib/materiais";
import { demoAtual } from "@/lib/demo";

export const dynamic = "force-dynamic";

/* Entrega de um arquivo anexado a uma aula, de qualquer tipo. Confere sessão e acesso ao curso
   da aula a cada clique, registra o download e redireciona para um link
   assinado que vale 60 segundos. O endereço do arquivo nunca fica exposto. */
export async function GET(req: Request, { params }: { params: { slug: string; id: string } }) {
  const base = new URL(req.url).origin;
  const voltar = NextResponse.redirect(`${base}/aprender/${params.slug}`);
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${base}/entrar`);
  if(await demoAtual(user.id)) return NextResponse.redirect(`${base}/conta/cursos?demo=1`);

  const admin = createAdminClient();
  const { data: m } = await admin
    .from("ready_materials")
    .select("id, lesson_id, file_path, file_name, external_url, published")
    .eq("id", params.id)
    .maybeSingle();
  if (!m || !m.published || !m.lesson_id) return voltar;

  const { data: aula } = await admin.from("lessons").select("course_id,module_id").eq("id", m.lesson_id).maybeSingle();
  if (!aula || !(await canAccessCourse(admin, user.id, aula.course_id))) return NextResponse.redirect(`${base}/matricula`);
  const { data: modulo } = await admin.from("course_modules").select("available_at").eq("id",aula.module_id).eq("course_id",aula.course_id).maybeSingle();
  if(!modulo || (modulo.available_at && (!Number.isFinite(Date.parse(modulo.available_at)) || Date.parse(modulo.available_at)>Date.now()))) return voltar;

  // Sete dias de assinatura antes do primeiro download. Quem tenta pelo
  // endereço direto volta para a biblioteca, que explica o prazo.
  const { liberado } = await liberacaoDeMateriais(admin, user.id, aula.course_id, user.email);
  if (!liberado) return voltar;

  await admin.from("ready_material_downloads").insert({ material_id: m.id, user_id: user.id });

  if (m.file_path) {
    const { data, error } = await admin.storage
      .from(BUCKET_MATERIAIS)
      .createSignedUrl(m.file_path, 60, { download: m.file_name || true });
    if (error || !data?.signedUrl) return voltar;
    return NextResponse.redirect(data.signedUrl);
  }
  if (m.external_url) return NextResponse.redirect(m.external_url);
  return voltar;
}
