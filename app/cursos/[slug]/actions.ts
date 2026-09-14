"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccessCourse, hasFullAccess } from "@/lib/access";
import { VALOR_MINIMO_CURSO } from "@/lib/precoCurso";

const ASAAS_BASE = process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";

function volta(slug: string, msg: string): never {
  redirect(`/cursos/${slug}?erro=${encodeURIComponent(msg)}`);
}

async function usuarioECurso(slug: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  const { data: course } = await admin
    .from("courses")
    .select("id, slug, title, price, subscriber_price, published, coming_soon")
    .eq("slug", slug)
    .maybeSingle();

  // Bloquear só no botão não basta: um POST montado à mão chegaria aqui.
  if (!course || !course.published) redirect("/cursos");
  if (course.coming_soon) redirect(`/cursos/${slug}`);
  // Só assinante compra ou libera treinamento.
  if (!(await hasFullAccess(admin, user.id))) redirect("/matricula");
  if (await canAccessCourse(admin, user.id, course.id)) redirect(`/aprender/${slug}`);

  return { user, admin, course };
}

/* Curso incluso na assinatura (preço de assinante 0). A matrícula nasce com
   origem "assinante" e continua valendo mesmo se a assinatura acabar. */
export async function enrollFree(formData: FormData) {
  const slug = formData.get("slug") as string;
  const { user, admin, course } = await usuarioECurso(slug);
  if (course.subscriber_price == null || Number(course.subscriber_price) !== 0) redirect(`/cursos/${slug}`);

  await admin
    .from("enrollments")
    .upsert({ user_id: user.id, course_id: course.id, source: "assinante" }, { onConflict: "user_id,course_id" });

  redirect(`/aprender/${slug}`);
}

/* Compra do treinamento pelo assinante. Cobrança única no Asaas, Pix ou cartão.
   A matrícula só nasce no webhook, quando o pagamento confirma. */
export async function comprarCurso(formData: FormData) {
  const slug = formData.get("slug") as string;
  const forma = formData.get("forma") === "cartao" ? "cartao" : "pix";
  const cpf = ((formData.get("cpf") as string) || "").replace(/\D/g, "");
  const { user, admin, course } = await usuarioECurso(slug);

  const preco = course.subscriber_price == null ? NaN : Number(course.subscriber_price);
  if (!(preco >= VALOR_MINIMO_CURSO)) volta(slug, "Este treinamento ainda não está à venda.");
  if (!process.env.ASAAS_API_KEY) volta(slug, "O pagamento está indisponível agora. Tente de novo em instantes.");
  if (cpf.length !== 11) volta(slug, "Informe um CPF válido, com 11 dígitos.");

  const { data: profile } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const email = (user.email || "").toLowerCase();
  const name = profile?.full_name || email;

  const { data: order, error } = await admin
    .from("orders")
    .insert({
      user_id: user.id,
      email,
      name,
      product: "curso",
      course_id: course.id,
      amount: preco,
      original_amount: Number(course.price) > 0 ? Number(course.price) : null,
      status: "pending",
      gateway: "asaas",
    })
    .select("id")
    .single();
  if (error || !order) volta(slug, "Não foi possível registrar o pedido. Tente de novo.");

  let url: string | null = null;
  try {
    const headers = { access_token: process.env.ASAAS_API_KEY!, "Content-Type": "application/json" };
    const custRes = await fetch(`${ASAAS_BASE}/customers`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name, email, cpfCnpj: cpf, externalReference: email }),
    });
    const cust = await custRes.json();
    if (custRes.ok && cust?.id) {
      const due = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
      const payRes = await fetch(`${ASAAS_BASE}/payments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          customer: cust.id,
          billingType: forma === "cartao" ? "CREDIT_CARD" : "PIX",
          value: preco,
          dueDate: due,
          description: `DriveData Academy · treinamento: ${course.title}`,
          externalReference: `curso:${order!.id}`,
        }),
      });
      const pay = await payRes.json();
      if (payRes.ok && pay?.id) {
        await admin.from("orders").update({ gateway_id: pay.id, external_reference: `curso:${order!.id}` }).eq("id", order!.id);
        url = (pay.invoiceUrl as string) || null;
      }
    }
  } catch {
    url = null;
  }

  if (!url) volta(slug, "Não conseguimos gerar a cobrança. Confira o CPF e tente de novo.");
  redirect(url!);
}
