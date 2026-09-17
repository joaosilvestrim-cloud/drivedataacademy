import { createAdminClient } from "@/lib/supabase/admin";
import CupomContagem from "@/components/CupomContagem";

/* Cupom de lançamento na home.

   O código, o desconto e o prazo saem da própria tabela de cupons, nunca de
   texto fixo aqui: se alguém desativar o cupom ou mudar a data no admin, a
   faixa acompanha e a home não promete o que o checkout vai recusar. */

const CODIGO = "FUNDADOR10";
const FUSO = "America/Sao_Paulo";

const prazoLegivel = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: FUSO })
    .format(new Date(iso))
    .replace(", ", " às ");

export default async function CupomDestaque() {
  let cupom: any = null;
  try {
    const { data } = await createAdminClient()
      .from("coupons")
      .select("code, discount_type, discount_value, expires_at, active")
      .eq("code", CODIGO)
      .maybeSingle();
    cupom = data;
  } catch {
    return null;
  }

  if (!cupom?.active || !cupom.expires_at) return null;
  const expira = Date.parse(cupom.expires_at);
  if (!Number.isFinite(expira) || expira <= Date.now()) return null;

  const desconto =
    cupom.discount_type === "fixed"
      ? `${Number(cupom.discount_value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} off`
      : `${Number(cupom.discount_value).toLocaleString("pt-BR")}% off`;

  return (
    <CupomContagem
      codigo={cupom.code}
      desconto={desconto}
      prazo={prazoLegivel(cupom.expires_at)}
      expiraEm={cupom.expires_at}
      agoraInicial={Date.now()}
    />
  );
}
