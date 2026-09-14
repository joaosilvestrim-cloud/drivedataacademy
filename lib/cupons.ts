import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/* Regra única dos cupons. O checkout usa esta função duas vezes: quando o
   aluno clica em Aplicar, para mostrar o preço novo, e de novo ao gerar a
   cobrança. O desconto nunca é calculado nem confiado no navegador. */

export type Plano = "mensal" | "anual";

// O Asaas não aceita cobrança abaixo de R$ 5. Nenhum cupom derruba o preço disso.
export const VALOR_MINIMO = 5;

const centavos = (v: number) => Math.round(v * 100) / 100;

export function normalizarCodigo(raw: string | null | undefined) {
  return String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
}

export type CupomAplicado = {
  ok: true;
  codigo: string;
  original: number;
  desconto: number;
  final: number;
  // Só no mensal: true quando o desconto vale em todas as mensalidades.
  recorrente: boolean;
  rotulo: string;
};

export async function aplicarCupom(
  admin: SupabaseClient,
  codigoRaw: string,
  plano: Plano,
  email: string,
  preco: number
): Promise<CupomAplicado | { ok: false; erro: string }> {
  const codigo = normalizarCodigo(codigoRaw);
  if (!codigo) return { ok: false, erro: "Digite o código do cupom." };

  const { data: c } = await admin.from("coupons").select("*").eq("code", codigo).maybeSingle();
  if (!c || !c.active) return { ok: false, erro: "Cupom inválido ou desativado." };
  if (c.expires_at && Date.parse(c.expires_at) < Date.now()) return { ok: false, erro: "Este cupom expirou." };
  if (c.applies_to !== "ambos" && c.applies_to !== plano) {
    return { ok: false, erro: `Este cupom vale só para o plano ${c.applies_to}.` };
  }

  const restrito = String(c.restricted_email || "").trim().toLowerCase();
  if (restrito) {
    const meu = String(email || "").trim().toLowerCase();
    if (!meu) return { ok: false, erro: "Preencha o seu e-mail antes de aplicar este cupom." };
    if (meu !== restrito) return { ok: false, erro: "Este cupom não está disponível para este e-mail." };
  }

  if (c.max_uses) {
    const { count } = await admin.from("coupon_redemptions").select("*", { count: "exact", head: true }).eq("coupon_id", c.id);
    if ((count ?? 0) >= c.max_uses) return { ok: false, erro: "Este cupom já atingiu o limite de usos." };
  }

  const bruto = c.discount_type === "fixed" ? Number(c.discount_value) : (preco * Number(c.discount_value)) / 100;
  const final = centavos(Math.max(VALOR_MINIMO, preco - bruto));
  const desconto = centavos(preco - final);
  if (desconto <= 0) return { ok: false, erro: "Este cupom não reduz o valor deste plano." };

  const rotulo =
    c.discount_type === "fixed"
      ? `${Number(c.discount_value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} de desconto`
      : `${Number(c.discount_value).toLocaleString("pt-BR")}% de desconto`;

  return {
    ok: true,
    codigo,
    original: centavos(preco),
    desconto,
    final,
    recorrente: plano === "mensal" && c.monthly_scope === "todas",
    rotulo,
  };
}
