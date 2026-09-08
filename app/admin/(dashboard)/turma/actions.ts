"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Só estas chaves pertencem a esta tela.
// pix_discount_pct (banner da home), full_access_price e turma_data são de outras
// telas: gravar a lista inteira aqui zerava a configuração delas a cada save.
const OWNED_KEYS = ["turma_nome", "sub_price", "turma_descricao", "sales_open", "checkout_whatsapp"] as const;

// Aceita "129,90", "129.90", "1.234,56" e "R$ 1.234,56".
function parseBRL(raw: string): number | null {
  const s = (raw || "").replace(/[^\d.,]/g, "");
  if (!s) return null;
  let norm = s;
  if (s.includes(",")) {
    norm = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(".")) {
    const parts = s.split(".");
    const last = parts[parts.length - 1];
    // "129.90" é decimal; "1.234" é separador de milhar.
    norm = last.length === 2 ? parts.slice(0, -1).join("") + "." + last : parts.join("");
  }
  const n = Number(norm);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function fail(msg: string): never {
  redirect("/admin/turma?error=" + encodeURIComponent(msg));
}

export async function saveTurma(formData: FormData) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  const nome = ((formData.get("turma_nome") as string) || "").trim();
  const descricao = ((formData.get("turma_descricao") as string) || "").trim();
  const salesOpen = formData.get("sales_open") === "on";
  const whatsapp = ((formData.get("checkout_whatsapp") as string) || "").replace(/\D/g, "");
  const rawPrice = (formData.get("sub_price") as string) || "";
  const price = parseBRL(rawPrice);

  if (rawPrice.trim() && price === null) fail("Valor mensal inválido. Use algo como 129,90.");
  if (price !== null && price < 0) fail("O valor mensal não pode ser negativo.");
  // Venda aberta com preço zerado quebra o checkout: o Asaas recusa e o aluno vê
  // "a assinatura ainda não foi configurada".
  if (salesOpen && !price) fail("Defina o valor mensal antes de abrir as vendas.");
  if (whatsapp && (whatsapp.length < 10 || whatsapp.length > 13)) {
    fail("WhatsApp inválido. Use DDD + número, ex.: 5535999999999.");
  }
  if (descricao.length > 400) fail("A descrição curta passou de 400 caracteres.");

  const values: Record<(typeof OWNED_KEYS)[number], string> = {
    turma_nome: nome,
    sub_price: price === null ? "" : String(price),
    turma_descricao: descricao,
    sales_open: salesOpen ? "1" : "0",
    checkout_whatsapp: whatsapp,
  };

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const rows = OWNED_KEYS.map((key) => ({ key, value: values[key], updated_at: now }));
  const { error } = await admin.from("site_settings").upsert(rows, { onConflict: "key" });
  if (error) fail(error.message);

  revalidatePath("/admin/turma");
  revalidatePath("/matricula");
  redirect("/admin/turma?ok=1");
}
