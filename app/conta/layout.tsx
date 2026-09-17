import { redirect } from "next/navigation";
import Background from "@/components/Background";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AssistantButton from "@/components/AssistantButton";
import ContaShell from "./ContaShell";

export default async function ContaLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  /* Quantos treinamentos estão abertos para compra hoje. O número vira o selo
     verde ao lado de "Cursos" no menu, para o aluno não precisar entrar na
     página para descobrir que abriu algo. Falhou a leitura, o selo some. */
  let cursosAVenda = 0;
  try {
    const admin = createAdminClient();
    const [{ data: abertos }, { data: matriculas }] = await Promise.all([
      admin.from("courses").select("id").eq("published", true).eq("access_mode", "catalogo").eq("coming_soon", false).not("subscriber_price", "is", null),
      admin.from("enrollments").select("course_id").eq("user_id", user.id).neq("source", "free"),
    ]);
    const meus = new Set((matriculas ?? []).map((m: any) => m.course_id));
    cursosAVenda = (abertos ?? []).filter((c: any) => !meus.has(c.id)).length;
  } catch {
    cursosAVenda = 0;
  }

  return (
    <>
      <Background />
      <ContaShell email={user.email || ""} cursosAVenda={cursosAVenda}>{children}</ContaShell>
      <AssistantButton />
    </>
  );
}
