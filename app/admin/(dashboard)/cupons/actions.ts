"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizarCodigo } from "@/lib/cupons";

async function admin() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return createAdminClient();
}

function voltar(msg: string, erro = false): never {
  redirect(`/admin/cupons?${erro ? "error" : "ok"}=${encodeURIComponent(msg)}`);
}

// Aceita "10", "10,5" e "R$ 50,00".
function numero(raw: FormDataEntryValue | null): number | null {
  const s = String(raw || "").replace(/[^\d,.]/g, "");
  if (!s) return null;
  const n = Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
  return Number.isFinite(n) ? n : null;
}

export async function salvarCupom(formData: FormData) {
  const supabase = await admin();
  const id = (formData.get("id") as string) || null;
  const code = normalizarCodigo(formData.get("code") as string);
  const discount_type = formData.get("discount_type") === "fixed" ? "fixed" : "percent";
  const discount_value = numero(formData.get("discount_value"));
  const applies_to = ["mensal", "anual"].includes(String(formData.get("applies_to"))) ? String(formData.get("applies_to")) : "ambos";
  const monthly_scope = formData.get("monthly_scope") === "todas" ? "todas" : "primeira";
  const restricted_email = String(formData.get("restricted_email") || "").trim().toLowerCase() || null;
  const max_uses = numero(formData.get("max_uses"));
  const validade = String(formData.get("expires_at") || "").trim();

  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) voltar("O código precisa ter de 3 a 30 caracteres, só letras, números, hífen ou sublinhado.", true);
  if (!discount_value || discount_value <= 0) voltar("Informe o valor do desconto.", true);
  if (discount_type === "percent" && discount_value! > 100) voltar("Desconto em porcentagem vai até 100%.", true);
  if (restricted_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(restricted_email)) voltar("E-mail restrito inválido.", true);

  const payload = {
    code,
    note: String(formData.get("note") || "").trim() || null,
    discount_type,
    discount_value,
    applies_to,
    monthly_scope,
    restricted_email,
    max_uses: max_uses && max_uses > 0 ? Math.floor(max_uses) : null,
    // A data vale até o fim do dia no horário de Brasília.
    expires_at: validade ? new Date(`${validade}T23:59:59-03:00`).toISOString() : null,
    active: formData.get("active") === "on",
  };

  const r = id ? await supabase.from("coupons").update(payload).eq("id", id) : await supabase.from("coupons").insert(payload);
  if (r.error) voltar(r.error.message.includes("duplicate") ? `Já existe um cupom com o código ${code}.` : r.error.message, true);

  revalidatePath("/admin/cupons");
  voltar(id ? `Cupom ${code} atualizado.` : `Cupom ${code} criado.`);
}

export async function excluirCupom(formData: FormData) {
  const supabase = await admin();
  const id = formData.get("id") as string;
  // Cupom já usado guarda histórico de venda. Nesse caso, desativar em vez de apagar.
  const { count } = await supabase.from("coupon_redemptions").select("*", { count: "exact", head: true }).eq("coupon_id", id);
  if ((count ?? 0) > 0) voltar("Este cupom já foi usado em pagamentos. Desmarque \"Ativo\" em vez de excluir, para manter o histórico.", true);
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) voltar(error.message, true);
  revalidatePath("/admin/cupons");
  voltar("Cupom excluído.");
}
